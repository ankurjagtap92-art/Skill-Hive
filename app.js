// ============================================================
//  app.js  — Main Brain
// ============================================================
import "./auth.js"

import { mountIndustryInsights, unmountIndustryInsights } from "./components/industryInsights.js";

// ── Firebase ────────────────────────────────────────────────
import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc, setDoc, getDoc, deleteDoc,
  collection, getDocs,
  serverTimestamp, updateDoc, increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Our utilities ────────────────────────────────────────────
import {
  showToast, calcSkillMatch, calcCompletion,
  debounce, SKILL_SUGGESTIONS,
} from "./utils.js";

// ── Components ───────────────────────────────────────────────
import { createProfileCard } from "./components/profileCard.js";
import { openModal } from "./components/modal.js";
import { renderDashboard } from "./components/dashboard.js";
import { createJobCard } from "./components/jobCard.js";
import { mountTrendingPanel, unmountTrendingPanel } from "./components/trendingPanel.js";

// ── Role-specific modules ────────────────────────────────────
import { initFreelancerView } from "./freelancer.js";
import { initClientView } from "./client.js";


// ══════════════════════════════════════════════════════════
//  STUDENT EMAIL VALIDATION
// ══════════════════════════════════════════════════════════

function isValidStudentEmail(email) {
  const validPatterns = [
    '.edu', '.edu.', '.ac.in', '.edu.in',
    '@iit', '@nit', '@iiit', '@bits', '@vit', '@vellore',
    '@amrita', '@christ', '@manipal', '@srm', '@nmims',
    '@symbiosis', '@jnu', '@du.ac', '@mu.ac', '@pune.edu',
    '@student.', '@students.', '@alumni.'
  ];

  const emailLower = email.toLowerCase();

  if (emailLower.match(/\.(edu|ac\.in)$/)) return true;
  for (const pattern of validPatterns) {
    if (emailLower.includes(pattern)) return true;
  }
  return false;
}

function getEmailSuggestion(email) {
  const domain = email.split('@')[1];
  if (!domain) return null;
  if (domain.includes('gmail.com')) return "Use your college email (e.g., name@university.ac.in) for better credibility";
  if (domain.includes('yahoo.com') || domain.includes('hotmail.com') || domain.includes('outlook.com')) return "Educational email addresses (.edu, .ac.in) help verify you're a student";
  return "Please use your college/university email address";
}

// ══════════════════════════════════════════════════════════
//  APP STATE
// ══════════════════════════════════════════════════════════

let currentUser = null;
let currentRole = "freelancer";
let currentProfile = null;
let allProfiles = [];
let allJobs = [];
let favorites = [];
let currentJobSkills = [];
let skillsArray = [];

export function getState() {
  return { currentUser, currentRole, currentProfile, allJobs, favorites, currentJobSkills };
}
export function setCurrentJobSkills(skills) { currentJobSkills = skills; }


// ══════════════════════════════════════════════════════════
//  SECTION 1: FIREBASE AUTH STATE
// ══════════════════════════════════════════════════════════

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.email);
    currentUser = user;
    await checkAdminStatus(); 
    await loadCurrentProfile();
    currentRole = currentProfile?.role || "freelancer";
    console.log("Current role:", currentRole);
    await loadFavorites();
    const navbar = document.getElementById("navbar");
    if (navbar) navbar.classList.remove("hidden");
    applyRoleUI();
    mountTrendingPanel();
    // Inside logged-in block, after mountTrendingPanel();
    mountIndustryInsights();
    showSection("home");
    updateLandingStats();
  } else {
    console.log("User logged out");
    currentUser = null;
    currentRole = "freelancer";
    currentProfile = null;
    favorites = [];
    const navbar = document.getElementById("navbar");
    if (navbar) navbar.classList.add("hidden");
    unmountTrendingPanel();
    unmountIndustryInsights();
    showSection("landing");
  }
});


// ══════════════════════════════════════════════════════════
//  SECTION 2: ROLE-BASED UI
// ══════════════════════════════════════════════════════════

function applyRoleUI() {
  const isFreelancer = currentRole === "freelancer";

  const badge = document.getElementById("role-badge");
  if (badge) {
    badge.textContent = isFreelancer ? "🎓 Freelancer" : "💼 Client";
    badge.className = `role-badge ${currentRole}`;
  }

  const paymentLink = document.querySelector("a[data-section='payment']");
if (paymentLink) {
  paymentLink.style.display = currentRole === "client" ? "" : "none";
}

    // Client Profile Link - Show only for clients
  const clientProfileLink = document.getElementById("client-profile-link");
  if (clientProfileLink) {
    clientProfileLink.style.display = currentRole === "client" ? "" : "none";
  }

  // Hide freelancer profile link for clients
  const freelancerProfileLink = document.getElementById("nav-profile-link");
  if (freelancerProfileLink) {
    freelancerProfileLink.style.display = isFreelancer ? "" : "none";
  }

  const profileLink = document.getElementById("nav-profile-link");
  if (profileLink) profileLink.style.display = isFreelancer ? "" : "none";

  const homeLink = document.querySelector(".nav-links a[data-section='home']");
  if (homeLink) homeLink.textContent = isFreelancer ? "Browse Jobs" : "Browse Freelancers";

  const jobsLink = document.querySelector(".nav-links a[data-section='jobs']");
  if (jobsLink) jobsLink.textContent = isFreelancer ? "My Applications" : "Manage Jobs";

  const postJobContainer = document.getElementById("post-job-container");
  if (postJobContainer) postJobContainer.style.display = currentRole === "client" ? "block" : "none";

  const homeHeading = document.querySelector("#home-section .section-heading");
  if (homeHeading) homeHeading.textContent = isFreelancer ? "Browse Jobs" : "Browse Freelancers";

  const homeSubtitle = document.querySelector("#home-section .section-subtitle");
  if (homeSubtitle) homeSubtitle.textContent = isFreelancer ? "Find projects that match your skills" : "Find the right talent for your project";

  const jobsSub = document.getElementById("jobs-subtitle");
  if (jobsSub) jobsSub.textContent = isFreelancer ? "Jobs you've expressed interest in" : "Jobs you've posted";

  const dashSub = document.getElementById("dashboard-subtitle");
  if (dashSub) dashSub.textContent = isFreelancer ? "Track your profile performance" : "Track your hiring activity";

  buildMobileNav();
}


// ══════════════════════════════════════════════════════════
//  SECTION 3: NAVIGATION
// ══════════════════════════════════════════════════════════

export function showSection(name) {
  document.querySelectorAll(".section").forEach(s => {
    s.classList.remove("active");
    s.classList.add("hidden");
  });

  const target = document.getElementById(`${name}-section`);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-links a").forEach(a => {
    a.classList.toggle("active-link", a.dataset.section === name);
  });

  if (name === "home") loadHomeSection();
  if (name === "jobs") loadJobsSection();
  if (name === "profile") loadProfileForm();
  if (name === "client-profile") loadClientProfile();  // NEW
  if (name === "admin") loadAdminPanel();
  if (name === "payment") loadPaymentSection();
  if (name === "dashboard") loadDashboard();
}

function loadHomeSection() {
  console.log("loadHomeSection called, currentRole:", currentRole);
  if (currentRole === "freelancer") {
    initFreelancerView(currentUser, currentProfile);
  } else {
    initClientView(currentUser, currentProfile, favorites, currentJobSkills, toggleFavorite);
  }
}

function loadJobsSection() {
  if (currentRole === "freelancer") {
    loadMyApplications();
    addRefreshButtonToJobsSection();
  } else {
    loadClientJobs();
  }
}

function addRefreshButtonToJobsSection() {
  const header = document.querySelector("#jobs-section .section-header");
  if (header && !document.getElementById("refresh-apps-btn")) {
    const refreshBtn = document.createElement("button");
    refreshBtn.id = "refresh-apps-btn";
    refreshBtn.className = "btn-outline";
    refreshBtn.style.padding = "6px 12px";
    refreshBtn.style.fontSize = "12px";
    refreshBtn.style.marginLeft = "auto";
    refreshBtn.innerHTML = "⟳ Refresh";
    refreshBtn.addEventListener("click", () => {
      loadMyApplications();
      showToast("Refreshing applications...", "default");
    });
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.appendChild(refreshBtn);
  }
}

document.getElementById("navbar").addEventListener("click", (e) => {
  const link = e.target.closest("[data-section]");
  if (!link) return;
  e.preventDefault();
  if (link.dataset.section === "profile" && currentRole === "client") {
    showToast("Clients don't have a freelancer profile.", "warning");
    return;
  }
  showSection(link.dataset.section);
  closeMobileNav();
});


// ══════════════════════════════════════════════════════════
//  SECTION 4: AUTH
// ══════════════════════════════════════════════════════════

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const errorEl = document.getElementById("signup-error");

  if (!name || !email || !password) return showError(errorEl, "Please fill in all fields.");
  if (password.length < 6) return showError(errorEl, "Password must be at least 6 characters.");

  if (!isValidStudentEmail(email)) {
    const suggestion = getEmailSuggestion(email);
    showError(errorEl, `Please use your college/university email address.\n\n${suggestion || "Educational domains: .edu, .ac.in"}`);
    return;
  }

  const chosenRole = sessionStorage.getItem("selectedRole") || "freelancer";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid, name, email,
      role: chosenRole,
      bio: "", skills: [], contactEmail: email,
      contactPhone: "", imageUrl: "",
      availability: "available", profileViews: 0,
      collegeName: "", graduationYear: "", course: "", branch: "",
      isStudentVerified: false,
      createdAt: serverTimestamp(),
    });
    await sendEmailVerification(cred.user);
    sessionStorage.removeItem("selectedRole");
    showToast(`Welcome, ${name}! 🎓\nVerification email sent to ${email}`, "success");
    errorEl.classList.add("hidden");
  } catch (err) {
    showError(errorEl, firebaseErrorMsg(err.code));
  }
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    errorEl.classList.add("hidden");
  } catch (err) {
    showError(errorEl, firebaseErrorMsg(err.code));
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  showToast("Logged out. See you soon! 👋");
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".auth-form").forEach(f => {
      f.classList.toggle("hidden", f.id !== `${tab}-form`);
      f.classList.toggle("active", f.id === `${tab}-form`);
    });
  });
});


// ══════════════════════════════════════════════════════════
//  SECTION 5: DARK MODE
// ══════════════════════════════════════════════════════════

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  const btn = document.getElementById("dark-mode-btn");
  if (btn) btn.textContent = "☀️";
}

document.getElementById("dark-mode-btn").addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark);
  document.getElementById("dark-mode-btn").textContent = isDark ? "☀️" : "🌙";
  showToast(isDark ? "Dark mode on 🌙" : "Light mode on ☀️");
});


// ══════════════════════════════════════════════════════════
//  SECTION 6: PROFILE CRUD
// ══════════════════════════════════════════════════════════

async function loadCurrentProfile() {
  if (!currentUser) return;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  if (snap.exists()) currentProfile = snap.data();
}

function loadProfileForm() {
  if (currentRole === "client") {
    showSection("home");
    showToast("Clients don't have a freelancer profile.", "warning");
    return;
  }
  if (!currentProfile) return;

  setValue("p-name", currentProfile.name || "");
  setValue("p-bio", currentProfile.bio || "");
  setValue("p-contact-email", currentProfile.contactEmail || "");
  setValue("p-contact-phone", currentProfile.contactPhone || "");
  setValue("p-image-url", currentProfile.imageUrl || "");
  setValue("p-availability", currentProfile.availability || "available");
  setValue("p-college-name", currentProfile.collegeName || "");
  setValue("p-graduation-year", currentProfile.graduationYear || "");
  setValue("p-course", currentProfile.course || "");
  setValue("p-branch", currentProfile.branch || "");

  skillsArray = [...(currentProfile.skills || [])];
  renderSkillTags();
  updateCompletionMeter(currentProfile);
  const deleteBtn = document.getElementById("delete-profile-btn");
  if (deleteBtn) deleteBtn.classList.remove("hidden");
}

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const profile = {
    uid: currentUser.uid, role: currentRole,
    name: getValue("p-name"), bio: getValue("p-bio"),
    skills: skillsArray,
    contactEmail: getValue("p-contact-email"),
    contactPhone: getValue("p-contact-phone"),
    imageUrl: getValue("p-image-url"),
    availability: getValue("p-availability"),
    collegeName: getValue("p-college-name"),
    graduationYear: getValue("p-graduation-year"),
    course: getValue("p-course"),
    branch: getValue("p-branch"),
    updatedAt: serverTimestamp(),
    createdAt: currentProfile?.createdAt || serverTimestamp(),
    profileViews: currentProfile?.profileViews ?? 0,
  };

  if (currentRole === "freelancer") {
    if (!profile.collegeName) {
      showToast("Please enter your college/university name.", "warning");
      return;
    }
    if (!profile.graduationYear) {
      showToast("Please select your expected graduation year.", "warning");
      return;
    }
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), profile, { merge: true });
    currentProfile = { ...currentProfile, ...profile };
    updateCompletionMeter(profile);
    showToast("Profile saved! ✅", "success");
  } catch (err) {
    showToast("Error saving profile.", "error");
    console.error(err);
  }
});

document.getElementById("delete-profile-btn")?.addEventListener("click", async () => {
  if (!confirm("Delete your profile? This cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid));
    currentProfile = null; skillsArray = [];
    renderSkillTags(); updateCompletionMeter(null);
    const deleteBtn = document.getElementById("delete-profile-btn");
    if (deleteBtn) deleteBtn.classList.add("hidden");
    showToast("Profile deleted.", "warning");
  } catch (err) { showToast("Error deleting profile.", "error"); }
});

function updateCompletionMeter(profile) {
  let pct = calcCompletion(profile);
  if (currentRole === "freelancer" && profile) {
    let academicScore = 0;
    if (profile.collegeName) academicScore += 15;
    if (profile.graduationYear) academicScore += 10;
    if (profile.course) academicScore += 10;
    pct = Math.min(100, pct + academicScore);
  }
  const bar = document.getElementById("completion-bar");
  const label = document.getElementById("completion-percent");
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
}

// ══════════════════════════════════════════════════════════
//  SECTION 7: SKILLS INPUT
// ══════════════════════════════════════════════════════════

const skillsInput = document.getElementById("p-skills-input");
if (skillsInput) {
  skillsInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkillTag(skillsInput.value.replace(",", "").trim());
    }
  });
  skillsInput.addEventListener("input", debounce(e => showAutocomplete(e.target.value.trim()), 150));
}

function addSkillTag(skill) {
  if (!skill) return;
  if (skillsArray.length >= 15) { showToast("Max 15 skills.", "warning"); return; }
  if (skillsArray.some(s => s.toLowerCase() === skill.toLowerCase())) { showToast("Already added.", "warning"); return; }
  skillsArray.push(skill);
  renderSkillTags();
  if (skillsInput) skillsInput.value = "";
  hideAutocomplete();
}

function renderSkillTags() {
  const c = document.getElementById("skills-tags-container");
  if (!c) return;
  c.innerHTML = skillsArray.map((s, i) => `<span class="skill-tag-removable">${s}<button type="button" data-index="${i}">×</button></span>`).join("");
  c.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      skillsArray.splice(parseInt(btn.dataset.index), 1);
      renderSkillTags();
    });
  });
}

function showAutocomplete(query) {
  hideAutocomplete();
  if (!query) return;
  const matches = SKILL_SUGGESTIONS.filter(s => s.toLowerCase().startsWith(query.toLowerCase()) && !skillsArray.some(a => a.toLowerCase() === s.toLowerCase())).slice(0, 6);
  if (!matches.length) return;
  const wrapper = document.querySelector(".skills-input-wrapper");
  if (!wrapper) return;
  wrapper.style.position = "relative";
  const dd = document.createElement("div");
  dd.id = "autocomplete-dropdown";
  dd.className = "autocomplete-dropdown";
  dd.innerHTML = matches.map(m => `<div class="autocomplete-item" data-skill="${m}">${m}</div>`).join("");
  wrapper.appendChild(dd);
  dd.querySelectorAll(".autocomplete-item").forEach(item => item.addEventListener("click", () => addSkillTag(item.dataset.skill)));
}

function hideAutocomplete() { document.getElementById("autocomplete-dropdown")?.remove(); }
document.addEventListener("click", e => { if (!e.target.closest(".skills-input-wrapper")) hideAutocomplete(); });


// ══════════════════════════════════════════════════════════
//  SECTION 8: FAVORITES
// ══════════════════════════════════════════════════════════

async function loadFavorites() {
  if (!currentUser) return;
  const snap = await getDoc(doc(db, "favorites", currentUser.uid));
  favorites = snap.exists() ? (snap.data().uids || []) : [];
}

export async function toggleFavorite(targetUid) {
  if (!currentUser) { showToast("Login to save freelancers.", "warning"); return; }
  if (favorites.includes(targetUid)) {
    favorites = favorites.filter(id => id !== targetUid);
    showToast("Removed from favorites.");
  } else {
    favorites.push(targetUid);
    showToast("Saved! ❤️", "success");
  }
  await setDoc(doc(db, "favorites", currentUser.uid), { uids: favorites });
}


// ══════════════════════════════════════════════════════════
//  SECTION 9: MY APPLICATIONS
// ══════════════════════════════════════════════════════════

async function loadMyApplications() {
  const grid = document.getElementById("jobs-grid");
  if (!grid) return;
  grid.innerHTML = `<div class="empty-state"><div class="loader-ring"></div><p>Loading your applications...</p></div>`;

  try {
    const appsSnap = await getDocs(collection(db, "applications"));
    const myApps = [];
    appsSnap.forEach(doc => {
      const appData = doc.data();
      if (appData.applicantUid === currentUser.uid) myApps.push({ ...appData, appId: doc.id });
    });

    const jobsSnap = await getDocs(collection(db, "jobs"));
    const jobMap = {};
    jobsSnap.forEach(doc => { jobMap[doc.data().id] = { ...doc.data(), docId: doc.id }; });

    grid.innerHTML = "";
    if (!myApps.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No applications yet</h3><p>Go to Browse Jobs and apply!</p><button class="btn-primary browse-jobs-btn">Browse Jobs →</button></div>`;
      grid.querySelector(".browse-jobs-btn")?.addEventListener("click", () => showSection("home"));
      return;
    }

    myApps.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
    myApps.forEach(app => {
      const job = jobMap[app.jobId];
      if (!job) return;
      grid.appendChild(buildApplicationCard(app, job));
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error loading applications.</p></div>`;
  }
}

function buildApplicationCard(app, job) {
  const card = document.createElement("div");
  card.className = "card application-card";
  const statusConfig = {
    accepted: { bg: "rgba(34,197,94,0.15)", color: "var(--success)", icon: "✅", message: "🎉 Accepted! The client will contact you soon." },
    rejected: { bg: "rgba(239,68,68,0.1)", color: "var(--danger)", icon: "❌", message: "💪 Not selected. Keep applying!" },
    pending: { bg: "rgba(245,158,11,0.12)", color: "var(--warning)", icon: "⏳", message: "⏳ Under review." }
  };
  const status = app.status || "pending";
  const style = statusConfig[status];
  const appliedDate = app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString("en-IN") : "Recently";
  card.innerHTML = `<div class="app-card-header"><div class="app-job-icon">💼</div><div class="app-card-info"><h3 class="app-job-title">${escapeHtml(job.title || "Untitled Job")}</h3><div class="app-meta">📅 Applied: ${appliedDate} · 👤 ${escapeHtml(job.posterName || "Anonymous")}</div></div><div class="app-status-badge" style="background:${style.bg};color:${style.color};padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700">${style.icon} ${status.toUpperCase()}</div></div><p class="app-description">${escapeHtml((job.description || "").substring(0, 150))}${job.description?.length > 150 ? "..." : ""}</p><div class="app-footer">${style.message}</div></div>`;
  return card;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


// ══════════════════════════════════════════════════════════
//  SECTION 10: CLIENT JOBS
// ══════════════════════════════════════════════════════════

async function loadClientJobs() {
  const grid = document.getElementById("jobs-grid");
  if (!grid) return;

  const postJobContainer = document.getElementById("post-job-container");
  if (postJobContainer) postJobContainer.style.display = "block";

  grid.innerHTML = `<div class="empty-state"><div class="loader-ring"></div><p>Loading your jobs...</p></div>`;

  try {
    const snap = await getDocs(collection(db, "jobs"));
    const myJobs = [];
    snap.forEach(d => { const jobData = d.data(); if (jobData.postedBy === currentUser.uid) myJobs.push({ ...jobData, docId: d.id }); });
    myJobs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    grid.innerHTML = "";
    if (!myJobs.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>No jobs posted yet</h3><p>Use the form above to post your first job!</p></div>`;
      return;
    }

    myJobs.forEach(job => {
      const card = document.createElement("div");
      card.className = "card job-card";
      const skillTags = (job.skills || []).map(s => `<span class="skill-tag dark">${escapeHtml(s)}</span>`).join("");
      card.innerHTML = `<h3 class="job-title">${escapeHtml(job.title)}</h3><p class="job-description">${escapeHtml(job.description || "")}</p><div class="job-skills">${skillTags}</div><div class="job-meta"><span>${job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString("en-IN") : "Recently"}</span><button class="btn-outline view-applicants-btn" data-job-id="${job.id || job.docId}" data-job-title="${escapeHtml(job.title)}">👥 View Applicants</button></div>`;
      card.querySelector(".view-applicants-btn")?.addEventListener("click", async (e) => {
        showToast(`Feature: View applicants for "${e.currentTarget.dataset.jobTitle}"`, "info");
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error loading jobs.</p></div>`;
  }
}

document.getElementById("job-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || currentRole !== "client") {
    showToast("Only clients can post jobs.", "warning");
    return;
  }
  const title = getValue("j-title");
  const description = getValue("j-description");
  const skills = getValue("j-skills").split(",").map(s => s.trim()).filter(Boolean);
  if (!title) { showToast("Job title is required.", "warning"); return; }

  try {
    const jobId = `${currentUser.uid}_${Date.now()}`;
    await setDoc(doc(db, "jobs", jobId), {
      id: jobId, title, description, skills,
      postedBy: currentUser.uid,
      posterName: currentProfile?.name || "Anonymous",
      createdAt: serverTimestamp(),
    });
    document.getElementById("job-form").reset();
    showToast("Job posted! ✅", "success");
    loadClientJobs();
  } catch (err) {
    showToast("Error posting job.", "error");
    console.error(err);
  }
});


// ══════════════════════════════════════════════════════════
//  SECTION 11: DASHBOARD
// ══════════════════════════════════════════════════════════

async function loadDashboard() {
  if (!currentUser) return;
  await loadCurrentProfile();

  const favSnap = await getDoc(doc(db, "favorites", currentUser.uid));
  const favsCount = favSnap.exists() ? (favSnap.data().uids || []).length : 0;

  const jobsSnap = await getDocs(collection(db, "jobs"));
  let jobsPosted = 0;
  jobsSnap.forEach(d => { if (d.data().postedBy === currentUser.uid) jobsPosted++; });

  const profilesSnap = await getDocs(collection(db, "users"));
  const allP = [];
  profilesSnap.forEach(d => { if (d.data().name && d.data().role === "freelancer") allP.push(d.data()); });

  renderDashboard({
    profileViews: currentProfile?.profileViews || 0,
    favoritesCount: favsCount,
    jobsPosted,
    completion: calcCompletion(currentProfile),
    allProfiles: allP,
  }, currentRole);
}


// ══════════════════════════════════════════════════════════
//  SECTION 12: MOBILE NAV
// ══════════════════════════════════════════════════════════

function buildMobileNav() {
  document.getElementById("mobile-nav-drawer")?.remove();
  const nav = document.createElement("div");
  nav.id = "mobile-nav-drawer";
  nav.className = "mobile-nav";
  const isFreelancer = currentRole === "freelancer";
  nav.innerHTML = `<a href="#" data-section="home">${isFreelancer ? "🔍 Browse Jobs" : "🏠 Browse Freelancers"}</a><a href="#" data-section="jobs">${isFreelancer ? "📋 My Applications" : "📋 Manage Jobs"}</a>${isFreelancer ? `<a href="#" data-section="profile">👤 My Profile</a>` : ""}<a href="#" data-section="dashboard">📊 Dashboard</a><hr><div style="padding:4px 16px 8px"><span class="role-badge ${currentRole}">${isFreelancer ? "🎓 Freelancer" : "💼 Client"}</span></div>`;
  document.body.appendChild(nav);
  nav.querySelectorAll("[data-section]").forEach(a => {
    a.addEventListener("click", e => { e.preventDefault(); showSection(a.dataset.section); closeMobileNav(); });
  });

}


// Hamburger button - ONLY ONCE
const hamburger = document.createElement("button");
hamburger.className = "hamburger";
hamburger.setAttribute("aria-label", "Menu");
hamburger.innerHTML = `<span></span><span></span><span></span>`;
hamburger.addEventListener("click", () => document.getElementById("mobile-nav-drawer")?.classList.toggle("open"));
document.getElementById("navbar").appendChild(hamburger);


// ══════════════════════════════════════════════════════════
//  SECTION 13: LANDING PAGE STATS
// ══════════════════════════════════════════════════════════

async function updateLandingStats() {
  try {
    const [usersSnap, jobsSnap] = await Promise.all([getDocs(collection(db, "users")), getDocs(collection(db, "jobs"))]);
    let count = 0;
    usersSnap.forEach(d => { if (d.data().role === "freelancer") count++; });
    const el1 = document.getElementById("stat-freelancers");
    const el2 = document.getElementById("stat-jobs");
    if (el1) el1.textContent = count;
    if (el2) el2.textContent = jobsSnap.size;
  } catch (e) { }
}

updateLandingStats();


// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

function getValue(id) { return document.getElementById(id)?.value?.trim() || ""; }
function setValue(id, value) { const el = document.getElementById(id); if (el) el.value = value; }

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 5000);
}

function firebaseErrorMsg(code) {
  return {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait.",
    "auth/network-request-failed": "Network error. Check your connection.",
  }[code] || "Something went wrong. Please try again.";
}



// ══════════════════════════════════════════════════════════
//  CLIENT PROFILE MANAGEMENT
// ══════════════════════════════════════════════════════════

async function loadClientProfile() {
  if (!currentUser || currentRole !== "client") return;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  if (snap.exists()) {
    currentProfile = snap.data();
    displayClientProfile();
  }
}

function displayClientProfile() {
  if (!currentProfile) return;

  setValue("c-name", currentProfile.name || "");
  setValue("c-email", currentProfile.email || "");
  setValue("c-phone", currentProfile.phone || "");
  setValue("c-company", currentProfile.company || "");
  setValue("c-bio", currentProfile.bio || "");
  setValue("c-logo", currentProfile.logo || "");
  setValue("c-type", currentProfile.clientType || "individual");

  updateClientCompletionMeter(currentProfile);
  document.getElementById("delete-client-btn")?.classList.remove("hidden");
}

function updateClientCompletionMeter(profile) {
  if (!profile) return;
  
  const fields = [
    profile.name, profile.email, profile.phone,
    profile.company, profile.bio, profile.clientType
  ];
  const filled = fields.filter(f => f && f !== "").length;
  const pct = Math.round((filled / 6) * 100);
  
  const bar = document.getElementById("client-completion-bar");
  const label = document.getElementById("client-completion-percent");
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
}

// Client Profile Form Submit
document.getElementById("client-profile-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || currentRole !== "client") return;

  const profile = {
    uid: currentUser.uid,
    role: "client",
    name: getValue("c-name"),
    email: getValue("c-email"),
    phone: getValue("c-phone"),
    company: getValue("c-company"),
    bio: getValue("c-bio"),
    logo: getValue("c-logo"),
    clientType: getValue("c-type"),
    updatedAt: serverTimestamp(),
    createdAt: currentProfile?.createdAt || serverTimestamp(),
  };

  if (!profile.name || !profile.email) {
    showToast("Name and Email are required!", "warning");
    return;
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), profile, { merge: true });
    currentProfile = { ...currentProfile, ...profile };
    updateClientCompletionMeter(profile);
    showToast("Client profile saved! ✅", "success");
  } catch (err) {
    showToast("Error saving profile.", "error");
    console.error(err);
  }
});

// Delete Client Account
document.getElementById("delete-client-btn")?.addEventListener("click", async () => {
  if (!confirm("Delete your client account? This cannot be undone. All your jobs will be deleted.")) return;
  
  try {
    // Delete all jobs posted by this client
    const jobsSnap = await getDocs(collection(db, "jobs"));
    jobsSnap.forEach(async (doc) => {
      if (doc.data().postedBy === currentUser.uid) {
        await deleteDoc(doc.ref);
      }
    });
    
    // Delete user profile
    await deleteDoc(doc(db, "users", currentUser.uid));
    await signOut(auth);
    showToast("Account deleted.", "warning");
  } catch (err) {
    showToast("Error deleting account.", "error");
  }
});

// ══════════════════════════════════════════════════════════
//  ADMIN PANEL - Complete Implementation
// ══════════════════════════════════════════════════════════

// Check if current user is admin (you can set this manually in Firestore)
let isAdmin = false;

async function checkAdminStatus() {
  if (!currentUser) return false;
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const userData = userDoc.data();
  isAdmin = userData?.isAdmin === true;
  
  // Show/hide admin nav link
  const adminNavLink = document.getElementById("admin-nav-link");
  if (adminNavLink) {
    adminNavLink.style.display = isAdmin ? "" : "none";
  }
  
  return isAdmin;
}

// Load Admin Dashboard
async function loadAdminPanel() {
  if (!isAdmin) {
    showToast("Access denied. Admin only.", "error");
    showSection("home");
    return;
  }
  
  await loadAdminStats();
  await loadAdminUsers();
  await loadAdminJobs();
  await loadAdminApplications();
  await loadAdminSkills();
  await loadAdminActivity();
  
  setupAdminTabs();
  setupAdminSearch();
}

// Load Admin Stats
async function loadAdminStats() {
  const usersSnap = await getDocs(collection(db, "users"));
  const jobsSnap = await getDocs(collection(db, "jobs"));
  const appsSnap = await getDocs(collection(db, "applications"));
  
  let freelancers = 0, clients = 0;
  usersSnap.forEach(doc => {
    if (doc.data().role === "freelancer") freelancers++;
    if (doc.data().role === "client") clients++;
  });
  
  document.getElementById("admin-total-users").textContent = usersSnap.size;
  document.getElementById("admin-total-jobs").textContent = jobsSnap.size;
  document.getElementById("admin-total-apps").textContent = appsSnap.size;
  document.getElementById("admin-freelancers").textContent = freelancers;
  document.getElementById("admin-clients").textContent = clients;
}

// Load Admin Users
async function loadAdminUsers(searchTerm = "", roleFilter = "all") {
  const usersSnap = await getDocs(collection(db, "users"));
  let users = [];
  usersSnap.forEach(doc => {
    users.push({ ...doc.data(), uid: doc.id });
  });
  
  // Filter
  if (searchTerm) {
    users = users.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  if (roleFilter !== "all") {
    users = users.filter(u => u.role === roleFilter);
  }
  
  const tbody = document.getElementById("admin-users-list");
  tbody.innerHTML = users.map(user => `
    <tr>
      <td><strong>${escapeHtml(user.name || "N/A")}</strong></td>
      <td>${escapeHtml(user.email || "N/A")}</td>
      <td><span class="role-badge-admin ${user.role}">${user.role === "freelancer" ? "🎓 Freelancer" : "💼 Client"}</span></td>
      <td>${user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : "N/A"}</td>
      <td>
        <button class="admin-action-btn delete" onclick="window.deleteUser('${user.uid}')">🗑️ Delete</button>
        ${user.role === "freelancer" ? `<button class="admin-action-btn view" onclick="window.viewProfile('${user.uid}')">👁️ View</button>` : ""}
      </td>
    </tr>
  `).join("");
}

// Load Admin Jobs
async function loadAdminJobs(searchTerm = "") {
  const jobsSnap = await getDocs(collection(db, "jobs"));
  let jobs = [];
  jobsSnap.forEach(doc => {
    jobs.push({ ...doc.data(), jobId: doc.id });
  });
  
  if (searchTerm) {
    jobs = jobs.filter(j => j.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  
  // Get application counts
  const appsSnap = await getDocs(collection(db, "applications"));
  const appCount = {};
  appsSnap.forEach(doc => {
    const jobId = doc.data().jobId;
    appCount[jobId] = (appCount[jobId] || 0) + 1;
  });
  
  const tbody = document.getElementById("admin-jobs-list");
  tbody.innerHTML = jobs.map(job => `
    <tr>
      <td><strong>${escapeHtml(job.title || "N/A")}</strong></td>
      <td>${escapeHtml(job.posterName || "Unknown")}</td>
      <td>${(job.skills || []).slice(0, 2).map(s => `<span class="skill-tag dark" style="font-size:10px">${escapeHtml(s)}</span>`).join("")}</td>
      <td>${appCount[job.jobId] || 0}</td>
      <td>
        <button class="admin-action-btn delete" onclick="window.deleteJob('${job.jobId}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join("");
}

// Load Admin Applications
async function loadAdminApplications() {
  const appsSnap = await getDocs(collection(db, "applications"));
  const jobsSnap = await getDocs(collection(db, "jobs"));
  
  const jobMap = {};
  jobsSnap.forEach(doc => {
    jobMap[doc.id] = doc.data().title;
  });
  
  let apps = [];
  appsSnap.forEach(doc => {
    apps.push({ ...doc.data(), appId: doc.id });
  });
  
  apps.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0));
  
  const tbody = document.getElementById("admin-apps-list");
  tbody.innerHTML = apps.map(app => `
    <tr>
      <td>${escapeHtml(jobMap[app.jobId] || "Deleted Job")}</td>
      <td>${escapeHtml(app.applicantName || "Unknown")}</td>
      <td><span class="status-badge ${app.status || 'pending'}">${app.status || 'pending'}</span></td>
      <td>${app.appliedAt?.toDate ? app.appliedAt.toDate().toLocaleDateString() : "N/A"}</td>
      <td>
        <button class="admin-action-btn delete" onclick="window.deleteApplication('${app.appId}')">🗑️ Delete</button>
      </td>
    </tr>
  `).join("");
}

// Load Admin Skills Analytics
async function loadAdminSkills() {
  const usersSnap = await getDocs(collection(db, "users"));
  const skillCount = {};
  
  usersSnap.forEach(doc => {
    const user = doc.data();
    if (user.role === "freelancer" && user.skills) {
      user.skills.forEach(skill => {
        const key = skill.toLowerCase();
        skillCount[key] = (skillCount[key] || 0) + 1;
      });
    }
  });
  
  const sortedSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCount = sortedSkills[0]?.[1] || 1;
  
  const container = document.getElementById("admin-skills-list");
  container.innerHTML = sortedSkills.map(([skill, count]) => `
    <div class="admin-skill-item">
      <span class="admin-skill-name">${skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
      <div class="admin-skill-bar">
        <div class="admin-skill-fill" style="width: ${(count / maxCount) * 100}%"></div>
      </div>
      <span class="admin-skill-count">${count} freelancers</span>
    </div>
  `).join("");
  
  if (sortedSkills[0]) {
    document.getElementById("admin-top-skill").textContent = sortedSkills[0][0];
  }
}

// Load Admin Activity
async function loadAdminActivity() {
  // Simulated activity log
  const activities = [
    { time: "Just now", text: "New user registered: kartikmore37@trinity.ac.in" },
    { time: "5 min ago", text: "New job posted: Freelance Web Developer" },
    { time: "15 min ago", text: "Application submitted for UI/UX Designer" },
    { time: "1 hour ago", text: "Client accepted freelancer application" },
    { time: "2 hours ago", text: "5 new freelancers joined this week" },
  ];
  
  const container = document.getElementById("admin-activity-log");
  container.innerHTML = activities.map(act => `
    <div class="admin-activity-item">
      <div class="admin-activity-time">${act.time}</div>
      <div class="admin-activity-text">${act.text}</div>
    </div>
  `).join("");
}

// Admin Delete Functions
window.deleteUser = async (uid) => {
  if (!confirm("Delete this user? This cannot be undone!")) return;
  try {
    await deleteDoc(doc(db, "users", uid));
    showToast("User deleted successfully!", "success");
    loadAdminUsers();
    loadAdminStats();
  } catch (err) {
    showToast("Error deleting user", "error");
  }
};

window.deleteJob = async (jobId) => {
  if (!confirm("Delete this job? All applications will also be deleted!")) return;
  try {
    // Delete related applications first
    const appsSnap = await getDocs(collection(db, "applications"));
    appsSnap.forEach(async (doc) => {
      if (doc.data().jobId === jobId) {
        await deleteDoc(doc.ref);
      }
    });
    await deleteDoc(doc(db, "jobs", jobId));
    showToast("Job deleted successfully!", "success");
    loadAdminJobs();
    loadAdminStats();
  } catch (err) {
    showToast("Error deleting job", "error");
  }
};

window.deleteApplication = async (appId) => {
  if (!confirm("Delete this application?")) return;
  try {
    await deleteDoc(doc(db, "applications", appId));
    showToast("Application deleted!", "success");
    loadAdminApplications();
    loadAdminStats();
  } catch (err) {
    showToast("Error deleting application", "error");
  }
};

window.viewProfile = async (uid) => {
  showToast("Feature: View freelancer profile", "info");
};

// Setup Admin Tabs
function setupAdminTabs() {
  const tabs = document.querySelectorAll(".admin-tab-btn");
  tabs.forEach(tab => {
    tab.removeEventListener("click", handleTabClick);
    tab.addEventListener("click", handleTabClick);
  });
}

function handleTabClick(e) {
  const tabName = e.target.dataset.adminTab;
  document.querySelectorAll(".admin-tab-btn").forEach(btn => btn.classList.remove("active"));
  e.target.classList.add("active");
  document.querySelectorAll(".admin-tab-content").forEach(content => content.classList.remove("active"));
  document.getElementById(`admin-${tabName}-tab`).classList.add("active");
}

// Setup Admin Search
function setupAdminSearch() {
  const userSearch = document.getElementById("admin-user-search");
  const userRoleFilter = document.getElementById("admin-user-role-filter");
  const jobSearch = document.getElementById("admin-job-search");
  
  if (userSearch) {
    userSearch.oninput = debounce(() => {
      loadAdminUsers(userSearch.value, userRoleFilter?.value || "all");
    }, 300);
  }
  
  if (userRoleFilter) {
    userRoleFilter.onchange = () => {
      loadAdminUsers(userSearch?.value || "", userRoleFilter.value);
    };
  }
  
  if (jobSearch) {
    jobSearch.oninput = debounce(() => {
      loadAdminJobs(jobSearch.value);
    }, 300);
  }
}


// ══════════════════════════════════════════════════════════
//  PAYMENT SYSTEM - Razorpay Integration
// ══════════════════════════════════════════════════════════

// Razorpay Configuration (Apna TEST Key ID daalo)
const RAZORPAY_KEY_ID = "rzp_test_Snbhn5fiTfvNmb";  // 🔴 Replace with your Razorpay Test Key

// Payment Collections Reference
const paymentsCollection = collection(db, "payments");

// Load Payment Section
async function loadPaymentSection() {
  if (!currentUser) {
    showToast("Please login first", "warning");
    showSection("home");
    return;
  }
  
  await loadFreelancersForPayment();
  await loadJobsForPayment();
  await loadTransactionHistory();
  await loadWalletBalance();
  
  setupPaymentTabs();
  setupPaymentForm();
}

// Load Freelancers for Payment Dropdown
async function loadFreelancersForPayment() {
  const usersSnap = await getDocs(collection(db, "users"));
  const freelancers = [];
  usersSnap.forEach(doc => {
    const user = doc.data();
    if (user.role === "freelancer" && user.name) {
      freelancers.push({ uid: doc.id, name: user.name, email: user.email });
    }
  });
  
  const select = document.getElementById("payment-freelancer");
  if (select) {
    select.innerHTML = '<option value="">Select Freelancer</option>' + 
      freelancers.map(f => `<option value="${f.uid}">${f.name} (${f.email})</option>`).join("");
  }
}

// Load Jobs for Payment Dropdown
async function loadJobsForPayment() {
  const jobsSnap = await getDocs(collection(db, "jobs"));
  const myJobs = [];
  jobsSnap.forEach(doc => {
    const job = doc.data();
    if (job.postedBy === currentUser?.uid) {
      myJobs.push({ id: doc.id, title: job.title });
    }
  });
  
  const select = document.getElementById("payment-job");
  if (select) {
    select.innerHTML = '<option value="">Select Job / Service</option>' + 
      myJobs.map(j => `<option value="${j.id}">${j.title}</option>`).join("");
  }
}

// Setup Payment Tabs
function setupPaymentTabs() {
  const tabs = document.querySelectorAll(".payment-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.paymentTab;
      document.querySelectorAll(".payment-tab-btn").forEach(btn => btn.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".payment-tab-content").forEach(content => content.classList.remove("active"));
      document.getElementById(`payment-${tabName}-tab`).classList.add("active");
    });
  });
}

// Setup Payment Form with Razorpay
function setupPaymentForm() {
  const form = document.getElementById("payment-form");
  if (!form) return;
  
  form.removeEventListener("submit", handlePaymentSubmit);
  form.addEventListener("submit", handlePaymentSubmit);
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  
  const amount = document.getElementById("payment-amount").value;
  const freelancerId = document.getElementById("payment-freelancer").value;
  const jobId = document.getElementById("payment-job").value;
  const note = document.getElementById("payment-note").value;
  
  if (!amount || amount < 100) {
    showToast("Please enter valid amount (min ₹100)", "warning");
    return;
  }
  
  if (!freelancerId) {
    showToast("Please select a freelancer", "warning");
    return;
  }
  
  if (!jobId) {
    showToast("Please select a job", "warning");
    return;
  }
  
  // Get freelancer details
  const freelancerDoc = await getDoc(doc(db, "users", freelancerId));
  const freelancer = freelancerDoc.data();
  
  // Create order in Firestore
  const orderId = `ORDER_${Date.now()}_${currentUser.uid}`;
  const paymentAmount = parseInt(amount);
  
  // Save payment intent
  await setDoc(doc(db, "payments", orderId), {
    orderId: orderId,
    amount: paymentAmount,
    currency: "INR",
    senderId: currentUser.uid,
    senderName: currentProfile?.name || "Client",
    receiverId: freelancerId,
    receiverName: freelancer?.name || "Freelancer",
    jobId: jobId,
    note: note,
    status: "pending",
    razorpayOrderId: null,
    createdAt: serverTimestamp()
  });
  
  // Initialize Razorpay
  const options = {
    key: RAZORPAY_KEY_ID,
    amount: paymentAmount * 100, // Paise me convert
    currency: "INR",
    name: "StudentWork",
    description: `Payment for freelance work`,
    image: "https://studentwork.com/logo.png",
    handler: async function(response) {
      // Payment successful
      await updateDoc(doc(db, "payments", orderId), {
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
        status: "completed",
        completedAt: serverTimestamp()
      });
      
      // Update wallet balance for freelancer
      await updateWalletBalance(freelancerId, paymentAmount, "add");
      
      showToast(`Payment of ₹${paymentAmount} completed successfully! ✅`, "success");
      
      // Refresh transaction history
      await loadTransactionHistory();
      await loadWalletBalance();
      
      // Reset form
      document.getElementById("payment-form").reset();
    },
    prefill: {
      name: currentProfile?.name || "Client",
      email: currentUser.email,
      contact: currentProfile?.contactPhone || ""
    },
    notes: {
      orderId: orderId,
      jobId: jobId,
      freelancerId: freelancerId
    },
    theme: {
      color: "#FF6B35"
    },
    modal: {
      ondismiss: function() {
        showToast("Payment cancelled", "warning");
      }
    }
  };
  
  const razorpay = new Razorpay(options);
  razorpay.open();
}

// Update Wallet Balance
async function updateWalletBalance(userId, amount, action) {
  const walletRef = doc(db, "wallets", userId);
  const walletSnap = await getDoc(walletRef);
  
  let currentBalance = 0;
  if (walletSnap.exists()) {
    currentBalance = walletSnap.data().balance || 0;
  }
  
  const newBalance = action === "add" ? currentBalance + amount : currentBalance - amount;
  
  await setDoc(walletRef, {
    userId: userId,
    balance: newBalance,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

// Load Wallet Balance
async function loadWalletBalance() {
  const walletRef = doc(db, "wallets", currentUser.uid);
  const walletSnap = await getDoc(walletRef);
  
  const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) {
    balanceEl.textContent = `₹${balance.toLocaleString()}`;
  }
}

// Load Transaction History
async function loadTransactionHistory(filter = "all") {
  const paymentsSnap = await getDocs(collection(db, "payments"));
  let transactions = [];
  
  paymentsSnap.forEach(doc => {
    const payment = doc.data();
    // Show transactions where user is sender OR receiver
    if (payment.senderId === currentUser?.uid || payment.receiverId === currentUser?.uid) {
      transactions.push({ ...payment, id: doc.id });
    }
  });
  
  // Sort by date (newest first)
  transactions.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  
  // Apply filter
  if (filter === "sent") {
    transactions = transactions.filter(t => t.senderId === currentUser?.uid);
  } else if (filter === "received") {
    transactions = transactions.filter(t => t.receiverId === currentUser?.uid);
  } else if (filter === "completed") {
    transactions = transactions.filter(t => t.status === "completed");
  } else if (filter === "pending") {
    transactions = transactions.filter(t => t.status === "pending");
  }
  
  const container = document.getElementById("transaction-list");
  if (!container) return;
  
  if (transactions.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions found</div>';
    return;
  }
  
  container.innerHTML = transactions.map(t => {
    const isSent = t.senderId === currentUser?.uid;
    const amount = `₹${t.amount?.toLocaleString()}`;
    const date = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString() : "Recently";
    
    return `
      <div class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-title">
            ${isSent ? `To: ${t.receiverName}` : `From: ${t.senderName}`}
          </div>
          <div class="transaction-details">
            ${date} • ${t.note || "No note"}
          </div>
        </div>
        <div class="transaction-amount ${isSent ? 'sent' : 'received'}">
          ${isSent ? `-${amount}` : `+${amount}`}
        </div>
        <div class="transaction-status ${t.status}">
          ${t.status.toUpperCase()}
        </div>
      </div>
    `;
  }).join("");
  
  // Setup filter listener
  const filterSelect = document.getElementById("history-filter");
  if (filterSelect && !filterSelect.hasListener) {
    filterSelect.hasListener = true;
    filterSelect.addEventListener("change", () => {
      loadTransactionHistory(filterSelect.value);
    });
  }
}

// Withdraw Money
document.getElementById("withdraw-btn")?.addEventListener("click", async () => {
  const walletRef = doc(db, "wallets", currentUser.uid);
  const walletSnap = await getDoc(walletRef);
  const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
  
  if (balance <= 0) {
    showToast("No balance to withdraw", "warning");
    return;
  }
  
  if (confirm(`Withdraw ₹${balance} to your bank account? This is a demo feature.`)) {
    await updateDoc(walletRef, { balance: 0 });
    await loadWalletBalance();
    showToast(`Withdrawal request submitted! (Demo)`, "success");
  }
});

// Add Money
document.getElementById("add-money-btn")?.addEventListener("click", async () => {
  const amount = prompt("Enter amount to add (min ₹100):", "1000");
  if (amount && parseInt(amount) >= 100) {
    await updateWalletBalance(currentUser.uid, parseInt(amount), "add");
    await loadWalletBalance();
    showToast(`₹${amount} added to wallet! ✅`, "success");
  } else {
    showToast("Minimum amount is ₹100", "warning");
  }
});
