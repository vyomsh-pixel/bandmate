"use client"

/**
 * BandMate — Song library hook.
 *
 * Owns the collection of saved songs + the currently-open song, persisting
 * every change to localStorage. This is the single source of truth the Song
 * Lab UI reads and writes.
 */

import { useCallback, useEffect, useState, useRef } from "react"
import { createId } from "@/lib/storage/local-store"
import {
  loadUserSongs,
  saveUserSongs,
  loadUserCurrentSongId,
  saveUserCurrentSongId,
  migrateGuestSongsToUser,
} from "@/lib/storage/cloud-sync"
import type { ChordEntry, Section, Song } from "@/lib/music/types"

function makeDefaultSong(): Song {
  const now = Date.now()
  return {
    id: createId(),
    title: "Untitled Song",
    keyTonic: "C",
    keyMode: "major",
    bpm: 100,
    beatsPerBar: 4,
    sections: [
      {
        id: createId(),
        name: "Verse 1",
        chords: [
          { id: createId(), symbol: "C", beats: 4 },
          { id: createId(), symbol: "G", beats: 4 },
          { id: createId(), symbol: "Am", beats: 4 },
          { id: createId(), symbol: "F", beats: 4 },
        ],
      }
    ],
    createdAt: now,
    updatedAt: now,
  }
}

function dedupeSongs(songs: Song[]): Song[] {
  const seen = new Set<string>()
  return songs.filter((s) => {
    if (!s || !s.id || seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

export function useSongLibrary(userId: string = "guest-user") {
  const [songs, setSongs] = useState<Song[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)

  // Undo/redo stacks for the currently active song
  const undoStack = useRef<Song[]>([])
  const redoStack = useRef<Song[]>([])
  const songsRef = useRef<Song[]>([])
  const currentSongRef = useRef<Song | null>(null)
  const userRef = useRef<string>(userId)

  // Update user ref
  useEffect(() => {
    userRef.current = userId
  }, [userId])

  // Keep songsRef in sync
  useEffect(() => {
    songsRef.current = songs
  }, [songs])

  // Hydrate per-user songs from storage & migrate guest songs if logging in.
  useEffect(() => {
    setLoaded(false)
    let stored = dedupeSongs(loadUserSongs(userId))

    if (userId !== "guest-user" && userId !== "guest") {
      const migrated = dedupeSongs(migrateGuestSongsToUser(userId))
      if (migrated.length > 0) stored = dedupeSongs([...migrated, ...stored])
    }

    if (stored.length === 0) {
      const seed = makeDefaultSong()
      songsRef.current = [seed]
      setSongs([seed])
      setCurrentId(seed.id)
      saveUserSongs(userId, [seed])
      saveUserCurrentSongId(userId, seed.id)
    } else {
      songsRef.current = stored
      setSongs(stored)
      const savedId = loadUserCurrentSongId(userId)
      const validId = savedId && stored.some((s) => s.id === savedId) ? savedId : stored[0].id
      setCurrentId(validId)
      saveUserCurrentSongId(userId, validId)
    }
    setLoaded(true)
  }, [userId])

  const persist = useCallback((next: Song[]) => {
    songsRef.current = next
    setSongs(next)
    saveUserSongs(userRef.current, next)
  }, [])

  const currentSong = songs.find((s) => s.id === currentId) ?? null
  
  // Keep ref in sync for undo/redo
  useEffect(() => {
    currentSongRef.current = currentSong
  }, [currentSong])

  const selectSong = useCallback((id: string) => {
    setCurrentId(id)
    saveUserCurrentSongId(userRef.current, id)
    undoStack.current = []
    redoStack.current = []
    setUndoCount(0)
    setRedoCount(0)
  }, [])

  const createSong = useCallback(
    (partial?: Partial<Song>) => {
      const base = makeDefaultSong()
      const song: Song = { ...base, ...partial, id: base.id, createdAt: base.createdAt, updatedAt: base.createdAt }
      const next = [song, ...songsRef.current]
      songsRef.current = next
      setSongs(next)
      saveUserSongs(userRef.current, next)
      setCurrentId(song.id)
      saveUserCurrentSongId(userRef.current, song.id)
      undoStack.current = []
      redoStack.current = []
      setUndoCount(0)
      setRedoCount(0)
      return song
    },
    [],
  )

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const updateSong = useCallback(
    (id: string, patch: Partial<Song> | ((song: Song) => Partial<Song>), options: { immediate?: boolean } = {}) => {
      const prev = songsRef.current
      const target = prev.find((s) => s.id === id)
      if (!target) return

      if (target.id === currentSongRef.current?.id) {
        if (options.immediate && debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
        if (!debounceTimerRef.current) {
          undoStack.current = [...undoStack.current, target].slice(-50)
          redoStack.current = []
          setUndoCount(undoStack.current.length)
          setRedoCount(0)
        }
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        if (!options.immediate) {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null
          }, 500)
        }
      }

      const next = prev.map((s) => {
        if (s.id !== id) return s
        const changes = typeof patch === "function" ? patch(s) : patch
        return { ...s, ...changes, id: s.id, updatedAt: Date.now() }
      })
      songsRef.current = next
      setSongs(next)
      saveUserSongs(userRef.current, next)
    },
    [],
  )

  const undo = useCallback(() => {
    if (undoStack.current.length === 0 || !currentSongRef.current) return
    const prev = undoStack.current.pop()!
    redoStack.current.push(currentSongRef.current)
    setUndoCount(undoStack.current.length)
    setRedoCount(redoStack.current.length)

    const next = songsRef.current.map((s) => (s.id === prev.id ? prev : s))
    songsRef.current = next
    setSongs(next)
    saveUserSongs(userRef.current, next)
  }, [])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0 || !currentSongRef.current) return
    const nextState = redoStack.current.pop()!
    undoStack.current.push(currentSongRef.current)
    setUndoCount(undoStack.current.length)
    setRedoCount(redoStack.current.length)

    const next = songsRef.current.map((s) => (s.id === nextState.id ? nextState : s))
    songsRef.current = next
    setSongs(next)
    saveUserSongs(userRef.current, next)
  }, [])

  const deleteSong = useCallback(
    (id: string) => {
      const next = songsRef.current.filter((s) => s.id !== id)
      const finalList = next.length === 0 ? [makeDefaultSong()] : next
      songsRef.current = finalList
      setSongs(finalList)
      saveUserSongs(userRef.current, finalList)

      if (currentSongRef.current?.id === id) {
        const newId = finalList[0].id
        setCurrentId(newId)
        saveUserCurrentSongId(userRef.current, newId)
      }

      undoStack.current = []
      redoStack.current = []
      setUndoCount(0)
      setRedoCount(0)
    },
    [],
  )

  // Convenience helpers for sections editing.
  const setSections = useCallback(
    (id: string, sections: Section[]) => updateSong(id, { sections }, { immediate: true }),
    [updateSong],
  )

  return {
    loaded,
    songs,
    currentSong,
    currentId,
    selectSong,
    createSong,
    updateSong,
    deleteSong,
    setSections,
    undo,
    redo,
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
  }
}
