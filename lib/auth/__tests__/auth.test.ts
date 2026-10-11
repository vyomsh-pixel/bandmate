import { describe, it, expect, beforeEach } from "vitest"
import {
  getUserSongsKey,
  loadUserSongs,
  saveUserSongs,
  saveUserCurrentSongId,
  loadUserCurrentSongId,
  migrateGuestSongsToUser,
  exportUserStudioData,
  deleteUserStudioData,
} from "../../storage/cloud-sync"
import {
  hashPasswordWithSalt,
  saveLocalAccount,
  verifyLocalAccount,
  type User,
} from "../auth-context"
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

  it("hashes local account passwords with SHA-256 + salt and never stores plaintext password", async () => {
    const rawPass = "SuperSecretStudioPass!99"
    const user: User = {
      uid: "usr_hash_test",
      email: "artist@bandmate.app",
      displayName: "Artist",
      isGuest: false,
      createdAt: 1700000000000,
      consentAcceptedAt: 1700000000000,
    }

    await saveLocalAccount(user.email, rawPass, user)

    const rawStored = globalThis.localStorage.getItem("bandmate:auth:accounts:v1")
    expect(rawStored).toBeTruthy()
    expect(rawStored).not.toContain(rawPass)

    const parsed = JSON.parse(rawStored!)
    const entry = parsed["artist@bandmate.app"]
    expect(entry.pass).toBeUndefined()
    expect(typeof entry.passwordHash).toBe("string")
    expect(entry.passwordHash.length).toBeGreaterThanOrEqual(16)
    expect(typeof entry.salt).toBe("string")

    const verified = await verifyLocalAccount("artist@bandmate.app", rawPass)
    expect(verified?.uid).toBe("usr_hash_test")

    const wrong = await verifyLocalAccount("artist@bandmate.app", "WrongPassword123")
    expect(wrong).toBeNull()

    const deterministic1 = await hashPasswordWithSalt("test", "salt123")
    const deterministic2 = await hashPasswordWithSalt("test", "salt123")
    expect(deterministic1).toBe(deterministic2)
  })

  it("exports and deletes user studio data cleanly", async () => {
    const user: User = {
      uid: "usr_privacy_1",
      email: "privacy@bandmate.app",
      displayName: "Privacy User",
      isGuest: false,
      createdAt: 1700000000000,
      consentAcceptedAt: 1700000005000,
    }
    globalThis.localStorage.setItem("bandmate:auth:user:v1", JSON.stringify(user))
    globalThis.localStorage.setItem("bandmate:privacy:consent:v1", "1700000005000")
    await saveLocalAccount(user.email, "SecretPass123", user)

    const song: Song = {
      id: "song-priv-1",
      title: "Private Track",
      keyTonic: "C",
      keyMode: "major",
      bpm: 110,
      beatsPerBar: 4,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      sections: [],
    }
    saveUserSongs(user.uid, [song])
    saveUserCurrentSongId(user.uid, song.id)

    const exportedJson = exportUserStudioData(user.uid)
    const exported = JSON.parse(exportedJson)
    expect(exported.userId).toBe(user.uid)
    expect(exported.currentSongId).toBe("song-priv-1")
    expect(exported.consentAcceptedAt).toBe(1700000005000)
    expect(exported.songs.length).toBe(1)
    expect(exported.songs[0].title).toBe("Private Track")

    await deleteUserStudioData(user.uid)
    expect(loadUserSongs(user.uid)).toEqual([])
    expect(loadUserCurrentSongId(user.uid)).toBeNull()
    expect(globalThis.localStorage.getItem("bandmate:auth:user:v1")).toBeNull()
    expect(await verifyLocalAccount(user.email, "SecretPass123")).toBeNull()
  })
})
