// ============================================================
//  utils.js
//  PURPOSE: Pure helper functions that do ONE specific job.
//  No Firebase here. No DOM manipulation here.
//  Just math, logic, and reusable UI helpers.
//
//  Functions in this file:
//    - showToast()         → pop-up notification
//    - calcSkillMatch()    → skill match percentage
//    - calcCompletion()    → profile completion %
//    - getTrendingSkills() → top 5 skills across all profiles
//    - formatDate()        → convert timestamp to readable date
//    - debounce()          → delay function (for search input)
//    - sanitize()          → clean user text input
// ============================================================


// ── 1. TOAST NOTIFICATION ──────────────────────────────────
// Shows a small popup at the bottom of the screen for 3 seconds.
//
// Usage:
//   showToast("Profile saved! ✅")
//   showToast("Something went wrong", "error")
//   showToast("You have new matches", "warning")

export function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return; // Safety check: if element doesn't exist, stop

  // Set the message text
  toast.textContent = message;

  // Reset any previous type classes first
  toast.classList.remove("success", "error", "warning");

  // Add the right color class based on type
  if (type !== "default") {
    toast.classList.add(type); // "success" = green, "error" = red
  }

  // Show the toast (CSS .show class triggers the animation)
  toast.classList.remove("hidden");
  toast.classList.add("show");

  // Hide it automatically after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    // Wait for fade-out animation to finish, then fully hide
    setTimeout(() => toast.classList.add("hidden"), 300);
  }, 3000);
}


// ── 2. SKILL MATCH CALCULATOR ─────────────────────────────
// Compares a freelancer's skills against a job's required skills.
// Returns a percentage (0–100) showing how well they match.
//
// Example:
//   Job needs:       ["Python", "SQL", "Excel"]
//   Freelancer has:  ["Python", "SQL", "React"]
//   Matched:         ["Python", "SQL"] = 2 out of 3 = 67%
//
// Parameters:
//   freelancerSkills → array of strings e.g. ["Python", "SQL"]
//   jobSkills        → array of strings e.g. ["Python", "Excel"]

export function calcSkillMatch(freelancerSkills = [], jobSkills = []) {
  // If there are no job skills to compare against, return 0
  if (!jobSkills || jobSkills.length === 0) return 0;
  // If freelancer has no skills listed, return 0
  if (!freelancerSkills || freelancerSkills.length === 0) return 0;

  // Normalize: lowercase and trim all skills so "Python" = "python" = " python "
  const normalize = (skill) => skill.toLowerCase().trim();
  const normalizedJob         = jobSkills.map(normalize);
  const normalizedFreelancer  = freelancerSkills.map(normalize);

  // Count how many job skills the freelancer actually has
  let matchCount = 0;
  for (const skill of normalizedJob) {
    if (normalizedFreelancer.includes(skill)) {
      matchCount++;
    }
  }

  // Calculate percentage and round to nearest whole number
  const percentage = Math.round((matchCount / normalizedJob.length) * 100);
  return percentage;
}


// ── 3. PROFILE COMPLETION CALCULATOR ──────────────────────
// Checks how complete a user's profile is.
// Each field is worth equal points. Returns 0–100.
//
// Example:
//   Profile has name, bio, skills, email filled → 4 out of 7 = 57%

export function calcCompletion(profile) {
  if (!profile) return 0;

  const checks = [
    { key: "name", value: profile.name },
    { key: "bio", value: profile.bio },
    { key: "skills", value: profile.skills && profile.skills.length > 0 },
    { key: "contactEmail", value: profile.contactEmail },
    { key: "contactPhone", value: profile.contactPhone },
    { key: "imageUrl", value: profile.imageUrl },
    { key: "availability", value: profile.availability },
    // NEW: Academic checks (only count if they have values)
    { key: "collegeName", value: profile.collegeName, weight: 2 },
    { key: "graduationYear", value: profile.graduationYear, weight: 1.5 },
    { key: "course", value: profile.course, weight: 1.5 },
  ];

  let totalWeight = 0;
  let filledWeight = 0;
  
  checks.forEach(check => {
    const weight = check.weight || 1;
    totalWeight += weight;
    if (check.value) filledWeight += weight;
  });

  return Math.round((filledWeight / totalWeight) * 100);
}


// ── 4. TRENDING SKILLS ─────────────────────────────────────
// Given an array of ALL freelancer profiles,
// count how often each skill appears and return the top 5.
//
// Example input: profiles = [
//   { skills: ["Python", "SQL"] },
//   { skills: ["Python", "React"] },
//   { skills: ["Python", "SQL", "React"] }
// ]
// Result: ["Python (3)", "SQL (2)", "React (2)"]

export function getTrendingSkills(profiles = [], topN = 5) {
  // This object will track how many times each skill appears
  // e.g. { "python": 3, "sql": 2 }
  const skillCount = {};

  // Loop through every profile
  for (const profile of profiles) {
    // Each profile has an array of skills
    if (!profile.skills || !Array.isArray(profile.skills)) continue;

    for (const skill of profile.skills) {
      // Normalize to lowercase for consistent counting
      const normalized = skill.toLowerCase().trim();
      // If this skill already exists in our counter, add 1
      // Otherwise start it at 1
      skillCount[normalized] = (skillCount[normalized] || 0) + 1;
    }
  }

  // Convert the object to an array so we can sort it
  // Object.entries({ python: 3, sql: 2 }) → [["python", 3], ["sql", 2]]
  const sorted = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])   // Sort by count (highest first)
    .slice(0, topN);                // Take only the top N

  // Return just the skill names (capitalize first letter for display)
  return sorted.map(([skill, count]) => ({
    name: skill.charAt(0).toUpperCase() + skill.slice(1),
    count
  }));
}


// ── 5. FORMAT DATE ─────────────────────────────────────────
// Converts a Firestore timestamp (or JS Date) to a readable string.
// e.g. → "May 2, 2025"

export function formatDate(timestamp) {
  if (!timestamp) return "";

  // Firestore timestamps have a .toDate() method
  // Regular JS dates don't — handle both
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  return date.toLocaleDateString("en-IN", {
    year:  "numeric",
    month: "short",
    day:   "numeric"
  });
}


// ── 6. DEBOUNCE ────────────────────────────────────────────
// Prevents a function from running TOO many times in a row.
// Useful for search: wait until user stops typing, THEN search.
//
// Example: user types "P", "Py", "Pyt", "Pyth"...
// Without debounce: fires 4 Firestore reads
// With debounce(300ms): waits 300ms after last keystroke, fires ONCE
//
// Usage:
//   const debouncedSearch = debounce(handleSearch, 300);
//   searchInput.addEventListener("input", debouncedSearch);

export function debounce(fn, delay = 300) {
  let timer; // Holds the timeout reference
  return function (...args) {
    clearTimeout(timer);           // Cancel the previous pending call
    timer = setTimeout(() => {
      fn.apply(this, args);        // Call the function after the delay
    }, delay);
  };
}


// ── 7. SANITIZE TEXT ──────────────────────────────────────
// Strips dangerous HTML characters from user input.
// Prevents XSS (Cross-Site Scripting) attacks.
// e.g. "<script>alert('hack')</script>" → safe text

export function sanitize(str = "") {
  const div = document.createElement("div");
  div.textContent = str;        // textContent auto-escapes HTML
  return div.innerHTML;         // Return the escaped version
}


// ── 8. SKILL MATCH COLOR ──────────────────────────────────
// Returns a CSS class name based on match score.
// Used to color the match badge on profile cards.
//   80–100% → green  (high)
//   50–79%  → yellow (medium)
//   0–49%   → grey   (low)

export function matchScoreClass(score) {
  if (score >= 80) return "";           // Default = green
  if (score >= 50) return "medium";     // Yellow
  return "low";                         // Grey
}


// ── 9. COMMON SKILL SUGGESTIONS (for Autocomplete) ────────
// A curated list of popular skills for the autocomplete dropdown.
// When user types "py", we show "Python" as a suggestion.

export const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "HTML", "CSS", "React", "Vue", "Angular",
  "Node.js", "SQL", "MongoDB", "Firebase", "PHP", "Java", "C++", "C",
  "Graphic Design", "Logo Design", "UI/UX Design", "Figma", "Adobe XD",
  "Photoshop", "Illustrator", "Video Editing", "Premiere Pro", "After Effects",
  "Content Writing", "Copywriting", "SEO", "Social Media Marketing",
  "Data Analysis", "Excel", "Power BI", "Tableau", "Machine Learning",
  "Deep Learning", "Django", "Flask", "Spring Boot", "Android", "iOS",
  "Flutter", "React Native", "WordPress", "Shopify", "Canva",
  "Photography", "3D Modeling", "Blender", "AutoCAD", "Tally",
  "Accounting", "Finance", "Translation", "Voice Over", "Music Production"
];