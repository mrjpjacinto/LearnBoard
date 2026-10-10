export function mutationAccountAllowed(profile: { role: string; school_id: string | null; is_active: boolean } | null, schoolActive: boolean) {
  return !!profile?.is_active && (profile.role === "super_admin" || (["admin", "student"].includes(profile.role) && !!profile.school_id && schoolActive));
}
// Per-process protection for the private pre-launch environment; no infrastructure cost.
export class MutationLimiter {
  private buckets = new Map<string, { count: number; until: number }>();
  constructor(private maxKeys = 10000) {}
  take(key: string, limit: number, windowMs = 60000, now = Date.now()) {
    for (const [id, bucket] of this.buckets) if (bucket.until <= now) this.buckets.delete(id);
    const current = this.buckets.get(key);
    if (current) { if (current.count >= limit) return Math.max(1, Math.ceil((current.until - now) / 1000)); current.count++; return 0; }
    if (this.buckets.size >= this.maxKeys) return Math.ceil(windowMs / 1000);
    this.buckets.set(key, { count: 1, until: now + windowMs }); return 0;
  }
}
