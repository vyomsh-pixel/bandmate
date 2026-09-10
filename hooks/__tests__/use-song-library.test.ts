import { describe, expect, it } from "vitest"
import { getUserSongsKey, getUserCurrentSongKey } from "../../lib/storage/cloud-sync"

describe("Song Library Storage Keys", () => {
  it("generates correct per-user localStorage keys", () => {
    expect(getUserSongsKey("user-123")).toBe("bandmate:songs:user-123:v1")
    expect(getUserCurrentSongKey("user-123")).toBe("bandmate:currentSongId:user-123:v1")
  })
})
