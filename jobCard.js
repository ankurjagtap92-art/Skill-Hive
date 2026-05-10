// ============================================================
//  components/jobCard.js
//  Builds one job card DOM element for freelancers to browse.
//
//  IMPORT PATH NOTE:
//  This file is inside components/ folder.
//  utils.js is at the ROOT → import from "../utils.js"
// ============================================================

import { calcSkillMatch } from "../utils.js";

/**
 * createJobCard(job, freelancerSkills, hasApplied, onApply)
 *
 * @param {Object}   job              — Firestore job document data
 * @param {Array}    freelancerSkills — logged-in freelancer's skills
 * @param {boolean}  hasApplied       — has this user already applied?
 * @param {Function} onApply          — callback(jobId, jobTitle, btn) on Apply click
 * @returns {HTMLElement}
 */
export function createJobCard(job, freelancerSkills = [], hasApplied = false, onApply = () => {}) {

  // ── Calculate skill match ─────────────────────────────
  // job.skills is an array e.g. ["Python", "SQL"]
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  const matchPct  = calcSkillMatch(freelancerSkills, jobSkills);

  // ── Match badge style ─────────────────────────────────
  let matchClass = "low";
  let matchLabel = "No match data";
  if (freelancerSkills.length === 0) {
    matchLabel = "Add skills to match";
  } else if (jobSkills.length === 0) {
    matchLabel = "No skills listed";
  } else if (matchPct >= 70) {
    matchClass = "";       // green (default .match-score)
    matchLabel = `⚡ ${matchPct}% Match`;
  } else if (matchPct >= 40) {
    matchClass = "medium"; // yellow
    matchLabel = `⚡ ${matchPct}% Match`;
  } else {
    matchClass = "low";    // grey
    matchLabel = `${matchPct}% Match`;
  }

  // ── Format posted date ────────────────────────────────
  let postedDate = "Recently";
  if (job.createdAt?.toDate) {
    postedDate = job.createdAt.toDate().toLocaleDateString("en-IN", {
      day: "numeric", month: "short"
    });
  }

  // ── Skill tags HTML ───────────────────────────────────
  const skillTagsHTML = jobSkills.length
    ? jobSkills.map(s => `<span class="skill-tag dark">${escHtml(s)}</span>`).join("")
    : `<span class="skill-tag dark" style="opacity:0.5">No skills specified</span>`;

  // ── Build the card element ────────────────────────────
  const card       = document.createElement("div");
  card.className   = "card job-card";
  card.dataset.jobId = job.id;

  card.innerHTML = `
    <div class="jc-header">
      <div class="jc-icon">💼</div>
      <div class="jc-title-wrap">
        <h3 class="jc-title">${escHtml(job.title || "Untitled Job")}</h3>
        <span class="jc-meta">
          ${postedDate} · by ${escHtml(job.posterName || "A Client")}
        </span>
      </div>
      <span class="match-score ${matchClass}" style="white-space:nowrap;flex-shrink:0">
        ${matchLabel}
      </span>
    </div>

    <p class="jc-description">${escHtml(job.description || "No description provided.")}</p>

    <div class="jc-skills-row">
      <span class="jc-skills-label">NEEDS</span>
      <div class="jc-skills">${skillTagsHTML}</div>
    </div>

    <div class="jc-footer">
      ${job.budget
        ? `<span class="jc-budget">💰 ₹${escHtml(String(job.budget))}</span>`
        : `<span style="opacity:0.4;font-size:13px">Budget not listed</span>`}

      <button
        class="jc-apply-btn btn-primary ${hasApplied ? "applied" : ""}"
        data-job-id="${job.id}"
        ${hasApplied ? "disabled" : ""}
        style="width:auto;padding:8px 20px;font-size:13px"
      >
        ${hasApplied ? "✓ Applied" : "Apply Now"}
      </button>
    </div>
  `;

  // ── Wire apply button ─────────────────────────────────
  const applyBtn = card.querySelector(".jc-apply-btn");
  if (!hasApplied && applyBtn) {
    applyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onApply(job.id, job.title || "this job", applyBtn);
    });
  }

  return card;
}


// ── Escape HTML ───────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}