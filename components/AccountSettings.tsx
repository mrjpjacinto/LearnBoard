"use client";
import ActionIcon from "@/components/ActionIcon";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, inputClass, buttonClass } from "./LmsUi";
import { submitJson, useToast } from "./LmsToast";

type Personal = { phone?: string; job_title?: string; avatar?: string; bio?: string };
export default function AccountSettings({ name, email, role, personal = {}, profileEmail }: {
  name: string; email: string; role: string; personal?: Personal; profileEmail?: string | null;
}) {
  const [fullName, setFullName] = useState(name), [newEmail, setNewEmail] = useState("");
  const [phone, setPhone] = useState(personal.phone || ""), [jobTitle, setJobTitle] = useState(personal.job_title || ""), [bio, setBio] = useState(personal.bio || "");
  const [emailPassword, setEmailPassword] = useState(""), [current, setCurrent] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(personal.avatar || "");
  const router = useRouter(); const { notification, setToast } = useToast();
  // Once Auth confirms an email change, sync only that verified email to the profile.
  useEffect(() => {
    if (profileEmail === undefined || profileEmail === email) return;
    const controller = new AbortController();
    fetch("/api/account/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_email" }), signal: controller.signal })
      .then(async response => { if (!response.ok) { const result = await response.json(); throw new Error(result.error || "Unable to sync your confirmed email."); } if (!controller.signal.aborted) router.refresh(); })
      .catch(error => { if (!controller.signal.aborted) setToast({ type: "error", message: error.message }); });
    return () => controller.abort();
  }, [email, profileEmail, router, setToast]);
  async function save(e: FormEvent, action: string) {
    e.preventDefault();
    if (busy) return;
    if (action === "password" && password !== confirm) { setToast({ type: "error", message: "The new passwords do not match." }); return; }
    setBusy(true);
    try {
      const body = action === "profile" ? { action, full_name: fullName, phone, job_title: jobTitle, bio, avatar } : action === "email" ? { action, email: newEmail, current_password: emailPassword } : { action, current_password: current, new_password: password };
      const result = await submitJson("/api/account/settings", "PATCH", body);
      if (action === "password") { setCurrent(""); setPassword(""); setConfirm(""); }
      if (action === "email") { setEmailPassword(""); setNewEmail(""); }
      setToast({ type: "success", message: result.message || "Account updated." }); router.refresh();
    } catch (e) { setToast({ type: "error", message: (e as Error).message }); }
    finally { setBusy(false); }
  }
  return <>{notification}<div className="grid items-start gap-layout lg:grid-cols-2">
    <Card><h2 className="mb-layout text-lg font-bold text-[#172033]">My Profile</h2><form className="stack-layout" onSubmit={e => save(e, "profile")}>
      <Field label="Profile image (optional)">{avatar && <div className="group relative mb-3 w-fit">
        <img src={avatar} alt="Profile preview" className="h-20 w-20 rounded-full object-cover" />
        <button type="button" disabled={busy} aria-label="Remove profile image" title="Remove profile image"
          onClick={() => { setAvatar(""); if (imageInput.current) imageInput.current.value = ""; }}
          className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-[#D8DEEA] bg-[#EEF0FF] text-[#4F46E5] shadow-sm transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[#6366F1] disabled:opacity-50 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 !border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100 focus-visible:!outline-red-500 focus:!ring-red-200">
          <ActionIcon name="close" />
        </button>
      </div>}<input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="block max-w-full text-sm text-[#667085] file:mr-3 file:cursor-pointer file:rounded-xl file:border file:border-solid file:border-[#D8DEEA] file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-[#344054] hover:file:bg-[#F4F7FB] disabled:opacity-50" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5*1024*1024) { setToast({type:"error",message:"Choose a JPG, PNG, or WebP image under 5 MB."}); return; }
        const url = URL.createObjectURL(file);
        try {
          const image = new Image(); image.src = url; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 160;
          const context = canvas.getContext("2d"); if (!context) throw new Error("Unable to prepare your image.");
          const side = Math.min(image.width,image.height); context.fillStyle = "white"; context.fillRect(0,0,160,160);
          context.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,160,160);
          const value = canvas.toDataURL("image/jpeg",0.75); if (value.length > 64000) throw new Error("Try a smaller image."); setAvatar(value);
        } catch { setToast({type:"error",message:"Unable to read this image. Choose another image."}); } finally { URL.revokeObjectURL(url); }
      }} /><p className="mt-2 text-xs text-[#667085]">Choose an image, then click Save Profile.</p></Field>
      <Field label="Full name"><input required maxLength={150} className={inputClass} value={fullName} disabled={busy} onChange={e => setFullName(e.target.value)} /></Field>
      {role !== "student" && <Field label="Phone (optional)"><input type="tel" autoComplete="tel" maxLength={40} className={inputClass} value={phone} disabled={busy} onChange={e => setPhone(e.target.value)} /></Field>}
      {role !== "student" && <Field label="Job title (optional)"><input maxLength={100} className={inputClass} value={jobTitle} disabled={busy} onChange={e => setJobTitle(e.target.value)} /></Field>}
      <Field label="About me (optional)"><textarea rows={4} maxLength={1000} className={inputClass} value={bio} disabled={busy} onChange={e => setBio(e.target.value)} /></Field>
      <p className="text-sm text-[#667085]">Role: {role === "super_admin" ? "Super Admin" : role === "admin" ? "School Admin" : "Student"}</p><button disabled={busy} className={buttonClass}><ActionIcon name="save" />Save Profile</button>
    </form></Card>
    <div className="stack-layout">
      <Card><h2 className="mb-layout text-lg font-bold text-[#172033]">Email Address</h2><div className="mb-4 space-y-2 text-sm text-[#667085]"><p className="break-words">Current email: <span className="font-medium text-[#344054]">{email}</span></p></div><form className="stack-layout" onSubmit={e => save(e, "email")}>
        <Field label="New email"><input type="email" required autoComplete="off" placeholder="Enter a new email address" maxLength={254} className={inputClass} value={newEmail} disabled={busy} onChange={e => setNewEmail(e.target.value)} /></Field>
        <Field label="Current password"><input type="password" required autoComplete="current-password" className={inputClass} value={emailPassword} disabled={busy} onChange={e => setEmailPassword(e.target.value)} /></Field>
        <button disabled={busy || !newEmail.trim() || newEmail.trim().toLowerCase() === email.toLowerCase()} className={buttonClass}><ActionIcon name="mail" />Change Email</button>
      </form></Card>
      <Card><h2 className="mb-layout text-lg font-bold text-[#172033]">Change Password</h2><form className="stack-layout" onSubmit={e => save(e, "password")}>
        <Field label="Current password"><input required autoComplete="current-password" type="password" className={inputClass} disabled={busy} value={current} onChange={e => setCurrent(e.target.value)} /></Field>
        <Field label="New password"><input required autoComplete="new-password" type="password" minLength={8} maxLength={128} className={inputClass} disabled={busy} value={password} onChange={e => setPassword(e.target.value)} /></Field>
        <Field label="Confirm new password"><input required autoComplete="new-password" type="password" minLength={8} maxLength={128} className={inputClass} disabled={busy} value={confirm} onChange={e => setConfirm(e.target.value)} /></Field>
        <button disabled={busy} className={buttonClass}><ActionIcon name="key" />Update Password</button>
      </form></Card>
    </div>
  </div></>;
}
