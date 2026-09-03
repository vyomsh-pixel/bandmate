import { describe, it, expect, beforeEach } from "vitest"
import {
  getUserSongsKey,
  loadUserSongs,
  saveUserSongs,
  migrateGuestSongsToUser,
} from "../../storage/cloud-sync"
import type { Song } from "../../music/types"

function createMockLocalStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

describe("User Auth & Cloud Data Storage", () => {
  beforeEach(() => {
    // @ts-ignore
    globalThis.window = { localStorage: createMockLocalStorage() } as any
    // @ts-ignore
    globalThis.localStorage = globalThis.window.localStorage
  })

  it("isolates storage keys per user UID", () => {
    expect(getUserSongsKey("usr_123")).toBe("bandmate:songs:usr_123:v1")
    expect(getUserSongsKey("guest-user")).toBe("bandmate:songs:guest-user:v1")
  })

  it("persists and retrieves user-specific songs", () => {
    const mockSong: Song = {
      id: "song-user-1",
      title: "My User Song",
      keyTonic: "G",
      keyMode: "major",
      bpm: 120,
      beatsPerBar: 4,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [],
    }

    saveUserSongs("usr_123", [mockSong])
    const loaded = loadUserSongs("usr_123")

    expect(loaded.length).toBe(1)
    expect(loaded[0].title).toBe("My User Song")
    expect(loaded[0].keyTonic).toBe("G")

    // Other user should have empty library
    const otherUserSongs = loadUserSongs("usr_999")
    expect(otherUserSongs.length).toBe(0)
  })

  it("automatically migrates guest songs to account library upon sign up", () => {
    const guestSong: Song = {
      id: "guest-song-101",
      title: "Guest Jam",
      keyTonic: "D",
      keyMode: "minor",
      bpm: 95,
      beatsPerBar: 4,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [],
    }

    // Save as guest
    saveUserSongs("guest-user", [guestSong])
    expect(loadUserSongs("guest-user").length).toBe(1)

    // User creates account
    const migrated = migrateGuestSongsToUser("usr_new_account")

    expect(migrated.length).toBe(1)
    expect(migrated[0].title).toBe("Guest Jam")

    const savedUserSongs = loadUserSongs("usr_new_account")
    expect(savedUserSongs.length).toBe(1)
    expect(savedUserSongs[0].id).toBe("guest-song-101")
  })
})
