// ============================================================
//  firebase.js
//  PURPOSE: Connect our app to Firebase.
//  This file runs FIRST (see index.html script order).
//  It sets up Auth and Firestore, then exports them so
//  every other file can import and use them.
// ============================================================

// Step 1 — Import the specific Firebase tools we need.
// We use "modular" (v9) imports — only load what we use.
import { initializeApp }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }                               from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }                          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ──────────────────────────────────────────────────────────
//  🔴 IMPORTANT: REPLACE THESE VALUES WITH YOUR OWN!
//
//  HOW TO GET YOUR CONFIG:
//  1. Go to https://console.firebase.google.com
//  2. Create a new project (e.g. "student-marketplace")
//  3. Click the </> (Web) icon to add a web app
//  4. Copy the firebaseConfig object Firebase gives you
//  5. Paste it here, replacing the placeholder values below
// ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAe1BZqbZVW2DMI0fUVTZB_MU5RWdVqR-k",
  authDomain: "skillhive-877ac.firebaseapp.com",
  projectId: "skillhive-877ac",
  storageBucket: "skillhive-877ac.firebasestorage.app",
  messagingSenderId: "488080678356",
  appId: "1:488080678356:web:66584e83c595b0026bca41",
  measurementId: "G-BTM20H1C7H"
};


// Step 2 — Initialize Firebase with our config.
// Think of this like "turning on" Firebase for our app.
const app = initializeApp(firebaseConfig);

// Step 3 — Get the Auth service (handles login/signup/logout)
export const auth = getAuth(app);

// Step 4 — Get the Firestore service (our database)
export const db = getFirestore(app);

// We "export" auth and db so other files can import them like:
//   import { auth, db } from './firebase.js';