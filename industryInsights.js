// ============================================================
//  components/industryInsights.js — INDUSTRY INSIGHTS PANEL
//  
//  Sci-fi retractable panel on the RIGHT side
//  Shows relevant freelance industry data:
//  - Top hiring companies
//  - Trending skills with demand %
//  - Freelance opportunities
//  - Salary trends
//  - Industry growth sectors
// ============================================================

// ══════════════════════════════════════════════════════════
//  INDUSTRY DATA
// ══════════════════════════════════════════════════════════

const TOP_COMPANIES_HIRING = [
  { name: "TCS", industry: "IT Services", jobs: 1240, growth: "+15%", color: "#00ffc8" },
  { name: "Infosys", industry: "IT Services", jobs: 980, growth: "+12%", color: "#61dafb" },
  { name: "Wipro", industry: "IT Services", jobs: 750, growth: "+8%", color: "#86efac" },
  { name: "HCL Tech", industry: "IT Services", jobs: 620, growth: "+10%", color: "#fb923c" },
  { name: "Amazon", industry: "E-commerce", jobs: 580, growth: "+20%", color: "#fbbf24" },
  { name: "Google", industry: "Tech", jobs: 450, growth: "+5%", color: "#c084fc" },
  { name: "Microsoft", industry: "Tech", jobs: 420, growth: "+7%", color: "#38bdf8" },
  { name: "Flipkart", industry: "E-commerce", jobs: 380, growth: "+18%", color: "#f472b6" }
];

const TRENDING_SKILLS = [
  { name: "Python", demand: 92, growth: "+8%", avgRate: "₹25,000/mo", color: "#00ffc8" },
  { name: "React.js", demand: 88, growth: "+12%", avgRate: "₹22,000/mo", color: "#61dafb" },
  { name: "Data Science", demand: 85, growth: "+15%", avgRate: "₹35,000/mo", color: "#c084fc" },
  { name: "UI/UX Design", demand: 82, growth: "+10%", avgRate: "₹20,000/mo", color: "#f472b6" },
  { name: "Node.js", demand: 78, growth: "+9%", avgRate: "₹21,000/mo", color: "#86efac" },
  { name: "SQL", demand: 75, growth: "+5%", avgRate: "₹18,000/mo", color: "#fbbf24" },
  { name: "AWS Cloud", demand: 72, growth: "+14%", avgRate: "₹30,000/mo", color: "#fb923c" },
  { name: "Flutter", demand: 68, growth: "+20%", avgRate: "₹24,000/mo", color: "#67e8f9" }
];

const FREELANCE_OPPORTUNITIES = [
  { title: "Full Stack Web Dev", budget: "₹50k-80k", duration: "3 months", skills: ["React", "Node.js", "MongoDB"], urgency: "High" },
  { title: "Mobile App Developer", budget: "₹40k-60k", duration: "2 months", skills: ["Flutter", "Firebase"], urgency: "Medium" },
  { title: "UI/UX Designer", budget: "₹30k-50k", duration: "1 month", skills: ["Figma", "Adobe XD"], urgency: "High" },
  { title: "Data Analyst", budget: "₹45k-70k", duration: "3 months", skills: ["Python", "SQL", "Tableau"], urgency: "Medium" },
  { title: "Content Writer", budget: "₹15k-25k", duration: "Ongoing", skills: ["SEO", "Blogging"], urgency: "Low" }
];

const INDUSTRY_SECTORS = [
  { name: "IT Services", share: 42, growth: "+12%", color: "#00ffc8" },
  { name: "E-commerce", share: 18, growth: "+25%", color: "#fbbf24" },
  { name: "Fintech", share: 15, growth: "+18%", color: "#c084fc" },
  { name: "EdTech", share: 10, growth: "+8%", color: "#61dafb" },
  { name: "Healthcare", share: 8, growth: "+15%", color: "#86efac" },
  { name: "Others", share: 7, growth: "+5%", color: "#fb923c" }
];

// ══════════════════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════════════════

const UPDATE_INTERVAL_MS = 5000;
const INSIGHT_MESSAGES = [
  "💡 Python is the most in-demand skill this month!",
  "📈 E-commerce sector hiring up by 25%",
  "🔥 React.js freelancers earning 30% more",
  "🚀 Remote jobs increased by 40% in IT sector",
  "💰 Data Science commands highest rates: ₹35k/month",
  "🎯 500+ new freelance projects posted this week",
  "⭐ Top companies prefer candidates with React & Node.js",
  "📊 Freelance market grew 18% in Q1 2026"
];

let updateInterval = null;
let panelOpen = false;
let mounted = false;
let insightIndex = 0;

// ══════════════════════════════════════════════════════════
//  SIMULATE LIVE UPDATES
// ══════════════════════════════════════════════════════════

function updateLiveData() {
  TRENDING_SKILLS.forEach(skill => {
    const change = (Math.random() - 0.48) * 3;
    skill.demand = Math.min(100, Math.max(40, skill.demand + change));
  });
  TRENDING_SKILLS.sort((a, b) => b.demand - a.demand);
  
  TOP_COMPANIES_HIRING.forEach(company => {
    const change = Math.floor((Math.random() - 0.48) * 20);
    company.jobs = Math.max(100, company.jobs + change);
  });
  TOP_COMPANIES_HIRING.sort((a, b) => b.jobs - a.jobs);
  
  refreshUI();
}

function refreshUI() {
  updateCompanyList();
  updateSkillsList();
  updateOpportunities();
  updateIndustrySectors();
}

function updateCompanyList() {
  const container = document.getElementById("ii-company-list");
  if (!container) return;
  
  container.innerHTML = TOP_COMPANIES_HIRING.map(company => `
    <div class="ii-company-item">
      <div class="ii-company-info">
        <div class="ii-company-name">${company.name}</div>
        <div class="ii-company-industry">${company.industry}</div>
      </div>
      <div class="ii-company-stats">
        <div class="ii-company-jobs">${company.jobs}+ jobs</div>
        <div class="ii-company-growth positive">${company.growth}</div>
      </div>
    </div>
  `).join("");
}

function updateSkillsList() {
  const container = document.getElementById("ii-skills-list");
  if (!container) return;
  
  container.innerHTML = TRENDING_SKILLS.slice(0, 8).map((skill, idx) => `
    <div class="ii-skill-item">
      <div class="ii-skill-rank">#${idx + 1}</div>
      <div class="ii-skill-info">
        <div class="ii-skill-name">${skill.name}</div>
        <div class="ii-skill-rate">${skill.avgRate}</div>
      </div>
      <div class="ii-skill-demand">
        <div class="ii-demand-bar">
          <div class="ii-demand-fill" style="width: ${skill.demand}%; background: ${skill.color}"></div>
        </div>
        <div class="ii-demand-percent">${skill.demand}%</div>
      </div>
      <div class="ii-skill-growth positive">${skill.growth}</div>
    </div>
  `).join("");
}

function updateOpportunities() {
  const container = document.getElementById("ii-opportunities");
  if (!container) return;
  
  container.innerHTML = FREELANCE_OPPORTUNITIES.map(opp => `
    <div class="ii-opportunity-card">
      <div class="ii-opp-header">
        <span class="ii-opp-title">${opp.title}</span>
        <span class="ii-opp-urgency ${opp.urgency === "High" ? "high" : opp.urgency === "Medium" ? "medium" : "low"}">${opp.urgency}</span>
      </div>
      <div class="ii-opp-details">
        <span>💰 ${opp.budget}</span>
        <span>⏱️ ${opp.duration}</span>
      </div>
      <div class="ii-opp-skills">
        ${opp.skills.map(s => `<span class="ii-skill-tag">${s}</span>`).join("")}
      </div>
    </div>
  `).join("");
}

function updateIndustrySectors() {
  const container = document.getElementById("ii-sectors");
  if (!container) return;
  
  container.innerHTML = INDUSTRY_SECTORS.map(sector => `
    <div class="ii-sector-item">
      <div class="ii-sector-name">${sector.name}</div>
      <div class="ii-sector-bar">
        <div class="ii-sector-fill" style="width: ${sector.share}%; background: ${sector.color}"></div>
      </div>
      <div class="ii-sector-share">${sector.share}%</div>
      <div class="ii-sector-growth positive">${sector.growth}</div>
    </div>
  `).join("");
}

function updateInsightTicker() {
  const tickerEl = document.getElementById("ii-ticker-msg");
  if (!tickerEl) return;
  
  tickerEl.style.opacity = "0";
  setTimeout(() => {
    insightIndex = (insightIndex + 1) % INSIGHT_MESSAGES.length;
    tickerEl.textContent = INSIGHT_MESSAGES[insightIndex];
    tickerEl.style.opacity = "1";
  }, 200);
}

// ══════════════════════════════════════════════════════════
//  BUILD PANEL HTML
// ══════════════════════════════════════════════════════════

function buildPanelHTML() {
  return `
  <div id="industry-insights-panel" class="ii-panel ii-closed">
    <!-- Toggle Tab - MUST BE VISIBLE -->
    <button id="ii-toggle-btn" class="ii-toggle-tab" title="Industry Insights">
      <span class="ii-toggle-arrow" id="ii-toggle-arrow">◀</span>
      <span class="ii-toggle-word">I</span>
      <span class="ii-toggle-word">N</span>
      <span class="ii-toggle-word">S</span>
      <span class="ii-toggle-word">I</span>
      <span class="ii-toggle-word">G</span>
      <span class="ii-toggle-word">H</span>
      <span class="ii-toggle-word">T</span>
      <span class="ii-live-dot"></span>
    </button>
    
    <!-- Panel Body -->
    <div class="ii-body">
      <div class="ii-scanlines"></div>
      
      <div class="ii-header">
        <div class="ii-title-row">
          <span class="ii-pulse-ring"></span>
          <span class="ii-title">INDUSTRY INSIGHTS</span>
          <span class="ii-pulse-ring"></span>
        </div>
        <div class="ii-subtitle">LIVE FREELANCE MARKET DATA</div>
        <div class="ii-hud-line"></div>
      </div>
      
      <div class="ii-ticker-bar">
        <span class="ii-live-badge">◉ LIVE</span>
        <div class="ii-ticker-track">
          <span class="ii-ticker-msg" id="ii-ticker-msg">${INSIGHT_MESSAGES[0]}</span>
        </div>
      </div>
      
      <!-- Top Hiring Companies -->
      <div class="ii-section">
        <div class="ii-section-header">
          <span class="ii-section-icon">🏢</span>
          <span>TOP HIRING COMPANIES</span>
          <span class="ii-section-sub">Active freelance openings</span>
        </div>
        <div class="ii-company-list" id="ii-company-list"></div>
      </div>
      
      <!-- Trending Skills -->
      <div class="ii-section">
        <div class="ii-section-header">
          <span class="ii-section-icon">⚡</span>
          <span>TRENDING SKILLS</span>
          <span class="ii-section-sub">By demand & avg rate</span>
        </div>
        <div class="ii-skills-list" id="ii-skills-list"></div>
      </div>
      
      <!-- Freelance Opportunities -->
      <div class="ii-section">
        <div class="ii-section-header">
          <span class="ii-section-icon">💼</span>
          <span>HOT OPPORTUNITIES</span>
          <span class="ii-section-sub">Urgent freelance projects</span>
        </div>
        <div class="ii-opportunities" id="ii-opportunities"></div>
      </div>
      
      <!-- Industry Sectors -->
      <div class="ii-section">
        <div class="ii-section-header">
          <span class="ii-section-icon">📊</span>
          <span>INDUSTRY SECTORS</span>
          <span class="ii-section-sub">Market share & growth</span>
        </div>
        <div class="ii-sectors-list" id="ii-sectors"></div>
      </div>
      
      <!-- Career Tip -->
      <div class="ii-tip">
        <div class="ii-tip-icon">💡</div>
        <div class="ii-tip-text">
          <strong>Pro Tip:</strong> Specialize in trending skills to increase your earning potential by up to 40%!
        </div>
      </div>
      
      <div class="ii-footer">
        <div class="ii-footer-glow"></div>
        <span class="ii-footer-brand">StudentWork Career Intelligence™</span>
        <span class="ii-footer-id">REAL-TIME · MARKET INSIGHTS</span>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
//  TOGGLE PANEL
// ══════════════════════════════════════════════════════════

function togglePanel() {
  const panel = document.getElementById("industry-insights-panel");
  const arrow = document.getElementById("ii-toggle-arrow");
  
  panelOpen = !panelOpen;
  if (panel) {
    if (panelOpen) {
      panel.classList.remove("ii-closed");
      panel.classList.add("ii-open");
    } else {
      panel.classList.remove("ii-open");
      panel.classList.add("ii-closed");
    }
  }
  if (arrow) arrow.textContent = panelOpen ? "▶" : "◀";
}

// ══════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════

export function mountIndustryInsights() {
  if (mounted) return;
  mounted = true;
  
  document.body.insertAdjacentHTML("beforeend", buildPanelHTML());
  
  refreshUI();
  
  const toggleBtn = document.getElementById("ii-toggle-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", togglePanel);
    console.log("Industry Insights panel mounted - click the INSIGHT tab on the right edge");
  }
  
  // Ensure panel starts closed
  const panel = document.getElementById("industry-insights-panel");
  if (panel) {
    panel.classList.add("ii-closed");
    panel.classList.remove("ii-open");
    panelOpen = false;
  }
  
  updateInterval = setInterval(() => {
    updateLiveData();
    updateInsightTicker();
  }, UPDATE_INTERVAL_MS);
  
  setInterval(updateInsightTicker, 6000);
}

export function unmountIndustryInsights() {
  if (updateInterval) clearInterval(updateInterval);
  document.getElementById("industry-insights-panel")?.remove();
  mounted = false;
  panelOpen = false;
}