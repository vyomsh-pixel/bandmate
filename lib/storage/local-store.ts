/**
 * BandMate — Local persistence layer.
 *
 * A thin, typed wrapper over localStorage for saving song projects. Kept
 * isolated so a future backend (or a different storage driver) can replace it
 * without touching UI or engine code.
 *
 * No authentication, no network — everything lives in the browser.
 */

import type { Song } from "../music/types"

const SONGS_KEY = "bandmate:songs:v1"
const CURRENT_KEY = "bandmate:currentSongId:v1"

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

/** Load all saved songs (newest updated first). */
export function loadSongs(): Song[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(SONGS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Song[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

/** Persist the full song list. */
export function saveSongs(songs: Song[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
  } catch {
    // Storage full or unavailable — fail silently; UI keeps in-memory state.
  }
}

/** Get / set the last-open song id so reloads restore the workspace. */
export function loadCurrentSongId(): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(CURRENT_KEY)
}

export function saveCurrentSongId(id: string | null): void {
  if (!isBrowser()) return
  if (id) window.localStorage.setItem(CURRENT_KEY, id)
  else window.localStorage.removeItem(CURRENT_KEY)
}

/** Generate a reasonably unique id without extra dependencies. */
export function createId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
