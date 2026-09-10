import { describe, expect, it } from "vitest"
import { getUserSongsKey, getUserCurrentSongKey, loadUserSongs } from "../cloud-sync"

describe("Storage and Cloud Sync Drivers", () => {
  it("computes proper storage namespaces", () => {
    expect(getUserSongsKey("guest")).toBe("bandmate:songs:guest:v1")
    expect(getUserCurrentSongKey("guest")).toBe("bandmate:currentSongId:guest:v1")
  })

  it("handles non-browser environments gracefully", () => {
    const result = loadUserSongs("guest")
    expect(Array.isArray(result)).toBe(true)
  })
})
