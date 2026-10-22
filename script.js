if (typeof USE_SUPABASE === "undefined") {
  var USE_SUPABASE = true;
} // var to prevent duplicate declaration error // Change to false if you want offline mode only

// --- AUTH PART ---
// ==================== PASSWORD HASHING (PBKDF2-SHA256, needs https or localhost) ====================
const PW_ITER = 100000;
const b2h = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const h2b = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
async function pbkdf2(pw, salt, iter) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b2h(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256));
}
async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PW_ITER}$${b2h(salt)}$${await pbkdf2(pw, salt, PW_ITER)}`;
}
const isHashed = (v) => String(v || "").startsWith("pbkdf2$");
async function verifyPassword(pw, stored) {
  if (!isHashed(stored)) return pw === stored; // old plain-text account (auto-upgraded on login)
  const [, it, salt, hash] = stored.split("$");
  return (await pbkdf2(pw, h2b(salt), parseInt(it, 10))) === hash;
}
const safeUser = (u) => { const { password, ...rest } = u || {}; return rest; }; // never keep the password in the browser session
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
        const { data, error } = await supabase.from("users").select("*").eq("username", u).maybeSingle();
        if (data && !error && (await verifyPassword(p, data.password))) {
          if (!isHashed(data.password)) // upgrade old plain-text password to a hash
            await supabase.from("users").update({ password: await hashPassword(p) }).eq("username", u);
          localStorage.setItem("nt_current", JSON.stringify(safeUser(data)));
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
    let found = null;
    for (const x of users) {
      if (x.username === u && (await verifyPassword(p, x.password))) { found = x; break; }
    }
    if (found) {
      localStorage.setItem("nt_current", JSON.stringify(safeUser(found)));
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
          .insert([{ name, username: u, password: await hashPassword(p) }])
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
    users.push({ name, username: u, password: await hashPassword(p) });
    localStorage.setItem("nt_users", JSON.stringify(users));
    alert("Registered successfully! You can now log in.");
    document.querySelector("[data-tab=login]")?.click();
  });
}


// ==================== GOOGLE / PHONE LOGIN + FORGOT PASSWORD (Supabase Auth OTP) ====================
// Staff accounts stay in the "users" table. Google / phone / OTP are only used to PROVE who you are:
// the verified email / phone must already be linked to a staff account (see Account Settings).
const authReady = () => USE_SUPABASE && typeof getSupabase === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
const $id = (i) => document.getElementById(i);
const digitsOnly = (v) => String(v || "").replace(/\D/g, "");
function normPhone(v) {            // 0917 123 4567 / 9171234567 / 639171234567 -> +639171234567
  let d = String(v || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (/^09\d{9}$/.test(d)) return "+63" + d.slice(1);
  if (/^9\d{9}$/.test(d)) return "+63" + d;
  if (/^63\d{10}$/.test(d)) return "+" + d;
  return d;
}
function maskEmail(e) { const [a, b] = String(e).split("@"); return (a || "").slice(0, 2) + "***@" + (b || ""); }
function maskPhone(p) { const d = String(p); return d.slice(0, 4) + "*".repeat(Math.max(0, d.length - 6)) + d.slice(-2); }
function authErr(e) {
  const m = String((e && e.message) || e || "Something went wrong.");
  if (e && e.code === "42703") return "The users table needs the 'email' and 'phone' columns. Run the SQL for recovery options in Supabase first.";
  if (/sms|phone/i.test(m) && /provider|not enabled|unsupported|disabled/i.test(m))
    return m + "\n\nPhone login needs the Phone provider + an SMS provider enabled in Supabase (Authentication > Providers).";
  if (/rate limit|too many|seconds/i.test(m)) return "Please wait a bit before asking for another code.\n\n" + m;
  return m;
}
async function lookupUser(field, val) {
  const { data, error } = await getSupabase().from("users").select("*").eq(field, val).maybeSingle();
  if (error) throw error;
  return data;
}
async function authSignOutLocal() { try { await getSupabase().auth.signOut({ scope: "local" }); } catch {} }
function loginAs(user) { localStorage.setItem("nt_current", JSON.stringify(safeUser(user))); location.href = "dashboard.html"; }
function showPanel(id) {
  document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
  $id(id)?.classList.add("active");
}
function cooldown(btn, secs) {
  if (!btn) return;
  const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
  btn.disabled = true;
  let n = secs;
  const t = setInterval(() => {
    n--;
    if (n <= 0) { clearInterval(t); btn.disabled = false; btn.textContent = label; }
    else btn.textContent = `${label} (${n}s)`;
  }, 1000);
  btn.textContent = `${label} (${n}s)`;
}
const step = (ids, show) => ids.forEach((i) => $id(i)?.classList.toggle("d-none", i !== show));

if (loginForm) {
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => {
    document.querySelector("[data-tab=login]")?.click();
  }));

  // ---- Continue with Google ----
  $id("googleBtn")?.addEventListener("click", async () => {
    if (!authReady()) return alert("Supabase is not configured.");
    sessionStorage.setItem("nt_oauth", "login");
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL("index.html", location.href).href, queryParams: { prompt: "select_account" } },
    });
    if (error) { sessionStorage.removeItem("nt_oauth"); alert(authErr(error)); }
  });
  // coming back from Google
  (async function handleOAuthReturn() {
    if (!authReady() || sessionStorage.getItem("nt_oauth") !== "login") return;
    sessionStorage.removeItem("nt_oauth");
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      history.replaceState(null, "", location.pathname);
      const email = String(session?.user?.email || "").toLowerCase();
      await authSignOutLocal();
      if (!email) return alert("Google sign-in was cancelled or failed.");
      const user = await lookupUser("email", email);
      if (!user) return alert(`The Google account ${email} is not linked to any staff account.\n\nLog in with your username and password, then link Google in Account Settings.`);
      loginAs(user);
    } catch (e) { alert(authErr(e)); }
  })();

  // ---- Continue with phone number ----
  let phoneCtx = null;
  $id("phoneBtn")?.addEventListener("click", () => {
    phoneCtx = null; step(["phStep1", "phStep2"], "phStep1");
    $id("phoneInput").value = ""; $id("phoneCode").value = "";
    showPanel("phoneForm");
  });
  async function phoneSend() {
    if (!authReady()) return alert("Supabase is not configured.");
    const phone = normPhone($id("phoneInput").value);
    if (!/^\+\d{10,15}$/.test(phone)) return alert("Enter a valid mobile number, e.g. 09171234567.");
    const btn = $id("phoneSendBtn"); btn.disabled = true;
    try {
      const user = await lookupUser("phone", phone);
      if (!user) { btn.disabled = false; return alert("This number is not linked to any staff account.\n\nLog in with your username and password, then link your number in Account Settings."); }
      const { error } = await getSupabase().auth.signInWithOtp({ phone });
      if (error) throw error;
      phoneCtx = { phone, user };
      $id("phoneSentTo").textContent = maskPhone(phone);
      step(["phStep1", "phStep2"], "phStep2");
      $id("phoneCode").focus();
      cooldown($id("phoneResendBtn"), 60);
    } catch (e) { alert(authErr(e)); }
    btn.disabled = false;
  }
  async function phoneVerify() {
    const token = digitsOnly($id("phoneCode").value);
    if (token.length < 6 || !phoneCtx) return alert("Enter the code that was sent to your phone.");
    try {
      const { data, error } = await getSupabase().auth.verifyOtp({ phone: phoneCtx.phone, token, type: "sms" });
      if (error) throw error;
      if (digitsOnly(data?.user?.phone) !== digitsOnly(phoneCtx.phone)) throw new Error("Verification failed.");
      await authSignOutLocal();
      loginAs(phoneCtx.user);
    } catch (e) { alert(authErr(e)); }
  }
  $id("phoneForm")?.addEventListener("submit", (e) => { e.preventDefault(); $id("phStep2").classList.contains("d-none") ? phoneSend() : phoneVerify(); });
  $id("phoneResendBtn")?.addEventListener("click", phoneSend);

  // ---- Forgot password: system gives a 6-digit code, then the user sets a new password ----
  const FG_STEPS = ["fgStep1", "fgStep2", "fgStep3"];
  const FG_LABELS = ["", "Get Code", "Verify Code", "Reset Password"];
  const FG_MAX_TRIES = 3, FG_MINUTES = 5;
  let fg = { step: 1, user: null, code: null, expires: 0, tries: 0 };
  function fgGo(n) { fg.step = n; step(FG_STEPS, FG_STEPS[n - 1]); $id("fgSubmit").textContent = FG_LABELS[n]; }
  function fgRestart() { fg = { step: 1, user: null, code: null, expires: 0, tries: 0 }; $id("fgCode").value = ""; fgGo(1); }
  async function findStaff(username) {
    if (authReady()) { try { return await lookupUser("username", username); } catch (e) { console.warn(e); } }
    return JSON.parse(localStorage.getItem("nt_users") || "[]").find((x) => x.username === username) || null;
  }
  $id("forgotLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    fgRestart();
    ["fgUser", "fgPass", "fgPass2"].forEach((i) => ($id(i).value = ""));
    showPanel("forgotForm");
    $id("fgUser").value = $id("loginUser").value.trim();
    $id("fgUser").focus();
  });
  async function fgFind() {
    const u = $id("fgUser").value.trim();
    if (!u) return alert("Enter your username.");
    const user = await findStaff(u);
    if (!user) return alert("Username not found.");
    fg.user = user;
    fg.code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    fg.expires = Date.now() + FG_MINUTES * 60 * 1000;
    fg.tries = 0;
    $id("fgShownCode").textContent = fg.code;
    fgGo(2);
    $id("fgCode").focus();
  }
  function fgVerify() {
    if (Date.now() > fg.expires) { alert("The code has expired. Please get a new one."); return fgRestart(); }
    if (digitsOnly($id("fgCode").value) !== fg.code) {
      fg.tries++;
      if (fg.tries >= FG_MAX_TRIES) { alert("Too many wrong attempts. Please get a new code."); return fgRestart(); }
      return alert(`Incorrect code. ${FG_MAX_TRIES - fg.tries} attempt(s) left.`);
    }
    fg.code = null; // one-time use
    fgGo(3);
    $id("fgPass").focus();
  }
  async function fgReset() {
    const p = $id("fgPass").value, p2 = $id("fgPass2").value;
    if (p.length < 6) return alert("Password must be at least 6 characters.");
    if (p !== p2) return alert("Passwords do not match!");
    if (!fg.user) return fgRestart();
    const uname = fg.user.username, hp = await hashPassword(p);
    try {
      if (authReady()) {
        const { data, error } = await getSupabase().from("users").update({ password: hp }).eq("username", uname).select();
        if (error) throw error;
        if (!data || !data.length) throw new Error("Could not update the password. Please try again.");
      }
      const users = JSON.parse(localStorage.getItem("nt_users") || "[]");
      const lu = users.find((x) => x.username === uname);
      if (lu) { lu.password = hp; localStorage.setItem("nt_users", JSON.stringify(users)); }
    } catch (e) { return alert(authErr(e)); }
    fgRestart();
    alert("Password updated! You can now log in with your new password.");
    document.querySelector("[data-tab=login]")?.click();
    $id("loginUser").value = uname; $id("loginPass").value = ""; $id("loginPass").focus();
  }
  $id("forgotForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    [null, fgFind, fgVerify, fgReset][fg.step]();
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
      if (b.dataset.view === "trash") renderTrash();
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
function sexBadge(g) { const l = sexLetter(g); return l ? `<span class="sx ${l === "M" ? "sx-m" : "sx-f"}">${l}</span>` : ""; }
function ipBadge(v) { const y = String(v || "").toUpperCase() === "YES"; return `<span class="ipb ${y ? "ipb-yes" : ""}">${y ? "YES" : "NO"}</span>`; }
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

// A child = same name + date of birth (used for the duplicate check).
const normKey = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const childKey = (c) => normKey(c.name) + "|" + (c.dob || "");

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
  set("dDate", new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));

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
    // Duplicate NAME check (kahit iba ang birthday / date measured)
    const newName = byId("cName").value.trim();
    const nameExists = list.find((x) => normKey(x.name) === normKey(newName));
    if (nameExists) {
      alert(`⚠️ "${nameExists.name}" already exists!`);
      byId("cName").focus();
      return;
    }
    const same = list.filter((x) => childKey(x) === childKey({ name: byId("cName").value, dob }));
    if (same.some((x) => x.date === measured)) return alert("Duplicate: this child already has a record measured on that date. Use Update to edit it.");
    if (same.length && !confirm(`"${same[0].name}" (same birthday) already has ${same.length} record(s).
Save anyway?`)) return;
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
  return getChildren().filter((c) => (!window.showOver60Only || Number(c.age) >= 60) && (!q || `${c.name} ${c.mother} ${c.purok} ${c.address}`.toLowerCase().includes(q)));
}

// ==================== 60+ MONTHS ALERT ====================
window.showOver60Only = false;
function toggleOver60() { window.showOver60Only = !window.showOver60Only; renderTable(); }
window.toggleOver60 = toggleOver60;
function renderAgeAlert() {
  const over = getChildren().filter((c) => c.age != null && c.age !== "" && Number(c.age) >= 60);
  const badge = byId("ageBadge");
  if (badge) { badge.textContent = over.length; badge.classList.toggle("d-none", !over.length); }
  const box = byId("ageAlert");
  if (!box) return;
  if (!over.length) { box.classList.add("d-none"); box.innerHTML = ""; window.showOver60Only = false; return; }
  const names = over.slice(0, 3).map((c) => esc(c.name)).join(", ") + (over.length > 3 ? ` +${over.length - 3} more` : "");
  box.classList.remove("d-none");
  box.innerHTML = `<span class="age-alert-ico">⚠️</span>
    <div class="age-alert-txt"><b>${over.length} ${over.length === 1 ? "child has" : "children have"} reached 60 months or older</b> (beyond 0-59 months coverage)<br><small>${names}</small></div>
    <button type="button" class="age-alert-btn" onclick="toggleOver60()">${window.showOver60Only ? "Show all records" : "Show only these"}</button>`;
}
function actionButtons(id) {
  return `<button class="btn-outline btn-action act-edit" title="Update record" onclick="editChild('${id}')">✏️ Update</button>
          <button class="btn-outline btn-action act-del" title="Delete record" onclick="deleteChild('${id}')">🗑️ Delete</button>`;
}
function fmtStamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function whoCell(user, iso) {
  if (!user) return '<span class="who-none">—</span>';
  const t = fmtStamp(iso);
  return `<div class="who-cell"><b>${esc(user)}</b>${t ? `<small>${esc(t)}</small>` : ""}</div>`;
}
// Age badge: red if 60 months or older (beyond 0-59 months coverage)
function ageCell(age) {
  if (age == null || age === "") return "";
  return Number(age) >= 60
    ? `<span class="age-over" title="Beyond 0-59 months coverage">⚠ ${esc(age)}</span>`
    : esc(age);
}
function renderTable() {
  const tbody = document.querySelector("#recordsTable tbody");
  if (!tbody) return;
  renderAgeAlert();
  const list = getFilteredRecords();
  const rc = byId("recCount"); if (rc) rc.textContent = list.length;
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:20px;color:#888">No records found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((c, i) => `
    <tr class="${Number(c.age) >= 60 ? "row-over" : ""}">
      <td data-label="No.">${i + 1}</td>
      <td data-label="Purok">${esc(c.purok)}</td>
      <td data-label="Address" title="${esc(c.address)}"><span class="addr-ellipsis">${esc(c.address)}</span></td>
      <td data-label="Mother / Caregiver">${esc(c.mother)}</td>
      <td data-label="Child"><b>${esc(c.name)}</b></td>
      <td data-label="IP Group">${ipBadge(c.ip)}</td>
      <td data-label="Sex">${sexBadge(c.gender)}</td>
      <td data-label="Date of Birth">${esc(c.dob)}</td>
      <td data-label="Date Measured">${esc(c.date)}</td>
      <td data-label="Weight (kg)">${esc(c.weight)}</td>
      <td data-label="Height (cm)">${esc(c.height)}</td>
      <td data-label="Age (mos)">${ageCell(c.age)}</td>
      <td data-label="Added by">${whoCell(c.created_by, c.created_at)}</td>
      <td data-label="Last updated by">${whoCell(c.updated_by, c.updated_at)}</td>
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
// Real .xlsx export (SheetJS) - columns are auto-sized so dates never show as ########.
// dateCols = indexes of columns that hold yyyy-mm-dd dates.
function downloadXLSX(filename, sheetName, headers, rows, dateCols) {
  dateCols = dateCols || [];
  if (typeof XLSX === "undefined") {
    return downloadCSV(filename.replace(/\.xlsx$/, ".csv"), headers, rows); // offline fallback
  }
  const data = rows.map((r) => r.map((v, ci) => {
    if (dateCols.includes(ci) && /^\d{4}-\d{2}-\d{2}/.test(String(v || ""))) {
      const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }
    return v == null ? "" : v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data], { cellDates: true });
  Object.keys(ws).forEach((k) => {
    if (k[0] === "!") return;
    const col = XLSX.utils.decode_cell(k).c, row = XLSX.utils.decode_cell(k).r;
    if (row > 0 && dateCols.includes(col) && ws[k].t === "d") ws[k].z = "yyyy-mm-dd";
  });
  ws["!cols"] = headers.map((h, ci) => {
    let w = String(h).length;
    rows.forEach((r) => { w = Math.max(w, String(r[ci] == null ? "" : r[ci]).length); });
    return { wch: Math.min(Math.max(w + 3, dateCols.includes(ci) ? 14 : 8), 50) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
const REC_HEAD = ["No.", "Purok", "Address", "Mother/Caregiver", "Child", "IP Group", "Sex", "Date of Birth",
  "Date Measured", "Weight (kg)", "Height (cm)", "Age (months)"];
const recRow = (c, i) => [i + 1, c.purok, c.address, c.mother, c.name, c.ip || "NO", sexLetter(c.gender),
  c.dob, c.date, c.weight, c.height, c.age];

function exportAllToExcel() {
  const list = getFilteredRecords();
  if (!list.length) return alert("Walang records na i-export.");
  downloadXLSX("e-OPT-PLUS-SAOG.xlsx", "e-OPT PLUS", REC_HEAD, list.map(recRow), [7, 8]);
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
  <td class="mid"><div class="t">Community Level</div>
    <div class="s2">CHILD NUTRITION RECORD</div></td>
  <td class="rt">Year: <b>${year}</b><br>Region: <b>III Central Luzon</b></td>
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
    return `<div class="card normal"><h3>${n}</h3><p>${p} - Total Children</p></div>`;
  }).join("");
  const list = purokList();
  document.querySelector("#purokTable tbody").innerHTML = list.length ? list.map((c) => `
    <tr>
      <td data-label="Name"><b>${esc(c.name)}</b></td>
      <td data-label="Sex">${sexBadge(c.gender)}</td>
      <td data-label="Date of Birth">${esc(c.dob)}</td>
      <td data-label="Age (mos)">${ageCell(c.age)}</td>
      <td data-label="Address">${esc(c.address)}</td>
      <td data-label="Weight (kg)">${esc(c.weight)}</td>
      <td data-label="Height (cm)">${esc(c.height)}</td>
      <td>${actionButtons(c.id)}</td>
    </tr>`).join("")
    : `<tr><td colspan="8" style="text-align:center;padding:20px;color:#888">Walang records sa ${activePurok}.</td></tr>`;
}
const PUROK_HEAD = ["Name", "Sex", "Date of Birth", "Age (months)", "Address", "Weight (kg)", "Height (cm)"];
const purokRow = (c) => [c.name, sexLetter(c.gender), c.dob, c.age, c.address, c.weight, c.height];
function exportPurokToExcel() {
  const list = purokList();
  if (!list.length) return alert("Walang records sa " + activePurok + ".");
  downloadXLSX(`Purok-Monitoring-${activePurok.replace(" ", "")}.xlsx`, activePurok, PUROK_HEAD, list.map(purokRow), [2]);
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
  if (age < 0) return alert("Age cannot be negative.");
  if (age > 59 && !confirm("The child is already " + age + " months old (beyond the 0-59 months coverage). Save anyway?")) return;
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
  byId("deleteMsg").textContent = `"${c.name}" will be moved to Trash. You can restore it from the Trash page.`;
  byId("deleteModal").classList.add("show");
}
function closeDeleteModal() { pendingDeleteId = null; byId("deleteModal").classList.remove("show"); }
function confirmDelete() {
  const id = pendingDeleteId;
  closeDeleteModal();
  if (id) moveToTrash(id);
}
window.deleteChild = deleteChild;

// ==================== TRASH ====================
// Deleted records live in their own Supabase table ("children_trash"), NOT in "children".
function getTrash() {
  try { return JSON.parse(localStorage.getItem("nt_trash_shared") || "[]"); } catch { return []; }
}
function saveTrash(list) { try { localStorage.setItem("nt_trash_shared", JSON.stringify(list)); } catch {} }
function getTrashSynced() { try { return new Set(JSON.parse(localStorage.getItem("nt_trash_synced") || "[]")); } catch { return new Set(); } }
function saveTrashSynced(set) { try { localStorage.setItem("nt_trash_synced", JSON.stringify([...set])); } catch {} }

function trashToRow(c) {
  return { ...childToRow(c), created_by: c.created_by || null, created_at: c.created_at || null,
    updated_by: c.updated_by || null, updated_at: c.updated_at || null,
    deleted_by: c.deleted_by || null, deleted_at: c.deleted_at || null };
}
function updateTrashBadge() {
  const b = byId("trashBadge"); if (!b) return;
  const n = getTrash().length;
  b.textContent = n; b.classList.toggle("d-none", n === 0);
}
function trashMissingMsg(e) {
  const m = String((e && (e.message || e.details)) || "").toLowerCase();
  return /children_trash/.test(m) || (e && (e.code === "42P01" || e.code === "PGRST205"));
}
function trashAlert(e) {
  if (trashMissingMsg(e)) alert("Hindi pa nagagawa ang 'children_trash' table sa Supabase. Patakbuhin muna ang SQL para sa Trash (nasa instructions), tapos subukan ulit.");
  else alert("Hindi na-save sa Trash ang record: " + (e && e.message ? e.message : e));
}

async function moveToTrash(id) {
  const list = getChildren();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  const item = { ...c, deleted_by: getCurrentUsernameGlobal(), deleted_at: new Date().toISOString() };
  // local first (instant UI)
  saveChildren(list.filter((x) => x.id !== id));
  saveTrash([item, ...getTrash().filter((x) => x.id !== id)]);
  refreshAll(); renderTrash();

  const sb = sbClient();
  if (!sb) return;
  pendingOps++; opSeq++;
  try {
    // 1) save into the trash table first (so nothing is lost), 2) then remove from children
    let { error } = await sb.from("children_trash").upsert(trashToRow(item), { onConflict: "local_id" });
    if (error) throw error;
    const ts = getTrashSynced(); ts.add(id); saveTrashSynced(ts);
    ({ error } = await sb.from("children").delete().eq("local_id", id));
    if (error) throw error;
    const st = getSyncedSet(); st.delete(id); saveSyncedSet(st);
    setDbStatus(true, "Moved to trash");
  } catch (e) {
    // could not reach the trash table -> undo locally so the record is not lost
    saveTrash(getTrash().filter((x) => x.id !== id));
    const { deleted_by, deleted_at, ...orig } = item;
    saveChildren([...getChildren().filter((x) => x.id !== id), orig]);
    refreshAll(); renderTrash();
    sbError(e); trashAlert(e);
  } finally { pendingOps--; }
}

async function restoreFromTrash(id) {
  const item = getTrash().find((x) => x.id === id);
  if (!item) return;
  const { deleted_by, deleted_at, ...orig } = item;
  saveTrash(getTrash().filter((x) => x.id !== id));
  saveChildren([...getChildren().filter((x) => x.id !== id), orig]);
  refreshAll(); renderTrash();

  const sb = sbClient();
  if (!sb) return;
  pendingOps++; opSeq++;
  try {
    let { error } = await sb.from("children").upsert(childToRow(orig), { onConflict: "local_id" });
    if (error && sbAuditOK() && isAuditColErr(error)) {
      localStorage.setItem("nt_sb_no_audit", "1");
      ({ error } = await sb.from("children").upsert(childToRow(orig), { onConflict: "local_id" }));
    }
    if (error) throw error;
    markSynced(id);
    ({ error } = await sb.from("children_trash").delete().eq("local_id", id));
    if (error) throw error;
    const ts = getTrashSynced(); ts.delete(id); saveTrashSynced(ts);
    setDbStatus(true, "Restored");
  } catch (e) { sbError(e); }
  finally { pendingOps--; }
}

let pendingPermId = null;
function askPermDelete(id) {
  const c = getTrash().find((x) => x.id === id);
  if (!c) return;
  pendingPermId = id;
  byId("permDeleteMsg").textContent = `"${c.name}" will be deleted permanently and cannot be restored.`;
  byId("permDeleteModal").classList.add("show");
}
function closePermDeleteModal() { pendingPermId = null; byId("permDeleteModal").classList.remove("show"); }
async function confirmPermDelete() {
  const id = pendingPermId;
  closePermDeleteModal();
  if (!id) return;
  saveTrash(getTrash().filter((x) => x.id !== id));
  renderTrash();
  const sb = sbClient();
  if (!sb) return;
  pendingOps++; opSeq++;
  try {
    const { error } = await sb.from("children_trash").delete().eq("local_id", id);
    if (error) throw error;
    const ts = getTrashSynced(); ts.delete(id); saveTrashSynced(ts);
    setDbStatus(true, "Deleted permanently");
  } catch (e) { sbError(e); }
  finally { pendingOps--; }
}

function deletedCell(user, iso) {
  if (!user) return '<span class="who-none">—</span>';
  const t = fmtStamp(iso);
  return `<div class="del-chip"><span class="del-av">${esc(String(user).charAt(0).toUpperCase())}</span>
    <div class="who-cell"><b>${esc(user)}</b>${t ? `<small>${esc(t)}</small>` : ""}</div></div>`;
}
function renderTrash() {
  updateTrashBadge();
  const tb = document.querySelector("#trashTable tbody");
  if (!tb) return;
  const list = getTrash();
  const cnt = byId("trashCount"); if (cnt) cnt.textContent = list.length;
  if (!list.length) {
    tb.innerHTML = `<tr class="trash-empty-row"><td colspan="14" class="trash-empty">
      <div class="te-ico">🗑️</div><div class="te-t">Trash is empty</div>
      <div class="te-s">Deleted child records will show up here.</div></td></tr>`;
    return;
  }
  tb.innerHTML = list.map((c, i) => `<tr>
    <td data-label="No.">${i + 1}</td>
    <td data-label="Purok">${esc(c.purok)}</td>
    <td data-label="Address" title="${esc(c.address)}">${esc(c.address)}</td>
    <td data-label="Mother / Caregiver">${esc(c.mother)}</td>
    <td data-label="Child"><b>${esc(c.name)}</b></td>
    <td data-label="IP Group">${ipBadge(c.ip)}</td>
    <td data-label="Sex">${sexBadge(c.gender)}</td>
    <td data-label="Date of Birth">${esc(c.dob || "")}</td>
    <td data-label="Date Measured">${esc(c.date || "")}</td>
    <td data-label="Weight (kg)">${c.weight != null && c.weight !== "" ? esc(c.weight) : ""}</td>
    <td data-label="Height (cm)">${c.height != null && c.height !== "" ? esc(c.height) : ""}</td>
    <td data-label="Age (mos)">${ageCell(c.age)}</td>
    <td data-label="Deleted by">${deletedCell(c.deleted_by, c.deleted_at)}</td>
    <td>
      <button class="btn-outline btn-action act-restore" onclick="restoreFromTrash('${esc(c.id)}')">♻️ Restore</button>
      <button class="btn-outline btn-action act-perm" onclick="askPermDelete('${esc(c.id)}')">❌ Delete Permanently</button>
    </td>
  </tr>`).join("");
}
window.restoreFromTrash = restoreFromTrash;
window.askPermDelete = askPermDelete;
window.closePermDeleteModal = closePermDeleteModal;
window.confirmPermDelete = confirmPermDelete;

// download trash from Supabase (shared between all devices)
async function pullTrash(sb, seq0) {
  const { data, error } = await sb.from("children_trash").select("*");
  if (error) throw error;
  if (opSeq !== seq0 || pendingOps > 0) return;
  const local = getTrash();
  const synced = getTrashSynced();
  const remoteIds = new Set(data.map((r) => r.local_id));
  const oldById = new Map(local.map((c) => [c.id, c]));
  const merged = data.map((r) => ({
    ...rowToChild(r, r.local_id, oldById.get(r.local_id)),
    deleted_by: r.deleted_by ?? oldById.get(r.local_id)?.deleted_by ?? null,
    deleted_at: r.deleted_at ?? oldById.get(r.local_id)?.deleted_at ?? null,
  }));
  const toPush = [];
  for (const c of local) {
    if (remoteIds.has(c.id) || synced.has(c.id)) continue;   // synced+missing = restored/deleted elsewhere
    merged.push(c); toPush.push(trashToRow(c));
  }
  if (toPush.length) {
    const { error: pe } = await sb.from("children_trash").upsert(toPush, { onConflict: "local_id" });
    if (pe) throw pe;
  }
  merged.sort((a, b) => String(b.deleted_at || "").localeCompare(String(a.deleted_at || "")));
  saveTrashSynced(new Set([...remoteIds, ...toPush.map((r) => r.local_id)]));
  if (JSON.stringify(merged) !== JSON.stringify(local)) {
    saveTrash(merged);
    renderTrash();
  } else updateTrashBadge();
}

// ==================== SUPABASE SYNC (device -> Supabase "children" table) ====================
function sbClient() {
  try {
    if (typeof getSupabase === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
      return getSupabase();
    }
  } catch (e) { console.warn(e); }
  return null;
}
// Status badge is hidden when everything is fine (sync still runs in the background).
// It only appears if Supabase sync fails, so problems are not silent.
function setDbStatus(ok, msg) {
  const el = byId("dbStatus");
  console.log(ok ? "[Supabase]" : "[Supabase ERROR]", msg);
  if (!el) return;
  if (ok) { el.classList.add("d-none"); return; }
  el.classList.remove("d-none", "db-connected", "db-offline");
  el.classList.add("db-offline");
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
    ...(sbAuditOK() ? {
      created_by: c.created_by || null,
      created_at: c.created_at || null,
      updated_by: c.updated_by || null,
      updated_at: c.updated_at || null,
    } : {}),
  };
}
// created_by/updated_by columns may not exist in Supabase yet. If the first sync fails because of
// them, we drop those fields (local tracking still works) and remember it.
function sbAuditOK() { return localStorage.getItem("nt_sb_no_audit") !== "1"; }
function isAuditColErr(e) {
  const m = String((e && (e.message || e.details)) || "").toLowerCase();
  return /created_by|updated_by|created_at|updated_at/.test(m) || (e && e.code === "PGRST204");
}
function sbError(err) {
  console.error("Supabase sync error:", err);
  setDbStatus(false, "⚠️ Supabase: " + (err && err.message ? err.message : err));
}
// ---- shared-database logic: Supabase is the single source of truth for ALL devices ----
let opSeq = 0;        // bumps on every write; a pull that overlapped a write is discarded
let pendingOps = 0;   // writes in flight; we don't pull while one is running (would overwrite fresh edits)
let pulling = false;
function getSyncedSet() { try { return new Set(JSON.parse(localStorage.getItem("nt_synced_ids") || "[]")); } catch { return new Set(); } }
function saveSyncedSet(set) { try { localStorage.setItem("nt_synced_ids", JSON.stringify([...set])); } catch {} }
function markSynced(id) { const st = getSyncedSet(); st.add(id); saveSyncedSet(st); }

async function syncChild(c) {
  const sb = sbClient();
  if (!sb || !c) return;
  pendingOps++; opSeq++;
  try {
    let { error } = await sb.from("children").upsert(childToRow(c), { onConflict: "local_id" });
    if (error && sbAuditOK() && isAuditColErr(error)) {
      localStorage.setItem("nt_sb_no_audit", "1");
      ({ error } = await sb.from("children").upsert(childToRow(c), { onConflict: "local_id" }));
    }
    if (error) throw error;
    markSynced(c.id);
    setDbStatus(true, "Saved to Supabase");
  } catch (e) { sbError(e); }
  finally { pendingOps--; }
}
async function removeRemote(localId) {
  const sb = sbClient();
  if (!sb || !localId) return;
  pendingOps++; opSeq++;
  try {
    const { error } = await sb.from("children").delete().eq("local_id", localId);
    if (error) throw error;
    const st = getSyncedSet(); st.delete(localId); saveSyncedSet(st);
    setDbStatus(true, "Synced");
  } catch (e) { sbError(e); }
  finally { pendingOps--; }
}

function rowToChild(r, lid, old) {
  old = old || {};
  return {
    id: lid,
    purok: r.purok || "",
    address: r.address || "",
    mother: r.mother || "",
    name: r.name || "",
    ip: r.ip || "NO",
    gender: r.gender || "",
    dob: r.dob || "",
    date: r.date_measured || "",
    weight: r.weight,
    height: r.height,
    age: r.age,
    created_by: r.created_by ?? old.created_by ?? null,
    created_at: r.created_at ?? old.created_at ?? null,
    updated_by: r.updated_by ?? old.updated_by ?? null,
    updated_at: r.updated_at ?? old.updated_at ?? null,
  };
}

// Download everything from Supabase and make it the local list (all devices see the same records).
async function pullFromSupabase(force) {
  const sb = sbClient();
  if (!sb) { setDbStatus(false, "Offline (local only)"); return false; }
  if (pulling || (pendingOps > 0 && !force)) return false;
  pulling = true;
  const seq0 = opSeq;
  try {
    const { data, error } = await sb.from("children").select("*");
    if (error) throw error;
    if (opSeq !== seq0 || pendingOps > 0) return false;   // something was edited meanwhile -> skip this pull

    // audit columns exist in the table? -> clear the "no audit" flag automatically
    if (data.length && "updated_by" in data[0]) localStorage.removeItem("nt_sb_no_audit");
    const auditCols = data.length && "updated_by" in data[0];

    const local = getChildren();
    const before = JSON.stringify(local);
    const oldById = new Map(local.map((c) => [c.id, c]));
    const synced = getSyncedSet();
    const norm = (v) => String(v || "").trim().toLowerCase();
    const remoteIds = new Set();
    const merged = [];
    const backfill = [];   // old records whose created_by only exists locally -> push to DB

    // local records that never reached the DB (used to match very old rows without local_id)
    const unsyncedLocal = local.filter((c) => !synced.has(c.id));
    const remoteLocalIds = new Set(data.filter((r) => r.local_id).map((r) => r.local_id));

    for (const r of data) {
      let lid = r.local_id;
      if (!lid) {
        const m = unsyncedLocal.find((c) => !remoteLocalIds.has(c.id) && norm(c.name) === norm(r.name)
          && Math.abs(Number(c.weight) - Number(r.weight)) < 0.01 && Math.abs(Number(c.height) - Number(r.height)) < 0.01);
        lid = m ? m.id : "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        const { error: le } = await sb.from("children").update({ local_id: lid }).eq("id", r.id);
        if (le) lid = "sb_" + r.id;
        remoteLocalIds.add(lid);
      }
      remoteIds.add(lid);
      const old = oldById.get(lid);
      const child = rowToChild(r, lid, old);
      child._rid = r.id;
      if (auditCols && !r.created_by && old && old.created_by) backfill.push(childToRow(child));
      merged.push(child);
    }

    // records only on this device: deleted from another device (drop) or never uploaded (push)
    const toPush = [];
    for (const c of local) {
      if (remoteIds.has(c.id)) continue;
      if (synced.has(c.id)) continue;       // was in DB before, now gone -> deleted elsewhere
      merged.push(c);
      toPush.push(childToRow(c));
    }
    const pushRows = [...toPush, ...backfill];
    if (pushRows.length) {
      const { error: pe } = await sb.from("children").upsert(pushRows, { onConflict: "local_id" });
      if (pe) throw pe;
    }

    merged.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""))
      || (a._rid || 0) - (b._rid || 0));
    merged.forEach((c) => { delete c._rid; normalizeChild(c); });

    const newSynced = new Set([...remoteIds, ...toPush.map((r) => r.local_id)]);
    saveSyncedSet(newSynced);

    const changed = JSON.stringify(merged) !== before;
    if (changed) saveChildren(merged);
    setDbStatus(true, "Supabase synced (" + merged.length + ")");
    if (changed) refreshAll();
    try { await pullTrash(sb, seq0); }
    catch (te) { console.warn("Trash sync:", te); if (trashMissingMsg(te)) setDbStatus(false, "⚠️ Create the 'children_trash' table in Supabase (see SQL)"); }
    return true;
  } catch (e) { sbError(e); return false; }
  finally { pulling = false; }
}
const syncAllToSupabase = () => pullFromSupabase(true);

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
  const hp = await hashPassword(p);
  try {
    if (typeof getSupabase === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
      await getSupabase().from("users").update({ username: nu, password: hp }).eq("username", old);
    }
  } catch (e) { console.warn(e); }
  const users = JSON.parse(localStorage.getItem("nt_users") || "[]");
  const u = users.find((x) => x.username === old);
  if (u) { u.username = nu; u.password = hp; }
  localStorage.setItem("nt_users", JSON.stringify(users));
  const cu = getCurrentUserGlobal() || {};
  cu.username = nu; delete cu.password;
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
  updateTrashBadge();
  syncAllToSupabase();                       // load shared records from Supabase
  setInterval(() => pullFromSupabase(), 15000); // pick up other devices' changes every 15s
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pullFromSupabase(); });
  window.addEventListener("focus", () => pullFromSupabase());
  const s = byId('searchInput');
  if (s) s.addEventListener('input', renderTable);
});
