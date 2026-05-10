// ============================================================
//  components/profileCard.js
//  Builds one freelancer card element.
//  Fixed: added academic badge and proper card structure
// ============================================================

import { sanitize, matchScoreClass } from "../utils.js";

export function createProfileCard(profile, matchScore = 0, isFavorited = false) {

  // ── Avatar ────────────────────────────────────────────
  let avatarHTML;
  if (profile.imageUrl) {
    avatarHTML = `
      <img src="${sanitize(profile.imageUrl)}" alt="${sanitize(profile.name)}" class="avatar"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="avatar-placeholder" style="display:none">${getInitials(profile.name)}</div>`;
  } else {
    avatarHTML = `<div class="avatar-placeholder">${getInitials(profile.name)}</div>`;
  }

  // ── Academic Badge (moved outside the if block) ───────
  const academicBadge = profile.collegeName ?
    `<span style="margin-left: 6px; font-size: 10px; background: var(--primary-light); color: var(--primary); padding: 2px 6px; border-radius: 20px; display: inline-block;">
      🎓 ${sanitize(profile.collegeName.split(' ')[0])}
    </span>` : '';

  // ── Availability badge ────────────────────────────────
  const isAvailable = profile.availability === "available";
  const badgeHTML = `
    <span class="availability-badge ${isAvailable ? "available" : "busy"}">
      ${isAvailable ? "✅ Available" : "🔴 Busy"}
    </span>`;

  // ── Skills (max 4 visible) ────────────────────────────
  const skills = profile.skills || [];
  const visibleSkills = skills.slice(0, 4);
  const extraCount = skills.length - visibleSkills.length;
  const skillsHTML = visibleSkills.length > 0 ?
    visibleSkills.map(s => `<span class="skill-tag dark">${sanitize(s)}</span>`).join("") +
    (extraCount > 0 ? `<span class="skill-tag dark">+${extraCount} more</span>` : "") :
    '<span class="skill-tag dark">No skills listed</span>';

  // ── Match score badge ─────────────────────────────────
  const matchHTML = matchScore > 0
    ? `<span class="match-score ${matchScoreClass(matchScore)}">⚡ ${matchScore}% match</span>`
    : `<span class="match-score low">No active job</span>`;

  // ── Favorite button ───────────────────────────────────
  const favBtn = `
    <button class="btn-icon fav-btn" data-uid="${profile.uid}"
      title="${isFavorited ? "Remove from favorites" : "Add to favorites"}"
      aria-label="Favorite">${isFavorited ? "❤️" : "🤍"}</button>`;

  // ── Academic info text ────────────────────────────────
  const academicInfo = `
    ${profile.course ? `<span style="font-size: 10px; color: var(--text-muted); display: block; margin-top: 4px">📚 ${sanitize(profile.course)}${profile.branch ? ` - ${sanitize(profile.branch)}` : ''}</span>` : ''}
    ${profile.graduationYear ? `<span style="font-size: 10px; color: var(--text-muted); display: block">🎓 Class of ${sanitize(profile.graduationYear)}</span>` : ''}
  `;

  // ── Assemble complete card ────────────────────────────
  const card = document.createElement("div");
  card.className = "card freelancer-card";
  card.dataset.uid = profile.uid;

  card.innerHTML = `
    <div class="card-header">
      ${avatarHTML}
      <div class="card-info">
        <div>
          <p class="card-name">${sanitize(profile.name || "Anonymous")} ${academicBadge}</p>
        </div>
        ${badgeHTML}
        ${academicInfo}
      </div>
    </div>
    
    <p class="card-bio">${sanitize(profile.bio || "No bio provided.")}</p>
    
    <div class="card-skills">
      ${skillsHTML}
    </div>
    
    <div class="card-footer">
      ${matchHTML}
      ${favBtn}
    </div>
  `;

  return card;
}

function getInitials(name = "") {
  if (!name) return "?";
  return name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}