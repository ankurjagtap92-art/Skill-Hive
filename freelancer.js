// ============================================================
//  freelancer.js  — All Freelancer-specific logic
//
//  Exported functions:
//    initFreelancerView(user, profile, db, helpers)
//      → Called by app.js when a freelancer loads the home section
//      → Loads jobs from Firestore and shows job cards
//
//  IMPORTANT — Import paths:
//  This file is at the ROOT (/freelancer.js)
//  firebase.js is also at ROOT → import from "./firebase.js"
//  components/ folder is at ROOT/components/ → import from "./components/..."
// ============================================================

import { db } from "./firebase.js";

import {
  collection, getDocs, doc, setDoc,
  getDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { showToast, calcSkillMatch } from "./utils.js";
import { createJobCard }             from "./components/jobCard.js";


// ── State for this module ──────────────────────────────────
let _user    = null;
let _profile = null;
let _appliedJobIds = new Set(); // Set of job IDs user has already applied to


// ══════════════════════════════════════════════════════════
//  MAIN: initFreelancerView
//  Called by app.js every time freelancer clicks "Browse Jobs"
// ══════════════════════════════════════════════════════════

export async function initFreelancerView(user, profile) {
  _user    = user;
  _profile = profile;

  // Load which jobs this user already applied to
  await loadMyAppliedIds();

  // Then load and render all available jobs
  await loadAndRenderJobs();

  // Wire up search button
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  // Remove old listener and re-add to avoid stacking
  const newBtn = searchBtn.cloneNode(true);
  searchBtn.parentNode.replaceChild(newBtn, searchBtn);
  newBtn.addEventListener("click", () => {
    loadAndRenderJobs(searchInput?.value?.trim() || "");
  });

  if (searchInput) {
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") newBtn.click();
    });
  }
}


// ══════════════════════════════════════════════════════════
//  LOAD APPLIED JOB IDs
//  Reads from Firestore 'applications' collection
//  to know which jobs this user already applied to
// ══════════════════════════════════════════════════════════

async function loadMyAppliedIds() {
  if (!_user) return;
  _appliedJobIds = new Set();
  try {
    const snap = await getDocs(collection(db, "applications"));
    snap.forEach(d => {
      const data = d.data();
      if (data.applicantUid === _user.uid) {
        _appliedJobIds.add(data.jobId);
      }
    });
  } catch (e) {
    console.warn("Could not load applications:", e.message);
  }
}


// ══════════════════════════════════════════════════════════
//  LOAD & RENDER JOBS
//  Fetches all jobs from Firestore and renders job cards
// ══════════════════════════════════════════════════════════

async function loadAndRenderJobs(searchQuery = "") {
  const grid = document.getElementById("freelancers-grid");
  if (!grid) return;

  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <p>Loading jobs...</p>
    </div>`;

  try {
    const snap = await getDocs(collection(db, "jobs"));
    let jobs   = [];
    snap.forEach(d => jobs.push(d.data()));

    // Sort newest first
    jobs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(job =>
        job.title?.toLowerCase().includes(q) ||
        (job.skills || []).some(s => s.toLowerCase().includes(q)) ||
        job.description?.toLowerCase().includes(q)
      );
    }

    grid.innerHTML = "";

    if (!jobs.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No jobs found</h3>
          <p>${searchQuery ? "Try a different search term." : "No jobs posted yet. Check back soon!"}</p>
        </div>`;
      return;
    }

    // Render each job as a card
    const freelancerSkills = _profile?.skills || [];

    jobs.forEach(job => {
      const hasApplied = _appliedJobIds.has(job.id);
      const card = createJobCard(
        job,
        freelancerSkills,
        hasApplied,
        handleApply         // callback when Apply is clicked
      );
      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading jobs:", err);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <p>Error loading jobs. Check your connection.</p>
      </div>`;
  }
}


// ══════════════════════════════════════════════════════════
//  HANDLE APPLY
//  Saves application to Firestore 'applications' collection
//  Called by job card's Apply button
// ══════════════════════════════════════════════════════════

async function handleApply(jobId, jobTitle, applyBtn) {
  if (!_user) {
    showToast("Please login to apply.", "warning");
    return;
  }

  // Optimistically update the button
  applyBtn.disabled   = true;
  applyBtn.textContent = "Applying...";

  try {
    // Create a unique application ID
    const appId = `${_user.uid}_${jobId}`;

    await setDoc(doc(db, "applications", appId), {
      appId,
      jobId,
      applicantUid:  _user.uid,
      applicantName: _profile?.name || "Anonymous",
      status:        "pending",    // pending | accepted | rejected
      appliedAt:     serverTimestamp(),
    });

    // Mark as applied locally
    _appliedJobIds.add(jobId);

    // Update button to show success
    applyBtn.textContent = "✓ Applied";
    applyBtn.classList.add("applied");

    showToast(`Applied to "${jobTitle}"! ✅`, "success");

  } catch (err) {
    console.error("Apply error:", err);
    applyBtn.disabled    = false;
    applyBtn.textContent = "Apply Now";
    showToast("Failed to apply. Try again.", "error");
  }
}