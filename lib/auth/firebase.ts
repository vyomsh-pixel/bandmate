"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Default Firebase Configuration — configured for BandMate Web App
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBandMateAppDemoKeyForAuth38472910",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "bandmate-main.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bandmate-main",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "bandmate-main.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "849201847201",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:849201847201:web:a9382b1c4d7e9f0a",
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
