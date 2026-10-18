if (typeof USE_SUPABASE === "undefined") {
  var USE_SUPABASE = true;
} // var to prevent duplicate declaration error // Change to false if you want offline mode only

// --- AUTH PART ---
function togglePass(id, btn) {
  const i = document.getElementById(id);
  if (!i) return;
  if (i.type === "password") {
    i.type = "text";
    btn.textContent = "Hide";
  } else {
    i.type = "password";
    btn.textContent = "Show";
  }
}

// TOTAL DELETE DEFAULT ADMIN - NO MORE admin/saog2026
// This runs on every page load and deletes admin completely
(function deleteDefaultAdminForever() {
  try {
    // 1. Delete from nt_users
    let users = JSON.parse(localStorage.getItem("nt_users") || "[]");
    const before = users.length;
    users = users.filter(
      (u) =>
        u.username &&
        u.username.toLowerCase() !== "admin" &&
        u.username.toLowerCase() !== "admin saog",
    );
    if (users.length !== before || localStorage.getItem("nt_users") === null) {
      localStorage.setItem("nt_users", JSON.stringify(users));
      console.log("🗑️ Deleted admin from nt_users");
    }
    // 2. Delete nt_current if admin
    const curStr = localStorage.getItem("nt_current");
    if (curStr) {
      const cur = JSON.parse(curStr);
      if (cur && cur.username && cur.username.toLowerCase() === "admin") {
        localStorage.removeItem("nt_current");
        localStorage.removeItem("nt_children_admin");
        localStorage.removeItem("nt_children_Admin Saog");
        // Delete all admin-related keys
        Object.keys(localStorage).forEach((k) => {
          if (
            k.toLowerCase().includes("admin") &&
            k.startsWith("nt_children_")
          ) {
            localStorage.removeItem(k);
          }
        });
        console.log("🗑️ Deleted admin session and admin children data");
        if (window.location.pathname.includes("dashboard.html")) {
          alert(
            "Default admin account has been DELETED! Redirecting to login. Use ml1 or lln1 accounts.",
          );
          window.location.href = "index.html";
        }
      }
    }
    // 3. Ensure nt_users exists as empty if none
    if (!localStorage.getItem("nt_users")) {
      localStorage.setItem("nt_users", JSON.stringify([]));
    }
  } catch (e) {
    console.warn("Cleanup error", e);
  }
})();

// Tabs for login/register (only on index.html)
document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((x) => x.classList.remove("active"));
    document
      .querySelectorAll(".auth-form")
      .forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const form = document.getElementById(t.dataset.tab + "Form");
    if (form) form.classList.add("active");
  });
});

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value;
    // TOTAL DELETE - admin no longer exists, will naturally fail as invalid

    // Try Supabase first if configured
    if (
      USE_SUPABASE &&
      typeof getSupabase === "function" &&
      isSupabaseConfigured()
    ) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("username", u)
          .eq("password", p)
          .single();
        if (data && !error) {
          localStorage.setItem("nt_current", JSON.stringify(data));
          location.href = "dashboard.html";
          return;
        }
      } catch (err) {
        console.warn(
          "Supabase login failed, falling back to localStorage",
          err,
        );
      }
    }

    // Fallback to localStorage
    const users = JSON.parse(localStorage.getItem("nt_users") || "[]");
    const found = users.find((x) => x.username === u && x.password === p);
    if (found) {
      localStorage.setItem("nt_current", JSON.stringify(found));
      location.href = "dashboard.html";
    } else alert("Invalid username or password!");
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const u = document.getElementById("regUser").value.trim();
    const p = document.getElementById("regPass").value;
    const p2 = document.getElementById("regPass2").value;
    if (p !== p2) return alert("Passwords do not match!");

    // Try Supabase
    if (
      USE_SUPABASE &&
      typeof getSupabase === "function" &&
      isSupabaseConfigured()
    ) {
      try {
        const supabase = getSupabase();
        const { data: existing } = await supabase
          .from("users")
          .select("username")
          .eq("username", u)
          .single();
        if (existing) return alert("Username already exists in database!");
        const { data, error } = await supabase
          .from("users")
          .insert([{ name, username: u, password: p }])
          .select();
        if (!error) {
          alert("Registered successfully in Supabase! You can now log in.");
          document.querySelector("[data-tab=login]")?.click();
          return;
        }
      } catch (err) {
        console.warn("Supabase register failed, fallback", err);
      }
    }

    let users = JSON.parse(localStorage.getItem("nt_users") || "[]");
    if (users.find((x) => x.username === u))
      return alert("Username already exists!");
    users.push({ name, username: u, password: p });
    localStorage.setItem("nt_users", JSON.stringify(users));
    alert("Registered successfully! You can now log in.");
    document.querySelector("[data-tab=login]")?.click();
  });
}

// ==================== DASHBOARD PART ====================
const cur = localStorage.getItem("nt_current");
const isDashboard = !!document.getElementById("userDisplay");

if (isDashboard) {
  if (!cur) location.href = "index.html";
  const current = JSON.parse(cur || "{}");
  document.getElementById("userDisplay").textContent =
    current.name || current.username;

  // === USER ISOLATION - Login mo, Record mo ===
  function getCurrentUser() {
    try {
      const curStr = localStorage.getItem("nt_current");
      if (!curStr) return null;
      return JSON.parse(curStr);
    } catch (e) {
      return null;
    }
  }
  function getCurrentUsername() {
    const u = getCurrentUser();
    return u ? u.username || u.name || "admin" : "admin";
  }
  function getCurrentUserId() {
    const u = getCurrentUser();
    return u ? u.id || u.username : null;
  }
  function getChildrenStorageKey() {
    const username = getCurrentUsername();
    return `nt_children_${username}`;
  }

  // Sidebar navigation
  document.querySelectorAll(".side-btn").forEach((b) => {
    b.addEventListener("click", () => {
      document
        .querySelectorAll(".side-btn")
        .forEach((x) => x.classList.remove("active"));
      document
        .querySelectorAll(".view")
        .forEach((v) => v.classList.remove("active"));
      b.classList.add("active");
      const view = document.getElementById("view-" + b.dataset.view);
      if (view) view.classList.add("active");
      if (b.dataset.view === "dashboard") renderDashboard();
      if (b.dataset.view === "records") renderTable();
      if (b.dataset.view === "purok") initPurok();
    });
  });
}

// ==================== HELPERS ====================
const PUROK_LIST = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6"];
let activePurok = "Purok 1";
let pendingDeleteId = null;
let childrenCache = null;

function byId(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function sexLetter(g) { return (g || "").toString().charAt(0).toUpperCase(); }
function sexFull(g) { return sexLetter(g) === "F" ? "Female" : sexLetter(g) === "M" ? "Male" : ""; }
function computeAgeInMonths(dobStr, measuredStr) { // only used to fill age of very old records that have none
  if (!dobStr || !measuredStr) return null;
  const a = new Date(dobStr), b = new Date(measuredStr);
  if (isNaN(a) || isNaN(b)) return null;
  const t = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return t < 0 ? 0 : t;
}

// ==================== DATA LAYER ====================
function getCurrentUserGlobal(){ try{ const s=localStorage.getItem('nt_current'); return s?JSON.parse(s):null;}catch{return null;} }
function getCurrentUsernameGlobal(){ const u=getCurrentUserGlobal(); return u? u.username||u.name||'admin':'admin';}
function getChildrenStorageKeyGlobal(){ return `nt_children_${getCurrentUsernameGlobal()}`; }
if(typeof getCurrentUser==='undefined'){ var getCurrentUser=getCurrentUserGlobal; var getCurrentUsername=getCurrentUsernameGlobal; var getChildrenStorageKey=getChildrenStorageKeyGlobal; }

function getChildrenSync(){
  try{ const shared = localStorage.getItem('nt_children_shared'); if(shared) return JSON.parse(shared); }catch{}
  try{
    const key = typeof getChildrenStorageKey==='function'? getChildrenStorageKey() : 'nt_children';
    const v = localStorage.getItem(key);
    if(v) return JSON.parse(v);
  }catch{}
  try{ const old = localStorage.getItem('nt_children'); if(old) return JSON.parse(old); }catch{}
  return [];
}
function saveChildren(list){
  childrenCache = list;
  try{
    const key = typeof getChildrenStorageKey==='function'? getChildrenStorageKey() : 'nt_children';
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem('nt_children_shared', JSON.stringify(list));
    localStorage.setItem('nt_children', JSON.stringify(list));
  }catch(e){ console.warn(e); }
}

// Normalize old records: "Purok 6" format, numeric fields, id
function normalizeChild(c) {
  const before = JSON.stringify(c);
  if (!c.id) c.id = "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  const m = String(c.purok || "").match(/\d+/);
  if (m) c.purok = "Purok " + parseInt(m[0], 10);
  if (!c.gender && c.sex) c.gender = c.sex;
  if (c.weight !== undefined && c.weight !== "") c.weight = parseFloat(c.weight);
  if (c.height !== undefined && c.height !== "") c.height = parseFloat(c.height);
  if (c.age == null || c.age === "") c.age = computeAgeInMonths(c.dob, c.date);
  else c.age = Number(c.age);
  return JSON.stringify(c) !== before;
}
function getChildren() {
  if (!childrenCache) {
    const list = getChildrenSync();
    let changed = false;
    list.forEach((c) => { if (normalizeChild(c)) changed = true; });
    childrenCache = list;
    if (changed) saveChildren(list);
  }
  return childrenCache;
}
async function loadChildren() { childrenCache = null; return getChildren(); }

function refreshAll() {
  renderDashboard();
  renderTable();
  if (byId("view-purok")?.classList.contains("active")) renderPurok();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const list = getChildren(), total = list.length;
  const set = (id, v) => { const e = byId(id); if (e) e.textContent = v; };

  const male = list.filter((c) => sexLetter(c.gender) === "M").length;
  const female = list.filter((c) => sexLetter(c.gender) === "F").length;
  const ip = list.filter((c) => String(c.ip || "").toUpperCase() === "YES").length;
  set("totalChildren", total);
  set("dMale", male); set("dFemale", female); set("dIP", ip);
  set("dMaleN", male); set("dFemaleN", female); set("dDonutTotal", total);
  set("dDate", new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

  // Sex donut
  const donut = byId("dDonut");
  if (donut) {
    const mp = total ? (male / total) * 100 : 0, fp = total ? (female / total) * 100 : 0;
    donut.style.background = total
      ? `conic-gradient(#1e88e5 0 ${mp}%, #ec407a ${mp}% ${mp + fp}%, #dfe6e2 ${mp + fp}% 100%)`
      : "#dfe6e2";
  }

  // Children per purok
  const counts = PUROK_LIST.map((p) => list.filter((c) => c.purok === p).length);
  const maxP = Math.max(1, ...counts);
  const pEl = byId("dPurok");
  if (pEl) pEl.innerHTML = PUROK_LIST.map((p, i) => `
    <div class="pbar"><span class="pn">${p}</span>
      <div class="pt"><div style="width:${(counts[i] / maxP) * 100}%"></div></div>
      <b>${counts[i]}</b><small>${total ? Math.round((counts[i] / total) * 100) : 0}%</small></div>`).join("");

  // Age groups
  const groups = [["0-11", 0, 11], ["12-23", 12, 23], ["24-35", 24, 35], ["36-47", 36, 47], ["48-59", 48, 59]];
  const gc = groups.map(([, lo, hi]) => list.filter((c) => c.age != null && c.age >= lo && c.age <= hi).length);
  const maxG = Math.max(1, ...gc);
  const aEl = byId("dAge");
  if (aEl) aEl.innerHTML = groups.map((g, i) => `
    <div class="acol"><b>${gc[i]}</b><div class="abar" style="height:${Math.round((gc[i] / maxG) * 150)}px"></div><span>${g[0]}<br>months</span></div>`).join("");

  // Recently added
  const recent = [...list].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 6);
  const rEl = byId("dRecent");
  if (rEl) rEl.innerHTML = recent.length ? recent.map((c) => `
    <tr><td><b>${esc(c.name)}</b></td><td>${esc(c.purok)}</td><td>${sexLetter(c.gender)}</td>
    <td>${c.age != null ? esc(c.age) : ""}</td><td>${esc(fmtDate(c.date))}</td></tr>`).join("")
    : '<tr><td colspan="5" style="text-align:center;padding:18px;color:#888">Wala pang records.</td></tr>';
}
window.renderDashboard = renderDashboard;

// ==================== ADD FORM ====================
const childForm = document.getElementById('childForm');
if (childForm) {
  childForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const dob = byId("cDOB").value, measured = byId("cDate").value;
    if (dob && measured && dob > measured) return alert("Date of Birth cannot be later than Date Measured.");
    const age = parseInt(byId("cAge").value, 10);
    if (isNaN(age)) return alert("Please enter the Age in Months.");
    if (age < 0 || age > 59) return alert("Age must be 0-59 months (coverage).");
    const list = getChildren();
    list.push({
      id: "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      no: list.length + 1,
      purok: byId("cPurok").value,
      address: byId("cAddress").value.trim(),
      mother: byId("cMother").value.trim(),
      name: byId("cName").value.trim(),
      ip: byId("cIP").value,
      gender: byId("cGender").value,
      dob, date: measured,
      weight: parseFloat(byId("cWeight").value),
      height: parseFloat(byId("cHeight").value),
      age,
      created_by: getCurrentUsernameGlobal(),
      created_at: new Date().toISOString(),
    });
    saveChildren(list);
    syncChild(list[list.length - 1]);
    alert("Record saved!");
    resetForm();
    refreshAll();
  });
}
function resetForm() {
  const f = byId("childForm");
  if (f) f.reset();
  byId("editId").value = "";
}
window.resetForm = resetForm;

// ==================== ALL RECORDS ====================
function getFilteredRecords() {
  const q = (byId("searchInput")?.value || "").toLowerCase().trim();
  return getChildren().filter((c) => !q || `${c.name} ${c.mother} ${c.purok} ${c.address}`.toLowerCase().includes(q));
}
function actionButtons(id) {
  return `<button class="btn-outline btn-mini" title="Edit" onclick="editChild('${id}')">✏️</button>
          <button class="btn-outline btn-mini" title="Delete" onclick="deleteChild('${id}')">🗑️</button>`;
}
function renderTable() {
  const tbody = document.querySelector("#recordsTable tbody");
  if (!tbody) return;
  const list = getFilteredRecords();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:20px;color:#888">No records found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(c.purok)}</td>
      <td title="${esc(c.address)}"><span class="addr-ellipsis">${esc(c.address)}</span></td>
      <td>${esc(c.mother)}</td>
      <td><b>${esc(c.name)}</b></td>
      <td>${esc(c.ip || "NO")}</td>
      <td>${sexLetter(c.gender)}</td>
      <td>${esc(c.dob)}</td>
      <td>${esc(c.date)}</td>
      <td>${esc(c.weight)}</td>
      <td>${esc(c.height)}</td>
      <td>${c.age != null ? esc(c.age) : ""}</td>
      <td>${actionButtons(c.id)}</td>
    </tr>`).join("");
}
window.renderTable = renderTable;

// ==================== EXPORT / PRINT ====================
function downloadCSV(filename, headers, rows) {
  const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
const REC_HEAD = ["No.", "Purok", "Address", "Mother/Caregiver", "Child", "IP Group", "Sex", "Date of Birth",
  "Date Measured", "Weight (kg)", "Height (cm)", "Age (months)"];
const recRow = (c, i) => [i + 1, c.purok, c.address, c.mother, c.name, c.ip || "NO", sexLetter(c.gender),
  c.dob, c.date, c.weight, c.height, c.age];

function exportAllToExcel() {
  const list = getFilteredRecords();
  if (!list.length) return alert("Walang records na i-export.");
  downloadCSV("e-OPT-PLUS-SAOG.csv", REC_HEAD, list.map(recRow));
}

const EOPT_DATE = "05/05/2026"; // petsa ng e-OPT tool sa header ng print - palitan dito kung magbago
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${MONTHS[+m[2] - 1]}-${m[3]}-${m[1]}` : s || "";
}
function num1(v) { const n = parseFloat(v); return isNaN(n) ? "" : n.toFixed(1); }

// Print in the Community Level e-OPT PLUS Tool layout
function printEOPT(list, opts) {
  opts = opts || {};
  const year = EOPT_DATE.slice(-4);
  const body = list.map((c, i) => {
    const addr = [c.purok ? c.purok.toUpperCase() : "", c.address ? c.address.toUpperCase() : ""].filter(Boolean).join("- ");
    return `<tr>
      <td class="ctr">${i + 1}</td>
      <td>${esc(addr)}</td>
      <td>${esc((c.mother || "").toUpperCase())}</td>
      <td>${esc((c.name || "").toUpperCase())}</td>
      <td class="ctr">${esc(c.ip || "NO")}</td>
      <td class="ctr">${sexLetter(c.gender)}</td>
      <td class="ctr">${esc(fmtDate(c.dob))}</td>
      <td class="ctr">${esc(fmtDate(c.date))}</td>
      <td class="ctr">${num1(c.weight)}</td>
      <td class="ctr">${num1(c.height)}</td>
      <td class="ctr b">${c.age != null ? esc(c.age) : ""}</td>
    </tr>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>e-OPT PLUS - Barangay Saog</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 9pt; color: #111; margin: 0; }
  table { border-collapse: collapse; width: 100%; }
  .top { background: #dde2a5; }
  .top td { vertical-align: middle; padding: 6px 10px; }
  .top .tf { width: 17%; }
  .top .red { background: #b9455a; color: #fff; font-weight: 700; font-size: 8pt; padding: 3px 8px; display: inline-block; }
  .top .bg { font-weight: 700; margin-top: 4px; font-size: 10pt; }
  .top .mid { text-align: center; }
  .top .t { font-size: 17pt; font-weight: 700; }
  .top .s2 { font-size: 10.5pt; font-weight: 700; margin-top: 3px; }
  .top .rt { width: 24%; text-align: right; font-size: 9.5pt; line-height: 1.6; }
  .band { background: #3b3b3b; height: 12px; }
  .loc td { padding: 6px 10px; font-size: 10.5pt; text-align: center; }
  .note { text-align: center; font-weight: 700; font-size: 10.5pt; margin: 2px 0 4px; }
  .grid th, .grid td { border: 1px solid #222; }
  .grid th { color: #fff; font-weight: 700; text-align: center; padding: 4px 3px; font-size: 8pt; line-height: 1.25; }
  .grid th span { font-weight: 400; font-size: 6.5pt; opacity: .85; }
  .blue { background: #5ba3d0; }
  .yellow { background: #f5c518; color: #5a3b00 !important; font-size: 6.5pt !important; }
  .grid td { padding: 3px 5px; height: 17px; background: #fff; }
  .ctr { text-align: center; }
  .b { font-weight: 700; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
</style></head><body>
<table class="top"><tr>
  <td class="tf"><span class="red">TOOL IS FOR:</span><div class="bg">Barangay</div></td>
  <td class="mid"><div class="t">Community Level e-OPT PLUS Tool</div>
    <div class="s2">CHILD NUTRITION RECORD</div></td>
  <td class="rt">Date: <b>${EOPT_DATE}</b> &nbsp;&nbsp;&nbsp; Year: <b>${year}</b><br>Region: <b>III Central Luzon</b></td>
</tr></table>
<div class="band"></div>
<table class="loc"><tr>
  <td>Barangay: <b>SAOG</b></td><td>Municipality: <b>MARILAO</b></td><td>Province: <b>Bulacan</b></td>
</tr></table>
${opts.note ? `<div class="note">${esc(opts.note)}</div>` : ""}
<table class="grid">
<thead>
<tr>
  <th rowspan="2" class="blue" style="width:3%">Seq.</th>
  <th rowspan="2" class="blue" style="width:20%">Address or Location<br>of Child's Residence<br><span>(Purok, Block #, Area or Location in the barangay)</span></th>
  <th rowspan="2" class="blue" style="width:16%">Name of Mother<br>or Caregiver<br><span>(Surname, First Name)</span></th>
  <th rowspan="2" class="blue" style="width:18%">Full Name of Child<br><span>(Surname, First Name)</span></th>
  <th rowspan="2" class="blue" style="width:6%">Belongs to IP<br>Group?<br><span>YES/NO</span></th>
  <th rowspan="2" class="blue" style="width:4%">Sex<br><span>M/F</span></th>
  <th colspan="2" class="yellow">IMPORTANT INFO ON DATE FORMAT<br>ENTRY: PLS READ</th>
  <th rowspan="2" class="blue" style="width:5%">Weight<br><span>(kg)</span></th>
  <th rowspan="2" class="blue" style="width:5%">Height<br><span>(cm)</span></th>
  <th rowspan="2" class="blue" style="width:6%">Age in<br>Months</th>
</tr>
<tr>
  <th class="blue" style="width:8.5%">Date of Birth</th>
  <th class="blue" style="width:8.5%">Date Measured</th>
</tr>
</thead>
<tbody>${body}</tbody></table>
</body></html>`;

  const fr = document.createElement("iframe");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(fr);
  const d = fr.contentWindow.document;
  d.open(); d.write(html); d.close();
  setTimeout(() => {
    fr.contentWindow.focus();
    fr.contentWindow.print();
    setTimeout(() => fr.remove(), 2000);
  }, 400);
}
function printAllRecords() {
  const list = getFilteredRecords();
  if (!list.length) return alert("Walang records na i-print.");
  printEOPT(list);
}
window.exportAllToExcel = exportAllToExcel;
window.printAllRecords = printAllRecords;

// ==================== PUROK MONITORING ====================
function purokList() {
  const q = (byId("purokSearch")?.value || "").toLowerCase().trim();
  return getChildren().filter((c) => {
    if (c.purok !== activePurok) return false;
    return !q || `${c.name} ${c.mother} ${c.address}`.toLowerCase().includes(q);
  });
}
function initPurok() { renderPurok(); }
function renderPurok() {
  const tabs = byId("purokTabs");
  if (!tabs) return;
  tabs.innerHTML = "";
  PUROK_LIST.forEach((p) => {
    const b = document.createElement("button");
    b.className = "purok-tab" + (p === activePurok ? " active" : "");
    b.textContent = p;
    b.onclick = () => { activePurok = p; renderPurok(); };
    tabs.appendChild(b);
  });
  const all = getChildren();
  const box = byId("purokStats");
  if (box) box.innerHTML = PUROK_LIST.map((p) => {
    const n = all.filter((c) => c.purok === p).length;
    const on = p === activePurok;
    return `<div class="card normal" style="cursor:pointer;${on ? "outline:2px solid #1a7a4c;" : ""}" onclick="activePurok='${p}';renderPurok()">
      <h3>${n}</h3><p>${p} - Total Children</p></div>`;
  }).join("");
  const list = purokList();
  document.querySelector("#purokTable tbody").innerHTML = list.length ? list.map((c) => `
    <tr>
      <td><b>${esc(c.name)}</b></td>
      <td>${sexLetter(c.gender)}</td>
      <td>${c.age != null ? esc(c.age) : ""}</td>
      <td>${esc(c.address)}</td>
      <td>${esc(c.weight)}</td>
      <td>${esc(c.height)}</td>
      <td>${actionButtons(c.id)}</td>
    </tr>`).join("")
    : `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Walang records sa ${activePurok}.</td></tr>`;
}
const PUROK_HEAD = ["Name", "Sex", "Age (months)", "Address", "Weight (kg)", "Height (cm)"];
const purokRow = (c) => [c.name, sexLetter(c.gender), c.age, c.address, c.weight, c.height];
function exportPurokToExcel() {
  const list = purokList();
  if (!list.length) return alert("Walang records sa " + activePurok + ".");
  downloadCSV(`Purok-Monitoring-${activePurok.replace(" ", "")}.csv`, PUROK_HEAD, list.map(purokRow));
}
function printPurokReport() {
  const list = purokList();
  if (!list.length) return alert("Walang records sa " + activePurok + ".");
  printEOPT(list, { note: activePurok.toUpperCase() });
}
window.renderPurok = renderPurok;
window.initPurok = initPurok;

// ==================== EDIT (modal - stays in All Records) ====================
function editChild(id) {
  const c = getChildren().find((x) => x.id === id);
  if (!c) return;
  const set = (k, v) => { byId(k).value = v == null ? "" : v; };
  set("uEditId", c.id);
  set("uPurok", c.purok);
  set("uAddress", c.address);
  set("uMother", c.mother);
  set("uName", c.name);
  set("uIP", c.ip || "NO");
  set("uGender", sexFull(c.gender));
  set("uDOB", c.dob);
  set("uDate", c.date);
  set("uWeight", c.weight);
  set("uHeight", c.height);
  set("uAge", c.age);
  byId("updateChildModal").classList.add("show");
}
function closeUpdateChildModal() { byId("updateChildModal").classList.remove("show"); }

function saveUpdateChild(e) {
  if (e) e.preventDefault();
  const age = parseInt(byId("uAge").value, 10);
  if (isNaN(age)) return alert("Please enter the Age in Months.");
  if (age < 0 || age > 59) return alert("Age must be 0-59 months.");
  const list = getChildren();
  const idx = list.findIndex((x) => x.id === byId("uEditId").value);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    purok: byId("uPurok").value,
    address: byId("uAddress").value.trim(),
    mother: byId("uMother").value.trim(),
    name: byId("uName").value.trim(),
    ip: byId("uIP").value,
    gender: byId("uGender").value,
    dob: byId("uDOB").value,
    date: byId("uDate").value,
    weight: parseFloat(byId("uWeight").value),
    height: parseFloat(byId("uHeight").value),
    age,
    updated_by: getCurrentUsernameGlobal(),
    updated_at: new Date().toISOString(),
  };
  saveChildren(list);
  syncChild(list[idx]);
  closeUpdateChildModal();
  refreshAll();
}
window.editChild = editChild;

// ==================== DELETE (modal) ====================
function deleteChild(id) {
  const c = getChildren().find((x) => x.id === id);
  if (!c) return;
  pendingDeleteId = id;
  byId("deleteMsg").textContent = `Are you sure you want to delete the record of "${c.name}"?`;
  byId("deleteModal").classList.add("show");
}
function closeDeleteModal() { pendingDeleteId = null; byId("deleteModal").classList.remove("show"); }
function confirmDelete() {
  if (pendingDeleteId) {
    removeRemote(pendingDeleteId);
    saveChildren(getChildren().filter((x) => x.id !== pendingDeleteId));
  }
  closeDeleteModal();
  refreshAll();
}
window.deleteChild = deleteChild;

// ==================== SUPABASE SYNC (device -> Supabase "children" table) ====================
function sbClient() {
  try {
    if (typeof getSupabase === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
      return getSupabase();
    }
  } catch (e) { console.warn(e); }
  return null;
}
function setDbStatus(ok, msg) {
  const el = byId("dbStatus");
  if (!el) return;
  el.classList.remove("d-none", "db-connected", "db-offline");
  el.classList.add(ok ? "db-connected" : "db-offline");
  el.textContent = msg;
  el.title = msg;
}
function childToRow(c) {
  const w = parseFloat(c.weight), h = parseFloat(c.height);
  return {
    local_id: c.id,
    name: c.name || "",
    gender: sexFull(c.gender) || c.gender || "",
    age: c.age != null ? parseInt(c.age, 10) : null,
    purok: c.purok || "",
    address: c.address || "",
    weight: isNaN(w) ? null : w,
    height: isNaN(h) ? null : h,
    mother: c.mother || "",
    ip: c.ip || "NO",
    dob: c.dob || null,
    date_measured: c.date || null,
  };
}
function sbError(err) {
  console.error("Supabase sync error:", err);
  setDbStatus(false, "⚠️ Supabase: " + (err && err.message ? err.message : err));
}
async function syncChild(c) {
  const sb = sbClient();
  if (!sb || !c) return;
  try {
    const { error } = await sb.from("children").upsert(childToRow(c), { onConflict: "local_id" });
    if (error) throw error;
    setDbStatus(true, "☁️ Saved to Supabase");
  } catch (e) { sbError(e); }
}
async function removeRemote(localId) {
  const sb = sbClient();
  if (!sb || !localId) return;
  try {
    const { error } = await sb.from("children").delete().eq("local_id", localId);
    if (error) throw error;
    setDbStatus(true, "☁️ Synced");
  } catch (e) { sbError(e); }
}
// Push everything once per page load. Old Supabase rows (no local_id yet) are matched by
// name + weight + height and UPDATED, so walang madodoble.
async function syncAllToSupabase() {
  const sb = sbClient();
  if (!sb) { setDbStatus(false, "📴 Offline (local only)"); return; }
  try {
    const list = getChildren();
    const { data: remote, error } = await sb.from("children").select("id,local_id,name,weight,height");
    if (error) throw error;
    const known = new Set(remote.filter((r) => r.local_id).map((r) => r.local_id));
    const legacy = remote.filter((r) => !r.local_id);
    const norm = (v) => String(v || "").trim().toLowerCase();
    const toUpsert = [];
    for (const c of list) {
      const row = childToRow(c);
      if (!known.has(c.id)) {
        const k = legacy.findIndex((r) => norm(r.name) === norm(c.name)
          && Math.abs(Number(r.weight) - Number(c.weight)) < 0.01
          && Math.abs(Number(r.height) - Number(c.height)) < 0.01);
        if (k >= 0) {
          const rid = legacy[k].id;
          legacy.splice(k, 1);
          const { error: ue } = await sb.from("children").update(row).eq("id", rid);
          if (ue) throw ue;
          continue;
        }
      }
      toUpsert.push(row);
    }
    if (toUpsert.length) {
      const { error: ie } = await sb.from("children").upsert(toUpsert, { onConflict: "local_id" });
      if (ie) throw ie;
    }
    setDbStatus(true, "☁️ Supabase synced (" + list.length + ")");
  } catch (e) { sbError(e); }
}

// ==================== LOGOUT / ACCOUNT ====================
window.showLogoutModal = window.showLogoutModal || function () { byId("logoutModal").classList.add("show"); };
window.closeLogoutModal = window.closeLogoutModal || function () { byId("logoutModal").classList.remove("show"); };
window.confirmLogout = window.confirmLogout || function () { localStorage.removeItem("nt_current"); location.href = "index.html"; };

window.showAccountModal = window.showAccountModal || function () {
  byId("currentUserLabel").textContent = getCurrentUsernameGlobal();
  ["newUsername", "newPassword", "newPassword2"].forEach((i) => (byId(i).value = ""));
  byId("accountModal").classList.add("show");
};
window.closeAccountModal = window.closeAccountModal || function () { byId("accountModal").classList.remove("show"); };

window.saveAccountChanges = window.saveAccountChanges || async function () {
  const old = getCurrentUsernameGlobal();
  const nu = byId("newUsername").value.trim(), p = byId("newPassword").value, p2 = byId("newPassword2").value;
  if (!nu || !p) return alert("Fill in all fields.");
  if (p !== p2) return alert("Passwords do not match!");
  try {
    if (typeof getSupabase === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
      await getSupabase().from("users").update({ username: nu, password: p }).eq("username", old);
    }
  } catch (e) { console.warn(e); }
  const users = JSON.parse(localStorage.getItem("nt_users") || "[]");
  const u = users.find((x) => x.username === old);
  if (u) { u.username = nu; u.password = p; }
  localStorage.setItem("nt_users", JSON.stringify(users));
  const cu = getCurrentUserGlobal() || {};
  cu.username = nu; cu.password = p;
  localStorage.setItem("nt_current", JSON.stringify(cu));
  const data = localStorage.getItem("nt_children_" + old);
  if (data && old !== nu) { localStorage.setItem("nt_children_" + nu, data); localStorage.removeItem("nt_children_" + old); }
  alert("Account updated!");
  location.reload();
};

window.showDeleteAccountModal = window.showDeleteAccountModal || function () {
  const u = getCurrentUsernameGlobal();
  byId("deleteAccountUsername").textContent = u;
  byId("deleteConfirmUsernameLabel").textContent = u;
  byId("deleteAccountRecords").textContent = getChildren().length;
  byId("deleteConfirmInput").value = "";
  byId("accountModal").classList.remove("show");
  byId("deleteAccountModal").classList.add("show");
};
window.closeDeleteAccountModal = window.closeDeleteAccountModal || function () { byId("deleteAccountModal").classList.remove("show"); };
window.confirmDeleteAccount = window.confirmDeleteAccount || async function () {
  const u = getCurrentUsernameGlobal();
  if (byId("deleteConfirmInput").value.trim() !== u) return alert("Username does not match.");
  try {
    if (typeof getSupabase === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
      await getSupabase().from("users").delete().eq("username", u);
    }
  } catch (e) { console.warn(e); }
  const users = JSON.parse(localStorage.getItem("nt_users") || "[]").filter((x) => x.username !== u);
  localStorage.setItem("nt_users", JSON.stringify(users));
  localStorage.removeItem("nt_current");
  alert("Account deleted. Child records were kept.");
  location.href = "index.html";
};

// ==================== MODALS: click outside / Esc ====================
document.querySelectorAll(".modal-overlay").forEach((ov) => {
  ov.addEventListener("mousedown", (e) => { if (e.target === ov) ov.classList.remove("show"); });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal-overlay.show").forEach((m) => m.classList.remove("show"));
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  if (!isDashboard) return;
  refreshAll();
  syncAllToSupabase();
  const s = byId('searchInput');
  if (s) s.addEventListener('input', renderTable);
});
