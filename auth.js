// ============================================================
//  auth.js
//  PURPOSE: Handles ONLY the landing page and auth form UI.
//
//  What this file does:
//  1. Landing page CTA clicks (Freelancer / Client buttons)
//  2. "Login here" link on landing page
//  3. Back button (auth → landing)
//  4. Auth tab switching (Login ↔ Signup)
//  5. Sets sessionStorage so app.js knows which role was chosen
//
//  What this file does NOT do:
//  - No Firebase calls
//  - No imports from other custom files
//  - No feature logic (profiles, jobs, etc.)
//
//  How it talks to app.js:
//  → Uses sessionStorage.setItem("selectedRole", "freelancer/client")
//  → app.js reads this during signup to save role to Firestore
// ============================================================


// ── Wait for DOM to be ready ──────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  console.log("auth.js loaded - DOM ready");

  // ══════════════════════════════════════════════════════
  //  PART 1: LANDING PAGE — CTA Button Clicks
  //  When user clicks "I'm a Freelancer" or "I'm a Client"
  // ══════════════════════════════════════════════════════

  const freelancerBtn = document.querySelector(".cta-freelancer");
  const clientBtn = document.querySelector(".cta-client");

  console.log("Freelancer button found:", !!freelancerBtn);
  console.log("Client button found:", !!clientBtn);

  if (freelancerBtn) {
    // Remove any existing listeners by cloning
    const newFreelancerBtn = freelancerBtn.cloneNode(true);
    freelancerBtn.parentNode.replaceChild(newFreelancerBtn, freelancerBtn);
    
    newFreelancerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Freelancer button clicked");
      // Save role choice so app.js can read it during signup
      sessionStorage.setItem("selectedRole", "freelancer");
      // Update auth form appearance
      applyAuthTheme("freelancer");
      // Navigate to auth section
      navigateTo("auth");
    });
  }

  if (clientBtn) {
    // Remove any existing listeners by cloning
    const newClientBtn = clientBtn.cloneNode(true);
    clientBtn.parentNode.replaceChild(newClientBtn, clientBtn);
    
    newClientBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Client button clicked");
      sessionStorage.setItem("selectedRole", "client");
      applyAuthTheme("client");
      navigateTo("auth");
    });
  }

  // ══════════════════════════════════════════════════════
  //  PART 2: "Login here" link on landing page
  //  User already has account → show login form directly
  // ══════════════════════════════════════════════════════

  const heroLoginLink = document.getElementById("hero-login-link");
  if (heroLoginLink) {
    // Remove any existing listeners by cloning
    const newLoginLink = heroLoginLink.cloneNode(true);
    heroLoginLink.parentNode.replaceChild(newLoginLink, heroLoginLink);
    
    newLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Login link clicked");
      // Don't pre-select role for login — role comes from Firestore
      applyAuthTheme("login"); // Neutral theme
      navigateTo("auth");
      // Switch to login tab
      switchTab("login");
    });
  }

  // ══════════════════════════════════════════════════════
  //  PART 3: BACK BUTTON — Auth → Landing
  // ══════════════════════════════════════════════════════

  const backBtn = document.getElementById("back-to-landing");
  if (backBtn) {
    // Remove any existing listeners by cloning
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);
    
    newBackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Back button clicked");
      navigateTo("landing");
    });
  }

  // ══════════════════════════════════════════════════════
  //  PART 4: AUTH TABS — Login ↔ Signup switching
  // ══════════════════════════════════════════════════════

  const tabBtns = document.querySelectorAll(".tab-btn");
  console.log("Tab buttons found:", tabBtns.length);
  
  tabBtns.forEach(btn => {
    // Remove any existing listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = newBtn.dataset.tab;
      console.log("Tab clicked:", tab);
      switchTab(tab);
    });
  });

}); // END DOMContentLoaded


// ══════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════

// ── navigateTo ────────────────────────────────────────────
// Shows one section, hides all others.
// Only used for landing ↔ auth navigation.
// App navigation (home, jobs etc.) is handled in app.js.

function navigateTo(sectionName) {
  console.log("Navigating to:", sectionName);
  
  const sections = document.querySelectorAll(".section");
  console.log("Sections found:", sections.length);
  
  sections.forEach(s => {
    s.classList.remove("active");
    s.classList.add("hidden");
  });
  
  const target = document.getElementById(`${sectionName}-section`);
  if (target) {
    console.log("Target section found:", sectionName);
    target.classList.remove("hidden");
    target.classList.add("active");
  } else {
    console.error("Target section not found:", `${sectionName}-section`);
  }
}


// ── switchTab ─────────────────────────────────────────────
// Switches the Login/Signup tab on the auth form.
// tabName = "login" or "signup"

function switchTab(tabName) {
  console.log("Switching to tab:", tabName);
  
  // Update tab button active state
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(b => {
    if (b.dataset.tab === tabName) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  // Show the right form, hide the other
  const forms = document.querySelectorAll(".auth-form");
  forms.forEach(form => {
    form.classList.add("hidden");
    form.classList.remove("active");
  });
  
  const targetForm = document.getElementById(`${tabName}-form`);
  if (targetForm) {
    targetForm.classList.remove("hidden");
    targetForm.classList.add("active");
    console.log("Form shown:", tabName);
  } else {
    console.error("Target form not found:", `${tabName}-form`);
  }
}


// ── applyAuthTheme ────────────────────────────────────────
// Updates the auth form's visual appearance based on role.
// "freelancer" → orange theme, "client" → navy theme, "login" → neutral

function applyAuthTheme(role) {
  console.log("Applying auth theme for role:", role);
  
  const indicator = document.getElementById("auth-role-indicator");
  const title = document.getElementById("auth-title");
  const subtitle = document.getElementById("auth-subtitle");
  const submitBtn = document.getElementById("signup-submit-btn");

  if (!indicator) {
    console.warn("auth-role-indicator element not found");
    return;
  }

  if (role === "freelancer") {
    indicator.className = "auth-role-indicator freelancer";
    indicator.textContent = "🎓 Signing up as a Freelancer";
    if (title) title.textContent = "Join as Freelancer";
    if (subtitle) subtitle.textContent = "Create your profile and get hired by clients";
    if (submitBtn) submitBtn.textContent = "Create Freelancer Account";

  } else if (role === "client") {
    indicator.className = "auth-role-indicator client";
    indicator.textContent = "💼 Signing up as a Client";
    if (title) title.textContent = "Join as Client";
    if (subtitle) subtitle.textContent = "Post jobs and find the right talent";
    if (submitBtn) submitBtn.textContent = "Create Client Account";

  } else {
    // Login — neutral, no role indicator
    indicator.className = "auth-role-indicator";
    indicator.textContent = "👋 Welcome back";
    if (title) title.textContent = "Login to your account";
    if (subtitle) subtitle.textContent = "";
    if (submitBtn) submitBtn.textContent = "Create Account";
  }
}