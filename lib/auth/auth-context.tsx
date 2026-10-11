"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { auth, googleProvider } from "./firebase"

export interface User {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  isGuest: boolean
  createdAt: number
  consentAcceptedAt?: number
}

export interface StoredAccount {
  passwordHash: string
  salt: string
  user: User
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthModalOpen: boolean
  openAuthModal: (mode?: "login" | "signup") => void
  closeAuthModal: () => void
  authModalMode: "login" | "signup"
  login: (email: string, pass: string) => Promise<boolean>
  signup: (email: string, pass: string, name: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  logout: () => void
}

const STORAGE_KEY = "bandmate:auth:user:v1"
const ACCOUNTS_KEY = "bandmate:auth:accounts:v1"
const CONSENT_KEY = "bandmate:privacy:consent:v1"

export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const data = new TextEncoder().encode(input)
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  let h1 = 0xdeadbeef ^ input.length
  let h2 = 0x41c6ce57 ^ input.length
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")
}

export async function saveLocalAccount(email: string, pass: string, user: User): Promise<void> {
  const cleanEmail = email.toLowerCase().trim()
  const rawAccounts = localStorage.getItem(ACCOUNTS_KEY)
  const accounts = rawAccounts ? (JSON.parse(rawAccounts) as Record<string, StoredAccount>) : {}
  const salt =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `salt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  const passwordHash = await hashPasswordWithSalt(pass, salt)
  accounts[cleanEmail] = { passwordHash, salt, user }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export async function verifyLocalAccount(email: string, pass: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim()
  const rawAccounts = localStorage.getItem(ACCOUNTS_KEY)
  if (!rawAccounts) return null
  const accounts = JSON.parse(rawAccounts) as Record<string, StoredAccount>
  const found = accounts[cleanEmail]
  if (!found || !found.passwordHash || !found.salt) return null
  const candidateHash = await hashPasswordWithSalt(pass, found.salt)
  return candidateHash === found.passwordHash ? found.user : null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_GUEST_USER: User = {
  uid: "guest-user",
  email: "guest@bandmate.app",
  displayName: "Guest Musician",
  isGuest: true,
  createdAt: Date.now(),
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login")

  useEffect(() => {
    // 1. Listen for real Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const now = Date.now()
        const currentUser: User = {
          uid: fbUser.uid,
          email: fbUser.email || "user@bandmate.app",
          displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Musician",
          photoURL: fbUser.photoURL || undefined,
          isGuest: false,
          createdAt: now,
          consentAcceptedAt: now,
        }
        setUser(currentUser)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser))
      } else {
        // Fall back to stored session or guest
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as User
            setUser(parsed)
          } else {
            setUser(DEFAULT_GUEST_USER)
          }
        } catch {
          setUser(DEFAULT_GUEST_USER)
        }
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const persistUser = (newUser: User | null) => {
    setUser(newUser)
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
      if (newUser.consentAcceptedAt) {
        localStorage.setItem(CONSENT_KEY, String(newUser.consentAcceptedAt))
        localStorage.setItem(`bandmate:consent:${newUser.uid}:v1`, String(newUser.consentAcceptedAt))
      }
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const openAuthModal = (mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (!email.trim() || !pass.trim()) {
      toast.error("Please enter your email and password.")
      return false
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, pass)
      const now = Date.now()
      const authenticatedUser: User = {
        uid: res.user.uid,
        email: res.user.email || email,
        displayName: res.user.displayName || email.split("@")[0],
        isGuest: false,
        createdAt: now,
        consentAcceptedAt: now,
      }
      persistUser(authenticatedUser)
      toast.success(`Welcome back, ${authenticatedUser.displayName}!`)
      closeAuthModal()
      return true
    } catch (err: any) {
      const code = err?.code || ""
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Invalid email or password.")
        return false
      }

      // Local fallback session check if Firebase Auth offline
      try {
        const foundUser = await verifyLocalAccount(email, pass)
        if (foundUser) {
          const updatedUser: User = {
            ...foundUser,
            consentAcceptedAt: foundUser.consentAcceptedAt ?? Date.now(),
          }
          persistUser(updatedUser)
          toast.success(`Welcome back, ${updatedUser.displayName}!`)
          closeAuthModal()
          return true
        }
      } catch {
        // Ignore fallback errors
      }
      toast.error("Invalid email or password.")
      return false
    }
  }

  const signup = async (email: string, pass: string, name: string): Promise<boolean> => {
    if (!email.trim() || !pass.trim() || !name.trim()) {
      toast.error("Please fill in all required fields.")
      return false
    }

    if (pass.length < 6) {
      toast.error("Password must be at least 6 characters.")
      return false
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass)
      if (res.user) {
        await updateProfile(res.user, { displayName: name.trim() })
      }
      const now = Date.now()
      const newUser: User = {
        uid: res.user.uid,
        email: email.toLowerCase().trim(),
        displayName: name.trim(),
        isGuest: false,
        createdAt: now,
        consentAcceptedAt: now,
      }
      persistUser(newUser)
      toast.success(`Account created! Welcome to BandMate, ${newUser.displayName}!`)
      closeAuthModal()
      return true
    } catch (err: any) {
      const code = err?.code || ""
      if (
        code === "auth/email-already-in-use" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        toast.error(
          code === "auth/email-already-in-use"
            ? "An account with this email already exists."
            : "Invalid credentials provided."
        )
        return false
      }

      // Fallback local session account creation
      const cleanEmail = email.toLowerCase().trim()
      const rawAccounts = localStorage.getItem(ACCOUNTS_KEY)
      const accounts = rawAccounts ? (JSON.parse(rawAccounts) as Record<string, StoredAccount>) : {}

      if (accounts[cleanEmail]) {
        toast.error("An account with this email already exists.")
        return false
      }

      const now = Date.now()
      const newUser: User = {
        uid: `usr_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        email: cleanEmail,
        displayName: name.trim(),
        isGuest: false,
        createdAt: now,
        consentAcceptedAt: now,
      }

      await saveLocalAccount(cleanEmail, pass, newUser)
      persistUser(newUser)
      toast.success(`Account created! Welcome to BandMate, ${newUser.displayName}!`)
      closeAuthModal()
      return true
    }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user
      const now = Date.now()
      const googleUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || "musician@google.com",
        displayName: fbUser.displayName || "Google Musician",
        photoURL: fbUser.photoURL || undefined,
        isGuest: false,
        createdAt: now,
        consentAcceptedAt: now,
      }

      persistUser(googleUser)
      toast.success(`Signed in with Google as ${googleUser.displayName}!`)
      closeAuthModal()
      return true
    } catch (err: any) {
      console.warn("Google Sign-In error:", err)
      if (err?.code === "auth/popup-closed-by-user") {
        toast.info("Google Sign-In popup was closed.")
      } else if (err?.code === "auth/api-key-not-valid" || err?.message?.includes("api-key-not-valid")) {
        toast.error("Google OAuth requires your Firebase API Key. Please sign in with Email & Password below!")
      } else {
        toast.error(
          err?.message || "Google Sign-In failed. Please sign in with Email & Password."
        )
      }
      return false
    }
  }

  const logout = () => {
    firebaseSignOut(auth).catch(() => {})
    persistUser(DEFAULT_GUEST_USER)
    toast.info("Logged out. Continuing in Guest mode.")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
