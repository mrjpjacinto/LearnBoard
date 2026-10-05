export function personalDetails(value: unknown) {
  const source = value && typeof value === "object" ? value as Record<string,unknown> : {};
  const text = (key: string, max: number) => typeof source[key] === "string" ? source[key].slice(0,max) : "";
  return { phone: text("phone",40), job_title: text("job_title",100), bio: text("bio",1000), avatar: typeof source.avatar === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(source.avatar) && source.avatar.length <= 64000 ? source.avatar : "" };
}
