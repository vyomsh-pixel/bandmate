/**
 * BandMate — Namespaced Per-User Local Storage Driver.
 *
 * Persists user song projects locally in window.localStorage using per-user account keys,
 * with automatic migration of guest songs into a user's local store upon sign-in.
 */

import type { Song } from "../music/types"

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function getUserSongsKey(uid: string): string {
  return `bandmate:songs:${uid}:v1`
}

export function getUserCurrentSongKey(uid: string): string {
  return `bandmate:currentSongId:${uid}:v1`
}

/** Load all saved songs for a specific user ID (or guest). */
export function loadUserSongs(uid: string): Song[] {
  if (!isBrowser()) return []
  try {
    const userKey = getUserSongsKey(uid)
    let raw = window.localStorage.getItem(userKey)

    // Fallback to legacy global store for guest mode or legacy data
    if (!raw && (uid === "guest-user" || uid === "guest")) {
      raw = window.localStorage.getItem("bandmate:songs:v1")
    }

    if (!raw) return []
    const parsed = JSON.parse(raw) as Song[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

/** Persist songs for a specific user ID. */
export function saveUserSongs(uid: string, songs: Song[]): void {
  if (!isBrowser()) return
  try {
    const userKey = getUserSongsKey(uid)
    window.localStorage.setItem(userKey, JSON.stringify(songs))
  } catch {
    // Fail silently on quota limit
  }
}

/** Get / set current active song ID per user. */
export function loadUserCurrentSongId(uid: string): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(getUserCurrentSongKey(uid))
  } catch {
    return null
  }
}

export function saveUserCurrentSongId(uid: string, id: string | null): void {
  if (!isBrowser()) return
  try {
    if (id) window.localStorage.setItem(getUserCurrentSongKey(uid), id)
    else window.localStorage.removeItem(getUserCurrentSongKey(uid))
  } catch {
    // Ignore storage restrictions
  }
}

/**
 * Automatically migrate guest songs into a user's account upon login.
 */
export function migrateGuestSongsToUser(userUid: string): Song[] {
  if (!isBrowser() || userUid === "guest-user") return []

  try {
    const guestSongs = loadUserSongs("guest-user")
    if (guestSongs.length === 0) return []

    const existingUserSongs = loadUserSongs(userUid)
    const existingIds = new Set(existingUserSongs.map((s) => s.id))

    const newToMigrate = guestSongs.filter((s) => !existingIds.has(s.id))
    if (newToMigrate.length === 0) return existingUserSongs

    const merged = [...existingUserSongs, ...newToMigrate].sort((a, b) => b.updatedAt - a.updatedAt)
    saveUserSongs(userUid, merged)
    return merged
  } catch {
    return []
  }
}
