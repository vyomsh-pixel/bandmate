/**
 * BandMate — Local ID generator helper.
 * (Song persistence lives in cloud-sync.ts with localStorage + Supabase sync.)
 */

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

/** Generate a reasonably unique id without extra dependencies. */
export function createId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

