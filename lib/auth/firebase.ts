"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Default Firebase Configuration — configured for BandMate Web App
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3Ik8FqV0NRUO5k8IyNyPNV98QAd2Yk2g",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "bandmate-39809.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bandmate-39809",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "bandmate-39809.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "642455640959",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:642455640959:web:2265a6e62caf4fbf67184a",
}

// Initialize Firebase App singleton safely for Next.js App Router
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({
  prompt: "select_account",
})

export { app, auth, db, googleProvider }
