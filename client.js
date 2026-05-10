// ============================================================
//  client.js  — All Client-specific logic
//
//  Exported functions:
//    initClientView(user, profile, db, helpers)
//      → Called by app.js when a client loads the home section
//      → Loads freelancer profiles and shows profile cards
// ============================================================

import { db } from "./firebase.js";

import {
  collection, getDocs, doc, updateDoc, increment,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { showToast, calcSkillMatch } from "./utils.js";
import { createProfileCard }         from "./components/profileCard.js";
import { openModal }                 from "./components/modal.js";


// ── State ───────────────────────────────────────────────────
let _user        = null;
let _profile     = null;
let _favorites   = [];
let _allProfiles = [];
let _jobSkills   = [];
let _toggleFavoriteCallback = null;


// ══════════════════════════════════════════════════════════
//  MAIN: initClientView
//  Called by app.js every time client visits home section
// ══════════════════════════════════════════════════════════

export async function initClientView(user, profile, favorites, jobSkills, onFavToggle) {
  console.log("initClientView called with:", { user: user?.uid, profileExists: !!profile, favoritesLength: favorites?.length });
  
  _user      = user;
  _profile   = profile;
  _favorites = favorites || [];
  _jobSkills = jobSkills || [];
  _toggleFavoriteCallback = onFavToggle;

  // Show trending section for clients
  const trendingSection = document.getElementById("trending-section");
  if (trendingSection) {
    trendingSection.style.display = "block";
  }

  // Show availability filter for clients
  const filterEl = document.getElementById("filter-availability");
  if (filterEl) {
    filterEl.style.display = "block";
    filterEl.style.width = "auto";
    filterEl.style.minWidth = "160px";
  }

  // Load and render freelancers
  await loadAndRenderFreelancers();

  // Wire search button
  const searchBtn   = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");

  if (searchBtn) {
    // Remove old listeners by cloning
    const newBtn = searchBtn.cloneNode(true);
    searchBtn.parentNode.replaceChild(newBtn, searchBtn);
    
    newBtn.addEventListener("click", () => {
      const query = searchInput?.value?.trim() || "";
      const availability = filterEl?.value || "all";
      loadAndRenderFreelancers(query, availability);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const searchBtnEl = document.getElementById("search-btn");
        if (searchBtnEl) searchBtnEl.click();
      }
    });
  }
  
  // Also trigger search when filter changes
  if (filterEl) {
    filterEl.addEventListener("change", () => {
      const query = searchInput?.value?.trim() || "";
      const availability = filterEl.value;
      loadAndRenderFreelancers(query, availability);
    });
  }
}


// ══════════════════════════════════════════════════════════
//  LOAD & RENDER FREELANCERS
// ══════════════════════════════════════════════════════════

async function loadAndRenderFreelancers(searchQuery = "", availability = "all") {
  const grid = document.getElementById("freelancers-grid");
  if (!grid) {
    console.error("freelancers-grid element not found!");
    return;
  }

  grid.innerHTML = `
    <div class="empty-state">
      <div class="loader-ring"></div>
      <p>Loading freelancers...</p>
    </div>`;

  try {
    console.log("Fetching users from Firestore...");
    const snap = await getDocs(collection(db, "users"));
    console.log(`Got ${snap.size} users from Firestore`);
    
    _allProfiles = [];
    snap.forEach(d => {
      const data = d.data();
      const docId = d.id;
      console.log("User:", data.name, "Role:", data.role);
      if (data.name && data.role === "freelancer") {
        _allProfiles.push({ ...data, uid: docId });
      }
    });
    
    console.log(`Found ${_allProfiles.length} freelancers`);

    let filtered = [..._allProfiles];

    // Filter by availability
    if (availability !== "all") {
      filtered = filtered.filter(p => p.availability === availability);
      console.log(`After availability filter (${availability}): ${filtered.length}`);
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        (p.skills || []).some(s => s.toLowerCase().includes(q)) ||
        p.bio?.toLowerCase().includes(q)
      );
      console.log(`After search filter ("${searchQuery}"): ${filtered.length}`);
    }

    // Don't show the client their own profile
    if (_user?.uid) {
      const beforeLength = filtered.length;
      filtered = filtered.filter(p => p.uid !== _user.uid);
      if (beforeLength !== filtered.length) {
        console.log(`Removed client's own profile`);
      }
    }

    grid.innerHTML = "";

    if (!filtered.length) {
      const message = _allProfiles.length === 0 
        ? "No freelancers have signed up yet. Be the first freelancer to join!" 
        : "No freelancers match your search criteria.";
      
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No freelancers found</h3>
          <p>${message}</p>
          ${_allProfiles.length > 0 ? `<p style="margin-top:12px;font-size:12px;color:var(--text-muted)">Total freelancers on platform: ${_allProfiles.length}</p>` : ""}
          <button class="btn-outline reset-search-btn" style="margin-top:16px">⟳ Clear Filters</button>
        </div>`;
      
      const resetBtn = grid.querySelector(".reset-search-btn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const searchInput = document.getElementById("search-input");
          const filterEl = document.getElementById("filter-availability");
          if (searchInput) searchInput.value = "";
          if (filterEl) filterEl.value = "all";
          loadAndRenderFreelancers("", "all");
        });
      }
      return;
    }

    // Render each freelancer card
    filtered.forEach(profile => {
      const matchScore  = _jobSkills.length ? calcSkillMatch(profile.skills, _jobSkills) : 0;
      const isFavorited = _favorites.includes(profile.uid);
      const card        = createProfileCard(profile, matchScore, isFavorited);
      grid.appendChild(card);
    });

    // Attach click handlers using event delegation
    attachCardHandlers(grid);

    // Update trending skills
    renderTrendingSkills(_allProfiles);

  } catch (err) {
    console.error("Error loading freelancers:", err);
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error Loading Profiles</h3>
        <p>${err.message || "Check your connection and try again."}</p>
        <button class="btn-outline retry-load-btn" style="margin-top:16px">⟳ Retry</button>
      </div>`;
    
    const retryBtn = grid.querySelector(".retry-load-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        loadAndRenderFreelancers(searchQuery, availability);
      });
    }
  }
}

// ── Attach event handlers to cards using event delegation ──
function attachCardHandlers(grid) {
  // Remove existing listener to avoid duplicates
  grid.removeEventListener("click", gridClickHandler);
  grid.addEventListener("click", gridClickHandler);
}

async function gridClickHandler(e) {
  // Handle favorite button click
  const favBtn = e.target.closest(".fav-btn");
  if (favBtn) {
    e.stopPropagation();
    const uid = favBtn.dataset.uid;
    if (_toggleFavoriteCallback) {
      await _toggleFavoriteCallback(uid);
      // Update the favorites array locally
      if (_favorites.includes(uid)) {
        _favorites = _favorites.filter(id => id !== uid);
        favBtn.textContent = "🤍";
        favBtn.title = "Add to favorites";
      } else {
        _favorites.push(uid);
        favBtn.textContent = "❤️";
        favBtn.title = "Remove from favorites";
      }
    }
    return;
  }

  // Handle card click to open modal
  const card = e.target.closest(".freelancer-card");
  if (!card) return;
  
  const uid = card.dataset.uid;
  const profile = _allProfiles.find(p => p.uid === uid);
  if (!profile) return;

  // Increment profile view count in background
  try {
    await updateDoc(doc(db, "users", uid), { profileViews: increment(1) });
  } catch (err) {
    console.warn("Could not increment profile views:", err);
  }

  // Open modal with freelancer details
  openModal(profile, _favorites.includes(profile.uid), _toggleFavoriteCallback);
}


// ══════════════════════════════════════════════════════════
//  TRENDING SKILLS (inline pills for client browse view)
// ══════════════════════════════════════════════════════════

function renderTrendingSkills(profiles) {
  const container = document.getElementById("trending-skills-container");
  if (!container) return;

  // Count skill frequencies
  const skillCount = {};
  profiles.forEach(profile => {
    (profile.skills || []).forEach(skill => {
      const key = skill.toLowerCase().trim();
      skillCount[key] = (skillCount[key] || 0) + 1;
    });
  });

  // Get top 5 skills
  const topSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topSkills.length === 0) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:12px">No skills data yet</span>';
    return;
  }

  container.innerHTML = topSkills.map(([skill, count]) => `
    <span class="skill-tag" data-skill="${skill}" style="cursor:pointer">
      ${skill.charAt(0).toUpperCase() + skill.slice(1)}
      <small style="opacity:0.6;font-size:10px">${count}</small>
    </span>
  `).join("");

  // Add click handlers to skill tags for quick search
  container.querySelectorAll(".skill-tag").forEach(tag => {
    tag.addEventListener("click", () => {
      const searchInput = document.getElementById("search-input");
      if (searchInput) {
        searchInput.value = tag.dataset.skill;
        const searchBtn = document.getElementById("search-btn");
        if (searchBtn) searchBtn.click();
      }
    });
  });
}