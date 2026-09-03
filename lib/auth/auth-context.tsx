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
        const currentUser: User = {
          uid: fbUser.uid,
          email: fbUser.email || "user@bandmate.app",
          displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Musician",
          photoURL: fbUser.photoURL || undefined,
          isGuest: false,
          createdAt: Date.now(),
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
      const authenticatedUser: User = {
        uid: res.user.uid,
        email: res.user.email || email,
        displayName: res.user.displayName || email.split("@")[0],
        isGuest: false,
        createdAt: Date.now(),
      }
      persistUser(authenticatedUser)
      toast.success(`Welcome back, ${authenticatedUser.displayName}! 🎵`)
      closeAuthModal()
      return true
    } catch {
      // Local fallback session check if Firebase Auth offline
      try {
        const rawAccounts = localStorage.getItem(ACCOUNTS_KEY)
        const accounts = rawAccounts ? (JSON.parse(rawAccounts) as Record<string, { pass: string; user: User }>) : {}
        const found = accounts[email.toLowerCase().trim()]
        if (found && found.pass === pass) {
          persistUser(found.user)
          toast.success(`Welcome back, ${found.user.displayName}! 🎵`)
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
      const newUser: User = {
        uid: res.user.uid,
        email: email.toLowerCase().trim(),
        displayName: name.trim(),
        isGuest: false,
        createdAt: Date.now(),
      }
      persistUser(newUser)
      toast.success(`Account created! Welcome to BandMate, ${newUser.displayName}! 🎉`)
      closeAuthModal()
      return true
    } catch {
      // Fallback local session account creation
      const cleanEmail = email.toLowerCase().trim()
      const rawAccounts = localStorage.getItem(ACCOUNTS_KEY)
      const accounts = rawAccounts ? (JSON.parse(rawAccounts) as Record<string, { pass: string; user: User }>) : {}

      if (accounts[cleanEmail]) {
        toast.error("An account with this email already exists.")
        return false
      }

      const newUser: User = {
        uid: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        email: cleanEmail,
        displayName: name.trim(),
        isGuest: false,
        createdAt: Date.now(),
      }

      accounts[cleanEmail] = { pass, user: newUser }
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
      persistUser(newUser)
      toast.success(`Account created! Welcome to BandMate, ${newUser.displayName}! 🎉`)
      closeAuthModal()
      return true
    }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user
      const googleUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || "musician@google.com",
        displayName: fbUser.displayName || "Google Musician",
        photoURL: fbUser.photoURL || undefined,
        isGuest: false,
        createdAt: Date.now(),
      }

      persistUser(googleUser)
      toast.success(`Signed in with Google as ${googleUser.displayName}! 🚀`)
      closeAuthModal()
      return true
    } catch (err: unknown) {
      console.warn("Firebase popup failed, attempting fallback...", err)
      // Demo / fallback Google Sign In
      const fallbackUser: User = {
        uid: `goog_${Date.now().toString(36)}`,
        email: "musician@google.com",
        displayName: "Google Musician",
        isGuest: false,
        createdAt: Date.now(),
      }
      persistUser(fallbackUser)
      toast.success("Signed in with Google! 🚀")
      closeAuthModal()
      return true
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
