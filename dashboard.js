// ============================================================
//  components/dashboard.js
//  PURPOSE: Renders the Analytics Dashboard section.
//  Shows the user their stats in nice visual cards.
//
//  Exported function:
//    renderDashboard(stats, role)
//      → Inserts dashboard HTML into #dashboard-content
// ============================================================

import { getTrendingSkills } from "../utils.js";

// ── renderDashboard ────────────────────────────────────────
// Builds and inserts the dashboard UI.
//
// Parameters:
//   stats → object containing:
//     {
//       profileViews: number,    → how many times profile was viewed
//       favoritesCount: number,  → how many people saved this user
//       jobsPosted: number,      → how many jobs this user posted
//       completion: number,      → profile completion %
//       allProfiles: array,      → all freelancer profiles (for trending)
//     }
//   role → "freelancer" or "client"

export function renderDashboard(stats = {}, role = "freelancer") {
  const container = document.getElementById("dashboard-content");
  if (!container) return;

  const {
    profileViews   = 0,
    favoritesCount = 0,
    jobsPosted     = 0,
    completion     = 0,
    allProfiles    = [],
  } = stats;

  // ── Trending skills chart ─────────────────────────────
  const trending = getTrendingSkills(allProfiles, 5);
  const maxCount = trending[0]?.count || 1; // For normalizing bar widths

  const trendingHTML = trending.length > 0
    ? trending.map((item, index) => {
        const barWidth = Math.round((item.count / maxCount) * 100);
        const medal    = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
        return `
          <div class="trend-row">
            <span class="trend-medal">${medal}</span>
            <span class="trend-label">${item.name}</span>
            <div class="trend-bar-track">
              <div class="trend-bar-fill" style="width: ${barWidth}%"></div>
            </div>
            <span class="trend-count">${item.count}</span>
          </div>`;
      }).join("")
    : `<p style="color:var(--text-muted);font-size:13px">
         No data yet. Profiles need to be created first.
       </p>`;

  // ── Stat cards (different for freelancer vs client) ───
  const freelancerStats = `
    <div class="stat-card">
      <span class="stat-icon">👁️</span>
      <div class="stat-value">${profileViews}</div>
      <div class="stat-label">Profile Views</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">❤️</span>
      <div class="stat-value">${favoritesCount}</div>
      <div class="stat-label">Times Saved</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">📋</span>
      <div class="stat-value">${completion}%</div>
      <div class="stat-label">Profile Complete</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">🎓</span>
      <div class="stat-value">${allProfiles.length}</div>
      <div class="stat-label">Freelancers on Platform</div>
    </div>
  `;

  const clientStats = `
    <div class="stat-card">
      <span class="stat-icon">📋</span>
      <div class="stat-value">${jobsPosted}</div>
      <div class="stat-label">Jobs Posted</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">❤️</span>
      <div class="stat-value">${favoritesCount}</div>
      <div class="stat-label">Saved Freelancers</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">🎓</span>
      <div class="stat-value">${allProfiles.length}</div>
      <div class="stat-label">Available Freelancers</div>
    </div>
    <div class="stat-card">
      <span class="stat-icon">🔍</span>
      <div class="stat-value">${trending[0]?.name || "—"}</div>
      <div class="stat-label">Top Skill Right Now</div>
    </div>
  `;

  // ── Profile completion bar (freelancer only) ──────────
  const completionBarHTML = role === "freelancer" ? `
    <div class="dashboard-card">
      <h3 style="margin-bottom:var(--space-md)">📊 Profile Strength</h3>
      <div style="display:flex;align-items:center;gap:var(--space-md)">
        <div class="progress-bar-track" style="flex:1">
          <div class="progress-bar-fill" style="width:${completion}%"></div>
        </div>
        <span style="font-family:var(--font-heading);font-weight:700;color:var(--primary);font-size:20px">
          ${completion}%
        </span>
      </div>
      ${completion < 100
        ? `<p style="font-size:12px;color:var(--text-muted);margin-top:var(--space-sm)">
             💡 Complete your profile to get more clients!
           </p>`
        : `<p style="font-size:12px;color:var(--success);margin-top:var(--space-sm)">
             ✅ Your profile is 100% complete!
           </p>`
      }
    </div>
  ` : "";

  // ── Put it all together ───────────────────────────────
  container.innerHTML = `

    <div class="dashboard-grid" style="margin-bottom:var(--space-xl)">
      ${role === "freelancer" ? freelancerStats : clientStats}
    </div>

    ${completionBarHTML}

    <div class="dashboard-card">
      <h3 style="margin-bottom:var(--space-lg)">🔥 Trending Skills on Platform</h3>
      <div class="trending-chart">
        ${trendingHTML}
      </div>
    </div>

    <div class="dashboard-card" style="margin-top:var(--space-lg)">
      <h3 style="margin-bottom:var(--space-md)">💡 Tips for You</h3>
      ${getTips(role, completion)}
    </div>
  `;

  // Inject dashboard-specific CSS if not already present
  injectDashboardStyles();
}


// ── getTips ───────────────────────────────────────────────
// Returns personalized tips based on role and completion %.

function getTips(role, completion) {
  const tips = [];

  if (role === "freelancer") {
    if (completion < 50)  tips.push("📸 Add a profile photo — profiles with photos get 3x more views.");
    if (completion < 70)  tips.push("✍️ Write a bio that describes what you do and who you help.");
    if (completion < 90)  tips.push("🛠️ Add at least 3–5 skills to match more job listings.");
    if (completion === 100) tips.push("🌟 Your profile is complete — you'll appear in more searches!");
    tips.push("🔄 Set your availability to 'Available' when you're open for work.");
  } else {
    tips.push("📋 Post a job with clear required skills to get better freelancer matches.");
    tips.push("❤️ Save freelancers you like — your favorites are stored in your account.");
    tips.push("🔍 Search by specific skills like 'Python' or 'Logo Design' for best results.");
  }

  return tips
    .map(tip => `<p style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--space-sm)">${tip}</p>`)
    .join("");
}


// ── injectDashboardStyles ─────────────────────────────────
// Adds dashboard-specific CSS rules once into the page.
// We check if they already exist to avoid duplicates.

function injectDashboardStyles() {
  if (document.getElementById("dashboard-styles")) return; // Already injected

  const style = document.createElement("style");
  style.id = "dashboard-styles";
  style.textContent = `
    /* Card wrapper for dashboard sections */
    .dashboard-card {
      background: var(--bg-card);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-lg);
      box-shadow: var(--shadow-sm);
      margin-bottom: var(--space-lg);
    }

    /* Trending skills chart rows */
    .trending-chart { display: flex; flex-direction: column; gap: 12px; }

    .trend-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .trend-medal { font-size: 16px; width: 24px; text-align: center; }
    .trend-label {
      font-size: 13px;
      font-weight: 600;
      width: 110px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trend-bar-track {
      flex: 1;
      height: 8px;
      background: var(--bg-input);
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    .trend-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), #FF9A76);
      border-radius: 8px;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .trend-count {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      width: 20px;
      text-align: right;
    }
  `;
  document.head.appendChild(style);
}


// Add to your dashboard.js
function addCollectiveInsightWidget() {
    const insights = [
        { insight: "Python + SQL = 67% higher earnings", trend: "up" },
        { insight: "React.js demand up 23% this month", trend: "up" },
        { insight: "Remote jobs now 78% of all postings", trend: "stable" }
    ];
    
    const widget = document.createElement("div");
    widget.className = "dashboard-card";
    widget.innerHTML = `
        <h3>🧠 Collective Intelligence</h3>
        <div class="insight-ticker">
            ${insights.map(i => `
                <div class="insight-item">
                    <span class="insight-text">${i.insight}</span>
                    <span class="insight-trend ${i.trend}">${i.trend === 'up' ? '📈' : '📉'}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById("dashboard-content")?.prepend(widget);
}