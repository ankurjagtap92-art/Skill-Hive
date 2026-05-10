// ============================================================
//  components/modal.js
//  PURPOSE: Controls the freelancer detail popup modal.
//
//  Exported functions:
//    openModal(profile, isFavorited, onFavToggle)
//      → Fills the modal with the freelancer's full info and shows it
//
//    closeModal()
//      → Hides the modal
// ============================================================

import { sanitize, formatDate } from "../utils.js";

// ── openModal ──────────────────────────────────────────────
// Populates and shows the modal with a freelancer's full profile.
//
// Parameters:
//   profile      → the Firestore profile object
//   isFavorited  → boolean — is this person in user's favorites?
//   onFavToggle  → callback function called when ❤️ is clicked

export function openModal(profile, isFavorited = false, onFavToggle = null) {
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("modal-content");
  if (!overlay || !content) return;

  // ── Build avatar HTML ─────────────────────────────────
  const avatarHTML = profile.imageUrl
    ? `<img src="${sanitize(profile.imageUrl)}" class="modal-avatar" alt="${sanitize(profile.name)}"
         onerror="this.outerHTML='<div class=modal-avatar-placeholder>${getInitials(profile.name)}</div>'">`
    : `<div class="modal-avatar-placeholder">${getInitials(profile.name)}</div>`;

  // ── Availability ──────────────────────────────────────
  const isAvailable = profile.availability === "available";
  const badgeHTML = `
    <span class="availability-badge ${isAvailable ? "available" : "busy"}">
      ${isAvailable ? "✅ Available for work" : "🔴 Currently Busy"}
    </span>`;

  // ── Skills list ───────────────────────────────────────
  const skillsHTML = (profile.skills || [])
    .map(s => `<span class="skill-tag">${sanitize(s)}</span>`)
    .join("") || "<p style='color:var(--text-muted);font-size:13px'>No skills listed.</p>";

  // ── Contact buttons ───────────────────────────────────
  let contactHTML = "";

  if (profile.contactPhone) {
    // WhatsApp link: wa.me/<phone number>
    const phone = sanitize(profile.contactPhone.replace(/\s+/g, ""));
    contactHTML += `
      <a href="https://wa.me/${phone}" target="_blank" class="contact-btn whatsapp">
        💬 WhatsApp
      </a>`;
  }

  if (profile.contactEmail) {
    contactHTML += `
      <a href="mailto:${sanitize(profile.contactEmail)}" class="contact-btn email">
        ✉️ Send Email
      </a>`;
  }

  // Copy contact info button
  const copyText = [profile.contactEmail, profile.contactPhone].filter(Boolean).join(" | ");
  if (copyText) {
    contactHTML += `
      <button class="contact-btn" id="modal-copy-btn" data-copy="${sanitize(copyText)}">
        📋 Copy Info
      </button>`;
  }

  // ── Favorite button ───────────────────────────────────
  const favLabel = isFavorited ? "❤️ Saved" : "🤍 Save";
  const favHTML = `
    <button class="btn-outline" id="modal-fav-btn" data-uid="${profile.uid}">
      ${favLabel}
    </button>`;

  // ── Joined date ───────────────────────────────────────
  const joinedHTML = profile.createdAt
    ? `<p style="font-size:12px;color:var(--text-muted);margin-top:var(--space-md)">
        🗓️ Joined ${formatDate(profile.createdAt)}
       </p>`
    : "";

  // ── Inject everything into modal ──────────────────────
  content.innerHTML = `
    <div class="modal-profile-header">
      ${avatarHTML}
      <div>
        <h2 class="modal-name">${sanitize(profile.name || "Anonymous")}</h2>
        ${badgeHTML}
        <div style="margin-top:var(--space-sm)">${favHTML}</div>
      </div>
    </div>

    <p class="modal-section-title">About</p>
    <p class="modal-bio">${sanitize(profile.bio || "This freelancer hasn't added a bio yet.")}</p>

    <p class="modal-section-title">Skills</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${skillsHTML}
    </div>

    <p class="modal-section-title">Contact</p>
    <div class="contact-buttons">
      ${contactHTML || '<p style="color:var(--text-muted);font-size:13px">No contact info provided.</p>'}
    </div>

    ${joinedHTML}
  `;

  // ── Show the modal ────────────────────────────────────
  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // Prevent page scrolling while modal is open

  // ── Wire up: Copy button ──────────────────────────────
  const copyBtn = document.getElementById("modal-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const textToCopy = copyBtn.dataset.copy;
      // navigator.clipboard requires HTTPS or localhost
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => (copyBtn.textContent = "📋 Copy Info"), 2000);
      }).catch(() => {
        // Fallback for non-HTTPS environments (e.g. file://)
        copyBtn.textContent = "⚠️ Copy failed";
      });
    });
  }

  // ── Wire up: Favorite button ──────────────────────────
  const favBtn = document.getElementById("modal-fav-btn");
  if (favBtn && onFavToggle) {
    favBtn.addEventListener("click", async () => {
      await onFavToggle(profile.uid);
      // Toggle button appearance immediately (optimistic update)
      const isNowFav = favBtn.textContent.includes("🤍");
      favBtn.textContent = isNowFav ? "❤️ Saved" : "🤍 Save";
    });
  }
}


// ── closeModal ─────────────────────────────────────────────
// Hides the modal and re-enables page scrolling.

export function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.classList.add("hidden");
  document.body.style.overflow = ""; // Restore scrolling
}


// ── HELPER: Get initials ───────────────────────────────────
function getInitials(name = "") {
  return name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}


// ── Wire up the close button ───────────────────────────────
// We do this once when the module loads.
// document.addEventListener fires when DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("modal-close-btn");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Also close if user clicks the dark overlay OUTSIDE the modal box
  const overlay = document.getElementById("modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      // e.target = what was clicked
      // Only close if they clicked the overlay itself, not the box inside it
      if (e.target === overlay) closeModal();
    });
  }
});