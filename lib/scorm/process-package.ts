import "server-only";

import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";

type ProcessScormPackageOptions = {
  gameId: string;
  packageId: string;
};

type ProcessScormPackageResult = {
  success: boolean;
  scormVersion?: string;
  manifestPath?: string;
  launchFile?: string;
  extractionPath?: string;
  error?: string;
};

function normalizeZipPath(
  value: string
) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");
}

function decodeXmlValue(
  value: string
) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getDirectory(
  path: string
) {
  const normalized =
    normalizeZipPath(path);

  const lastSlash =
    normalized.lastIndexOf("/");

  if (lastSlash === -1) {
    return "";
  }

  return normalized.slice(
    0,
    lastSlash + 1
  );
}

function resolveRelativePath(
  baseDirectory: string,
  relativePath: string
) {
  const combined =
    normalizeZipPath(
      `${baseDirectory}${relativePath}`
    );

  const parts =
    combined.split("/");

  const resolved: string[] = [];

  for (const part of parts) {
    if (
      !part ||
      part === "."
    ) {
      continue;
    }

    if (part === "..") {
      resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  return resolved.join("/");
}

function findManifestPath(
  zip: JSZip
) {
  const files =
    Object.keys(zip.files);

  const exactRoot =
    files.find(
      (path) =>
        normalizeZipPath(path)
          .toLowerCase() ===
        "imsmanifest.xml"
    );

  if (exactRoot) {
    return normalizeZipPath(
      exactRoot
    );
  }

  const manifests =
    files.filter((path) => {
      const normalized =
        normalizeZipPath(path)
          .toLowerCase();

      return normalized.endsWith(
        "/imsmanifest.xml"
      );
    });

  if (
    manifests.length === 1
  ) {
    return normalizeZipPath(
      manifests[0]
    );
  }

  if (
    manifests.length > 1
  ) {
    throw new Error(
      "Multiple imsmanifest.xml files were found in the package."
    );
  }

  throw new Error(
    "imsmanifest.xml was not found in the SCORM package."
  );
}

function detectScormVersion(
  manifestXml: string
) {
  const lower =
    manifestXml.toLowerCase();

  if (
    lower.includes(
      "adlcp_rootv1p2"
    ) ||
    lower.includes(
      "imscp_rootv1p1p2"
    ) ||
    lower.includes(
      "1.2"
    )
  ) {
    return "1.2";
  }

  if (
    lower.includes(
      "adlcp_v1p3"
    ) ||
    lower.includes(
      "imsss_v1p0"
    ) ||
    lower.includes(
      "2004"
    )
  ) {
    return "2004";
  }

  /*
   * Some valid manifests do not
   * include a clean human-readable
   * version string. If the manifest
   * contains SCORM metadata but we
   * cannot identify the edition,
   * preserve it as unknown instead
   * of inventing a version.
   */
  if (
    lower.includes("adlcp")
  ) {
    return "SCORM";
  }

  throw new Error(
    "The manifest does not appear to describe a supported SCORM package."
  );
}

function getLaunchHref(
  manifestXml: string
) {
  /*
   * First determine the resource
   * referenced by the default
   * organization item.
   */
  const organizationMatch =
    manifestXml.match(
      /<organizations\b[^>]*\bdefault\s*=\s*["']([^"']+)["'][^>]*>/i
    );

  const defaultOrganizationId =
    organizationMatch?.[1];

  let organizationXml =
    manifestXml;

  if (defaultOrganizationId) {
    const escapedId =
      escapeRegExp(
        defaultOrganizationId
      );

    const specificOrganization =
      manifestXml.match(
        new RegExp(
          `<organization\\b[^>]*\\bidentifier\\s*=\\s*["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/organization>`,
          "i"
        )
      );

    if (
      specificOrganization?.[0]
    ) {
      organizationXml =
        specificOrganization[0];
    }
  }

  const itemMatch =
    organizationXml.match(
      /<item\b[^>]*\bidentifierref\s*=\s*["']([^"']+)["'][^>]*>/i
    );

  const resourceId =
    itemMatch?.[1];

  if (resourceId) {
    const escapedResourceId =
      escapeRegExp(resourceId);

    const resourceMatch =
      manifestXml.match(
        new RegExp(
          `<resource\\b[^>]*\\bidentifier\\s*=\\s*["']${escapedResourceId}["'][^>]*\\bhref\\s*=\\s*["']([^"']+)["'][^>]*>`,
          "i"
        )
      );

    if (
      resourceMatch?.[1]
    ) {
      return decodeXmlValue(
        resourceMatch[1]
      );
    }

    /*
     * href may appear before the
     * identifier attribute.
     */
    const reverseResourceMatch =
      manifestXml.match(
        new RegExp(
          `<resource\\b[^>]*\\bhref\\s*=\\s*["']([^"']+)["'][^>]*\\bidentifier\\s*=\\s*["']${escapedResourceId}["'][^>]*>`,
          "i"
        )
      );

    if (
      reverseResourceMatch?.[1]
    ) {
      return decodeXmlValue(
        reverseResourceMatch[1]
      );
    }
  }

  /*
   * Fallback for simple SCORM
   * manifests: use the first
   * resource that has an href.
   */
  const resourceMatches =
    manifestXml.matchAll(
      /<resource\b([^>]*)>/gi
    );

  for (
    const match
    of resourceMatches
  ) {
    const attributes =
      match[1];

    const hrefMatch =
      attributes.match(
        /\bhref\s*=\s*["']([^"']+)["']/i
      );

    if (hrefMatch?.[1]) {
      return decodeXmlValue(
        hrefMatch[1]
      );
    }
  }

  throw new Error(
    "No launch file was defined in imsmanifest.xml."
  );
}

function escapeRegExp(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function findZipFile(
  zip: JSZip,
  requestedPath: string
) {
  const normalizedRequested =
    normalizeZipPath(
      requestedPath
    );

  const exact =
    zip.file(
      normalizedRequested
    );

  if (exact) {
    return {
      path:
        normalizedRequested,
      file: exact,
    };
  }

  /*
   * ZIP paths are technically
   * case-sensitive, but packages
   * created on Windows sometimes
   * contain case mismatches.
   * We can safely resolve a unique
   * case-insensitive match.
   */
  const matches =
    Object.keys(zip.files)
      .filter(
        (path) =>
          !zip.files[path].dir
      )
      .filter(
        (path) =>
          normalizeZipPath(path)
            .toLowerCase() ===
          normalizedRequested
            .toLowerCase()
      );

  if (
    matches.length === 1
  ) {
    const path =
      normalizeZipPath(
        matches[0]
      );

    return {
      path,
      file:
        zip.files[matches[0]],
    };
  }

  return null;
}

function contentTypeForPath(
  path: string
) {
  const extension =
    path
      .split(".")
      .pop()
      ?.toLowerCase();

  const types:
    Record<
      string,
      string
    > = {
      html:
        "text/html; charset=utf-8",
      htm:
        "text/html; charset=utf-8",
      js:
        "text/javascript; charset=utf-8",
      css:
        "text/css; charset=utf-8",
      xml:
        "application/xml",
      json:
        "application/json",
      txt:
        "text/plain; charset=utf-8",
      svg:
        "image/svg+xml",
      png:
        "image/png",
      jpg:
        "image/jpeg",
      jpeg:
        "image/jpeg",
      gif:
        "image/gif",
      webp:
        "image/webp",
      ico:
        "image/x-icon",
      mp3:
        "audio/mpeg",
      wav:
        "audio/wav",
      ogg:
        "audio/ogg",
      mp4:
        "video/mp4",
      webm:
        "video/webm",
      pdf:
        "application/pdf",
      woff:
        "font/woff",
      woff2:
        "font/woff2",
      ttf:
        "font/ttf",
      otf:
        "font/otf",
    };

  return extension
    ? types[extension] ||
        "application/octet-stream"
    : "application/octet-stream";
}

export async function processScormPackage({
  gameId,
  packageId,
}: ProcessScormPackageOptions): Promise<ProcessScormPackageResult> {
  const admin =
    createAdminClient();

  const {
    data: packageRecord,
    error: packageError,
  } = await admin
    .from("scorm_packages")
    .select(
      `
        id,
        game_id,
        storage_path
      `
    )
    .eq("id", packageId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (
    packageError ||
    !packageRecord
  ) {
    return {
      success: false,
      error:
        packageError?.message ||
        "SCORM package record was not found.",
    };
  }

  await admin
    .from("scorm_packages")
    .update({
      processing_status:
        "processing",
      processing_error: null,
    })
    .eq("id", packageId);

  try {
    const {
      data: sourceZip,
      error: downloadError,
    } =
      await admin.storage
        .from(
          "scorm-packages"
        )
        .download(
          packageRecord.storage_path
        );

    if (
      downloadError ||
      !sourceZip
    ) {
      throw new Error(
        downloadError?.message ||
          "Unable to read the uploaded ZIP package."
      );
    }

    const zipBuffer =
      await sourceZip.arrayBuffer();

    const zip =
      await JSZip.loadAsync(
        zipBuffer
      );

    const manifestPath =
      findManifestPath(zip);

    const manifestFile =
      findZipFile(
        zip,
        manifestPath
      );

    if (!manifestFile) {
      throw new Error(
        "imsmanifest.xml could not be read from the package."
      );
    }

    const manifestXml =
      await manifestFile.file.async(
        "string"
      );

    const scormVersion =
      detectScormVersion(
        manifestXml
      );

    const launchHref =
      getLaunchHref(
        manifestXml
      );

    const manifestDirectory =
      getDirectory(
        manifestPath
      );

    const requestedLaunchPath =
      resolveRelativePath(
        manifestDirectory,
        launchHref
      );

    const launchEntry =
      findZipFile(
        zip,
        requestedLaunchPath
      );

    if (!launchEntry) {
      throw new Error(
        `The manifest launch file "${requestedLaunchPath}" was not found in the ZIP package.`
      );
    }

    /*
     * Extract all package files to:
     *
     * {gameId}/extracted/...
     */
	const extractionPath =
  		`${gameId}/packages/${packageId}/extracted`;

    const uploadEntries =
      Object.entries(
        zip.files
      ).filter(
        ([, entry]) =>
          !entry.dir
      );

    if (
      uploadEntries.length === 0
    ) {
      throw new Error(
        "The SCORM ZIP package does not contain any files."
      );
    }

    for (
      const [
        originalPath,
        entry,
      ] of uploadEntries
    ) {
      const normalizedPath =
        normalizeZipPath(
          originalPath
        );

      /*
       * Reject unsafe ZIP paths.
       */
      if (
        !normalizedPath ||
        normalizedPath
          .split("/")
          .includes("..")
      ) {
        throw new Error(
          "The ZIP package contains an unsafe file path."
        );
      }

      const fileData =
        await entry.async(
          "uint8array"
        );

      const destination =
        `${extractionPath}/${normalizedPath}`;

      const {
        error: uploadError,
      } =
        await admin.storage
          .from(
            "scorm-packages"
          )
          .upload(
            destination,
            fileData,
            {
              contentType:
                contentTypeForPath(
                  normalizedPath
                ),
              upsert: true,
            }
          );

      if (uploadError) {
        throw new Error(
          `Unable to extract "${normalizedPath}": ${uploadError.message}`
        );
      }
    }

    const resolvedLaunchFile =
      launchEntry.path;

    await admin
      .from("scorm_packages")
      .update({
        scorm_version:
          scormVersion,
        manifest_path:
          manifestPath,
        launch_file:
          resolvedLaunchFile,
        extraction_path:
          extractionPath,
        processing_status:
          "ready",
        processing_error: null,
      })
      .eq("id", packageId);

    await admin
      .from("games")
      .update({
        scorm_version:
          scormVersion,
        launch_file:
          resolvedLaunchFile,
        package_path:
          extractionPath,
      })
      .eq("id", gameId);

    return {
      success: true,
      scormVersion,
      manifestPath,
      launchFile:
        resolvedLaunchFile,
      extractionPath,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "SCORM package processing failed.";

    await admin
      .from("scorm_packages")
      .update({
        processing_status:
          "failed",
        processing_error:
          message,
      })
      .eq("id", packageId);

    return {
      success: false,
      error: message,
    };
  }
}