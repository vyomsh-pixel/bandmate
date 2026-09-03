"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"

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
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as User
        setUser(parsed)
      } else {
        // Default to guest session
        setUser(DEFAULT_GUEST_USER)
      }
    } catch {
      setUser(DEFAULT_GUEST_USER)
    } finally {
      setIsLoading(false)
    }
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
      const rawAccounts = localStorage.getItem(ACCOUNTS_KEY)
      const accounts = rawAccounts ? (JSON.parse(rawAccounts) as Record<string, { pass: string; user: User }>) : {}

      const found = accounts[email.toLowerCase().trim()]
      if (!found || found.pass !== pass) {
        toast.error("Invalid email or password.")
        return false
      }

      persistUser(found.user)
      toast.success(`Welcome back, ${found.user.displayName}! 🎵`)
      closeAuthModal()
      return true
    } catch {
      toast.error("Failed to authenticate.")
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
    } catch {
      toast.error("Failed to create account.")
      return false
    }
  }

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const googleUser: User = {
        uid: `goog_${Date.now().toString(36)}`,
        email: "musician@google.com",
        displayName: "Google Musician",
        isGuest: false,
        createdAt: Date.now(),
      }

      persistUser(googleUser)
      toast.success("Signed in with Google! 🚀")
      closeAuthModal()
      return true
    } catch {
      toast.error("Google Sign-In failed.")
      return false
    }
  }

  const logout = () => {
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
