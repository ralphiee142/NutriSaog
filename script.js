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
      if (b.dataset.view === "feeding") renderFeeding();
    });
  });
}



// ==================== E-OPT PLUS WHO TABLES (NNC / WHO Child Growth Standards) ====================
// Source: user's images + WHO https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height
// Tables based on images: Weight for Age Boys/Girls 0-71 months, Height for Age Boys/Girls

const WFA_BOYS = {
0:{su:2.1, uw_from:2.2, uw_to:2.4, n_from:2.5, n_to:4.4, ow:4.5},
1:{su:2.9, uw_from:3.0, uw_to:3.3, n_from:3.4, n_to:5.8, ow:5.9},
2:{su:3.8, uw_from:3.9, uw_to:4.2, n_from:4.3, n_to:7.1, ow:7.2},
3:{su:4.4, uw_from:4.5, uw_to:4.9, n_from:5.0, n_to:8.0, ow:8.1},
4:{su:4.9, uw_from:5.0, uw_to:5.5, n_from:5.6, n_to:8.7, ow:8.8},
5:{su:5.3, uw_from:5.4, uw_to:5.9, n_from:6.0, n_to:9.3, ow:9.4},
6:{su:5.7, uw_from:5.8, uw_to:6.3, n_from:6.4, n_to:9.8, ow:9.9},
7:{su:5.9, uw_from:6.0, uw_to:6.6, n_from:6.7, n_to:10.3, ow:10.4},
8:{su:6.2, uw_from:6.3, uw_to:6.8, n_from:6.9, n_to:10.7, ow:10.8},
9:{su:6.4, uw_from:6.5, uw_to:7.0, n_from:7.1, n_to:11.0, ow:11.1},
10:{su:6.6, uw_from:6.7, uw_to:7.3, n_from:7.4, n_to:11.4, ow:11.5},
11:{su:6.8, uw_from:6.9, uw_to:7.5, n_from:7.6, n_to:11.7, ow:11.8},
12:{su:6.9, uw_from:7.0, uw_to:7.6, n_from:7.7, n_to:12.0, ow:12.1},
13:{su:7.1, uw_from:7.2, uw_to:7.8, n_from:7.9, n_to:12.3, ow:12.4},
14:{su:7.2, uw_from:7.3, uw_to:8.0, n_from:8.1, n_to:12.6, ow:12.7},
15:{su:7.4, uw_from:7.5, uw_to:8.2, n_from:8.3, n_to:12.8, ow:12.9},
16:{su:7.5, uw_from:7.6, uw_to:8.3, n_from:8.4, n_to:13.1, ow:13.2},
17:{su:7.7, uw_from:7.8, uw_to:8.5, n_from:8.6, n_to:13.4, ow:13.5},
18:{su:7.8, uw_from:7.9, uw_to:8.7, n_from:8.8, n_to:13.7, ow:13.8},
19:{su:8.0, uw_from:8.1, uw_to:8.8, n_from:8.9, n_to:13.9, ow:14.0},
20:{su:8.1, uw_from:8.2, uw_to:9.0, n_from:9.1, n_to:14.2, ow:14.3},
21:{su:8.2, uw_from:8.3, uw_to:9.1, n_from:9.2, n_to:14.5, ow:14.6},
22:{su:8.4, uw_from:8.5, uw_to:9.3, n_from:9.4, n_to:14.7, ow:14.8},
23:{su:8.5, uw_from:8.6, uw_to:9.4, n_from:9.5, n_to:15.0, ow:15.1},
24:{su:8.6, uw_from:8.7, uw_to:9.6, n_from:9.7, n_to:15.3, ow:15.4},
25:{su:8.8, uw_from:8.9, uw_to:9.7, n_from:9.8, n_to:15.5, ow:15.6},
26:{su:8.9, uw_from:9.0, uw_to:9.9, n_from:10.0, n_to:15.8, ow:15.9},
27:{su:9.0, uw_from:9.1, uw_to:10.0, n_from:10.1, n_to:16.1, ow:16.2},
28:{su:9.1, uw_from:9.2, uw_to:10.1, n_from:10.2, n_to:16.3, ow:16.4},
29:{su:9.2, uw_from:9.3, uw_to:10.3, n_from:10.4, n_to:16.6, ow:16.7},
30:{su:9.4, uw_from:9.5, uw_to:10.4, n_from:10.5, n_to:16.9, ow:17.0},
31:{su:9.5, uw_from:9.6, uw_to:10.6, n_from:10.7, n_to:17.1, ow:17.2},
32:{su:9.6, uw_from:9.7, uw_to:10.7, n_from:10.8, n_to:17.4, ow:17.5},
33:{su:9.7, uw_from:9.8, uw_to:10.8, n_from:10.9, n_to:17.6, ow:17.7},
34:{su:9.8, uw_from:9.9, uw_to:10.9, n_from:11.0, n_to:17.8, ow:17.9},
35:{su:9.9, uw_from:10.0, uw_to:11.1, n_from:11.2, n_to:18.1, ow:18.2},
36:{su:10.0, uw_from:10.1, uw_to:11.2, n_from:11.3, n_to:18.3, ow:18.4},
37:{su:10.1, uw_from:10.2, uw_to:11.3, n_from:11.4, n_to:18.6, ow:18.7},
38:{su:10.2, uw_from:10.3, uw_to:11.4, n_from:11.5, n_to:18.8, ow:18.9},
39:{su:10.3, uw_from:10.4, uw_to:11.5, n_from:11.6, n_to:19.0, ow:19.1},
40:{su:10.4, uw_from:10.5, uw_to:11.7, n_from:11.8, n_to:19.3, ow:19.4},
41:{su:10.5, uw_from:10.6, uw_to:11.8, n_from:11.9, n_to:19.5, ow:19.6},
42:{su:10.6, uw_from:10.7, uw_to:11.9, n_from:12.0, n_to:19.7, ow:19.8},
43:{su:10.7, uw_from:10.8, uw_to:12.0, n_from:12.1, n_to:20.0, ow:20.1},
44:{su:10.8, uw_from:10.9, uw_to:12.1, n_from:12.2, n_to:20.2, ow:20.3},
45:{su:10.9, uw_from:11.0, uw_to:12.3, n_from:12.4, n_to:20.5, ow:20.6},
46:{su:11.0, uw_from:11.1, uw_to:12.4, n_from:12.5, n_to:20.7, ow:20.8},
47:{su:11.1, uw_from:11.2, uw_to:12.5, n_from:12.6, n_to:20.9, ow:21.0},
48:{su:11.2, uw_from:11.3, uw_to:12.6, n_from:12.7, n_to:21.2, ow:21.3},
49:{su:11.3, uw_from:11.4, uw_to:12.7, n_from:12.8, n_to:21.4, ow:21.5},
50:{su:11.4, uw_from:11.5, uw_to:12.8, n_from:12.9, n_to:21.7, ow:21.8},
51:{su:11.5, uw_from:11.5, uw_to:13.0, n_from:13.1, n_to:21.9, ow:22.0},
52:{su:11.6, uw_from:11.7, uw_to:13.1, n_from:13.2, n_to:22.2, ow:22.3},
53:{su:11.7, uw_from:11.8, uw_to:13.2, n_from:13.3, n_to:22.4, ow:22.5},
54:{su:11.8, uw_from:11.9, uw_to:13.3, n_from:13.4, n_to:22.7, ow:22.8},
55:{su:11.9, uw_from:12.0, uw_to:13.4, n_from:13.5, n_to:22.9, ow:23.0},
56:{su:12.0, uw_from:12.1, uw_to:13.5, n_from:13.6, n_to:23.2, ow:23.3},
57:{su:12.1, uw_from:12.2, uw_to:13.6, n_from:13.7, n_to:23.4, ow:23.5},
58:{su:12.2, uw_from:12.3, uw_to:13.7, n_from:13.8, n_to:23.7, ow:23.8},
59:{su:12.3, uw_from:12.4, uw_to:13.9, n_from:14.0, n_to:23.9, ow:24.0},
60:{su:12.4, uw_from:12.5, uw_to:14.0, n_from:14.1, n_to:24.2, ow:24.3},
61:{su:12.7, uw_from:12.8, uw_to:14.3, n_from:14.4, n_to:24.3, ow:24.4},
62:{su:12.8, uw_from:12.9, uw_to:14.4, n_from:14.5, n_to:24.4, ow:24.5},
63:{su:13.0, uw_from:13.1, uw_to:14.5, n_from:14.6, n_to:24.7, ow:24.8},
64:{su:13.1, uw_from:13.2, uw_to:14.7, n_from:14.8, n_to:24.9, ow:25.0},
65:{su:13.2, uw_from:13.3, uw_to:14.8, n_from:14.9, n_to:25.2, ow:25.3},
66:{su:13.3, uw_from:13.4, uw_to:14.9, n_from:15.0, n_to:25.5, ow:25.6},
67:{su:13.4, uw_from:13.5, uw_to:15.1, n_from:15.2, n_to:25.7, ow:25.8},
68:{su:13.6, uw_from:13.7, uw_to:15.2, n_from:15.3, n_to:26.0, ow:26.1},
69:{su:13.7, uw_from:13.8, uw_to:15.3, n_from:15.4, n_to:26.3, ow:26.4},
70:{su:13.8, uw_from:13.9, uw_to:15.5, n_from:15.6, n_to:26.6, ow:26.7},
71:{su:13.9, uw_from:14.0, uw_to:15.6, n_from:15.7, n_to:26.8, ow:26.9}
};

const WFA_GIRLS = {
0:{su:2.0, uw_from:2.1, uw_to:2.3, n_from:2.4, n_to:4.2, ow:4.3},
1:{su:2.7, uw_from:2.8, uw_to:3.1, n_from:3.2, n_to:5.5, ow:5.6},
2:{su:3.4, uw_from:3.5, uw_to:3.8, n_from:3.9, n_to:6.6, ow:6.7},
3:{su:4.0, uw_from:4.1, uw_to:4.4, n_from:4.5, n_to:7.5, ow:7.6},
4:{su:4.4, uw_from:4.5, uw_to:4.9, n_from:5.0, n_to:8.2, ow:8.3},
5:{su:4.8, uw_from:4.9, uw_to:5.3, n_from:5.4, n_to:8.8, ow:8.9},
6:{su:5.1, uw_from:5.2, uw_to:5.6, n_from:5.7, n_to:9.3, ow:9.4},
7:{su:5.3, uw_from:5.4, uw_to:5.9, n_from:6.0, n_to:9.8, ow:9.9},
8:{su:5.6, uw_from:5.7, uw_to:6.2, n_from:6.3, n_to:10.2, ow:10.3},
9:{su:5.8, uw_from:5.9, uw_to:6.4, n_from:6.5, n_to:10.5, ow:10.6},
10:{su:5.9, uw_from:6.0, uw_to:6.6, n_from:6.7, n_to:10.9, ow:11.0},
11:{su:6.1, uw_from:6.2, uw_to:6.8, n_from:6.9, n_to:11.2, ow:11.3},
12:{su:6.3, uw_from:6.4, uw_to:6.9, n_from:7.0, n_to:11.5, ow:11.6},
13:{su:6.4, uw_from:6.5, uw_to:7.1, n_from:7.2, n_to:11.8, ow:11.9},
14:{su:6.6, uw_from:6.7, uw_to:7.3, n_from:7.4, n_to:12.1, ow:12.2},
15:{su:6.7, uw_from:6.8, uw_to:7.5, n_from:7.6, n_to:12.4, ow:12.5},
16:{su:6.9, uw_from:7.0, uw_to:7.6, n_from:7.7, n_to:12.6, ow:12.7},
17:{su:7.0, uw_from:7.1, uw_to:7.8, n_from:7.9, n_to:12.9, ow:13.0},
18:{su:7.2, uw_from:7.3, uw_to:8.0, n_from:8.1, n_to:13.2, ow:13.3},
19:{su:7.3, uw_from:7.4, uw_to:8.1, n_from:8.2, n_to:13.5, ow:13.6},
20:{su:7.5, uw_from:7.6, uw_to:8.3, n_from:8.4, n_to:13.7, ow:13.8},
21:{su:7.6, uw_from:7.7, uw_to:8.5, n_from:8.6, n_to:14.0, ow:14.1},
22:{su:7.8, uw_from:7.9, uw_to:8.6, n_from:8.7, n_to:14.3, ow:14.4},
23:{su:7.9, uw_from:8.0, uw_to:8.8, n_from:8.9, n_to:14.6, ow:14.7},
24:{su:8.1, uw_from:8.2, uw_to:8.9, n_from:9.0, n_to:14.8, ow:14.9},
25:{su:8.2, uw_from:8.3, uw_to:9.1, n_from:9.2, n_to:15.1, ow:15.2},
26:{su:8.4, uw_from:8.5, uw_to:9.3, n_from:9.4, n_to:15.4, ow:15.5},
27:{su:8.5, uw_from:8.6, uw_to:9.4, n_from:9.5, n_to:15.7, ow:15.8},
28:{su:8.6, uw_from:8.7, uw_to:9.6, n_from:9.7, n_to:16.0, ow:16.1},
29:{su:8.8, uw_from:8.9, uw_to:9.7, n_from:9.8, n_to:16.2, ow:16.3},
30:{su:8.9, uw_from:9.0, uw_to:9.9, n_from:10.0, n_to:16.5, ow:16.6},
31:{su:9.0, uw_from:9.1, uw_to:10.0, n_from:10.1, n_to:16.8, ow:16.9},
32:{su:9.1, uw_from:9.2, uw_to:10.2, n_from:10.3, n_to:17.1, ow:17.2},
33:{su:9.3, uw_from:9.4, uw_to:10.3, n_from:10.4, n_to:17.3, ow:17.4},
34:{su:9.4, uw_from:9.5, uw_to:10.4, n_from:10.5, n_to:17.6, ow:17.7},
35:{su:9.5, uw_from:9.6, uw_to:10.6, n_from:10.7, n_to:17.9, ow:18.0},
36:{su:9.6, uw_from:9.7, uw_to:10.7, n_from:10.8, n_to:18.1, ow:18.2},
37:{su:9.7, uw_from:9.8, uw_to:10.8, n_from:10.9, n_to:18.4, ow:18.5},
38:{su:9.8, uw_from:9.9, uw_to:11.0, n_from:11.1, n_to:18.7, ow:18.8},
39:{su:9.9, uw_from:10.0, uw_to:11.1, n_from:11.2, n_to:19.0, ow:19.1},
40:{su:10.1, uw_from:10.2, uw_to:11.2, n_from:11.3, n_to:19.2, ow:19.3},
41:{su:10.2, uw_from:10.3, uw_to:11.4, n_from:11.5, n_to:19.5, ow:19.6},
42:{su:10.3, uw_from:10.4, uw_to:11.5, n_from:11.6, n_to:19.8, ow:19.9},
43:{su:10.4, uw_from:10.5, uw_to:11.6, n_from:11.7, n_to:20.1, ow:20.2},
44:{su:10.5, uw_from:10.6, uw_to:11.7, n_from:11.8, n_to:20.4, ow:20.5},
45:{su:10.6, uw_from:10.7, uw_to:11.9, n_from:12.0, n_to:20.7, ow:20.8},
46:{su:10.7, uw_from:10.8, uw_to:12.0, n_from:12.1, n_to:20.9, ow:21.0},
47:{su:10.8, uw_from:10.9, uw_to:12.1, n_from:12.2, n_to:21.2, ow:21.3},
48:{su:10.9, uw_from:11.0, uw_to:12.2, n_from:12.3, n_to:21.5, ow:21.6},
49:{su:11.0, uw_from:11.1, uw_to:12.3, n_from:12.4, n_to:21.8, ow:21.9},
50:{su:11.1, uw_from:11.2, uw_to:12.4, n_from:12.5, n_to:22.1, ow:22.2},
51:{su:11.2, uw_from:11.3, uw_to:12.6, n_from:12.7, n_to:22.4, ow:22.5},
52:{su:11.3, uw_from:11.4, uw_to:12.7, n_from:12.8, n_to:22.6, ow:22.7},
53:{su:11.4, uw_from:11.5, uw_to:12.8, n_from:12.9, n_to:22.9, ow:23.0},
54:{su:11.5, uw_from:11.6, uw_to:12.9, n_from:13.0, n_to:23.2, ow:23.3},
55:{su:11.6, uw_from:11.7, uw_to:13.1, n_from:13.2, n_to:23.5, ow:23.6},
56:{su:11.7, uw_from:11.8, uw_to:13.2, n_from:13.3, n_to:23.8, ow:23.9},
57:{su:11.8, uw_from:11.9, uw_to:13.3, n_from:13.4, n_to:24.1, ow:24.2},
58:{su:11.9, uw_from:12.0, uw_to:13.4, n_from:13.5, n_to:24.4, ow:24.5},
59:{su:12.0, uw_from:12.1, uw_to:13.5, n_from:13.6, n_to:24.6, ow:24.7},
60:{su:12.1, uw_from:12.2, uw_to:13.6, n_from:13.7, n_to:24.7, ow:24.8},
61:{su:12.4, uw_from:12.5, uw_to:13.9, n_from:14.0, n_to:24.8, ow:24.9},
62:{su:12.5, uw_from:12.6, uw_to:14.0, n_from:14.1, n_to:25.1, ow:25.2},
63:{su:12.6, uw_from:12.7, uw_to:14.1, n_from:14.2, n_to:25.4, ow:25.5},
64:{su:12.7, uw_from:12.8, uw_to:14.2, n_from:14.3, n_to:25.6, ow:25.7},
65:{su:12.8, uw_from:12.9, uw_to:14.3, n_from:14.4, n_to:25.9, ow:26.0},
66:{su:12.9, uw_from:13.0, uw_to:14.5, n_from:14.6, n_to:26.2, ow:26.3},
67:{su:13.0, uw_from:13.1, uw_to:14.6, n_from:14.7, n_to:26.5, ow:26.6},
68:{su:13.1, uw_from:13.2, uw_to:14.7, n_from:14.8, n_to:26.7, ow:26.8},
69:{su:13.2, uw_from:13.3, uw_to:14.8, n_from:14.9, n_to:27.0, ow:27.1},
70:{su:13.3, uw_from:13.4, uw_to:14.9, n_from:15.0, n_to:27.3, ow:27.4},
71:{su:13.4, uw_from:13.5, uw_to:15.1, n_from:15.2, n_to:27.6, ow:27.7}
};

// Height for Age tables - from user's images
const HFA_BOYS = {
0:{ss:44.1, s_from:44.2, s_to:46.0, n_from:46.1, n_to:53.7, tall:53.8},
1:{ss:48.8, s_from:48.9, s_to:50.7, n_from:50.8, n_to:58.6, tall:58.7},
2:{ss:52.3, s_from:52.4, s_to:54.3, n_from:54.4, n_to:62.4, tall:62.5},
3:{ss:55.2, s_from:55.3, s_to:57.2, n_from:57.3, n_to:65.6, tall:65.6},
4:{ss:57.5, s_from:57.6, s_to:59.6, n_from:59.7, n_to:68.0, tall:68.1},
5:{ss:59.5, s_from:59.6, s_to:61.6, n_from:61.7, n_to:70.1, tall:70.2},
6:{ss:61.1, s_from:61.2, s_to:63.2, n_from:63.3, n_to:71.9, tall:72.0},
7:{ss:62.6, s_from:62.7, s_to:64.7, n_from:64.8, n_to:73.5, tall:73.6},
8:{ss:63.9, s_from:64.0, s_to:66.1, n_from:66.2, n_to:75.0, tall:75.1},
9:{ss:65.1, s_from:65.2, s_to:67.4, n_from:67.5, n_to:76.5, tall:76.6},
10:{ss:66.3, s_from:66.4, s_to:68.6, n_from:68.7, n_to:77.9, tall:78.0},
11:{ss:67.5, s_from:67.6, s_to:69.8, n_from:69.9, n_to:79.2, tall:79.3},
12:{ss:68.5, s_from:68.6, s_to:70.9, n_from:71.0, n_to:80.5, tall:80.6},
24:{ss:77.9, s_from:78.0, s_to:80.9, n_from:81.0, n_to:93.2, tall:93.3},
36:{ss:84.9, s_from:85.0, s_to:88.1, n_from:88.2, n_to:103.5, tall:103.6},
48:{ss:90.6, s_from:90.7, s_to:94.8, n_from:94.9, n_to:111.7, tall:111.8},
60:{ss:96.0, s_from:96.1, s_to:100.6, n_from:100.7, n_to:119.2, tall:119.3}
};

const HFA_GIRLS = {
0:{ss:43.5, s_from:43.6, s_to:45.2, n_from:45.3, n_to:52.9, tall:53.0},
1:{ss:47.7, s_from:47.8, s_to:49.7, n_from:49.8, n_to:57.6, tall:57.7},
2:{ss:50.9, s_from:51.0, s_to:52.9, n_from:53.0, n_to:61.1, tall:61.2},
3:{ss:53.4, s_from:53.5, s_to:55.5, n_from:55.6, n_to:64.0, tall:64.1},
4:{ss:55.5, s_from:55.6, s_to:57.7, n_from:57.8, n_to:66.4, tall:66.5},
5:{ss:57.3, s_from:57.4, s_to:59.5, n_from:59.6, n_to:68.5, tall:68.6},
6:{ss:58.8, s_from:58.9, s_to:61.1, n_from:61.2, n_to:70.3, tall:70.4},
7:{ss:60.2, s_from:60.3, s_to:62.6, n_from:62.7, n_to:71.9, tall:72.0},
8:{ss:61.6, s_from:61.7, s_to:63.9, n_from:64.0, n_to:73.5, tall:73.6},
9:{ss:62.8, s_from:62.9, s_to:65.2, n_from:65.3, n_to:75.0, tall:75.1},
10:{ss:64.0, s_from:64.1, s_to:66.4, n_from:66.5, n_to:76.4, tall:76.5},
11:{ss:65.1, s_from:65.2, s_to:67.6, n_from:67.7, n_to:77.8, tall:77.9},
12:{ss:66.2, s_from:66.3, s_to:68.8, n_from:68.9, n_to:79.2, tall:79.3},
24:{ss:75.9, s_from:76.0, s_to:79.2, n_from:79.3, n_to:92.2, tall:92.3},
36:{ss:83.5, s_from:83.6, s_to:87.3, n_from:87.4, n_to:102.7, tall:102.8},
48:{ss:89.7, s_from:89.8, s_to:94.0, n_from:94.1, n_to:111.2, tall:111.4},
60:{ss:95.1, s_from:95.2, s_to:99.8, n_from:99.9, n_to:116.9, tall:117.0}
};

// Weight for Length/Height - WHO official (NNC adopted)
// Using simplified field tables from WHO https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height
const WFH_BOYS = {
45:{m3:1.9, m2:2.0, m1:2.2, med:2.4, p1:2.6, p2:2.9, p3:3.1},
50:{m3:3.0, m2:3.3, m1:3.6, med:3.9, p1:4.2, p2:4.6, p3:5.0},
55:{m3:4.0, m2:4.3, m1:4.7, med:5.1, p1:5.5, p2:6.0, p3:6.5},
60:{m3:4.9, m2:5.3, m1:5.7, med:6.2, p1:6.7, p2:7.3, p3:7.9},
65:{m3:6.0, m2:6.4, m1:7.0, med:7.6, p1:8.2, p2:8.9, p3:9.6},
70:{m3:7.0, m2:7.5, m1:8.1, med:8.8, p1:9.5, p2:10.3, p3:11.1},
75:{m3:7.8, m2:8.4, m1:9.1, med:9.8, p1:10.6, p2:11.5, p3:12.4},
80:{m3:8.6, m2:9.2, m1:10.0, med:10.8, p1:11.7, p2:12.7, p3:13.7},
85:{m3:9.4, m2:10.1, m1:11.0, med:11.9, p1:12.9, p2:14.0, p3:15.1},
90:{m3:10.2, m2:11.0, m1:11.9, med:12.9, p1:14.0, p2:15.2, p3:16.4},
95:{m3:11.0, m2:11.9, m1:12.9, med:14.1, p1:15.3, p2:16.7, p3:18.0},
100:{m3:11.8, m2:12.8, m1:14.0, med:15.3, p1:16.7, p2:18.2, p3:19.7},
105:{m3:12.7, m2:13.8, m1:15.1, med:16.5, p1:18.1, p2:19.8, p3:21.4},
110:{m3:13.6, m2:14.8, m1:16.2, med:17.8, p1:19.5, p2:21.4, p3:23.2}
};
const WFH_GIRLS = {
45:{m3:1.9, m2:2.0, m1:2.2, med:2.3, p1:2.5, p2:2.7, p3:3.0},
50:{m3:2.9, m2:3.2, m1:3.5, med:3.8, p1:4.1, p2:4.5, p3:4.9},
55:{m3:3.8, m2:4.1, m1:4.5, med:4.9, p1:5.3, p2:5.8, p3:6.3},
60:{m3:4.7, m2:5.1, m1:5.5, med:6.0, p1:6.5, p2:7.1, p3:7.7},
65:{m3:5.7, m2:6.1, m1:6.6, med:7.2, p1:7.8, p2:8.5, p3:9.2},
70:{m3:6.6, m2:7.1, m1:7.7, med:8.3, p1:9.0, p2:9.8, p3:10.6},
75:{m3:7.4, m2:8.0, m1:8.6, med:9.3, p1:10.1, p2:11.0, p3:11.9},
80:{m3:8.2, m2:8.8, m1:9.5, med:10.2, p1:11.1, p2:12.1, p3:13.1},
85:{m3:9.0, m2:9.6, m1:10.4, med:11.2, p1:12.2, p2:13.3, p3:14.4},
90:{m3:9.8, m2:10.5, m1:11.4, med:12.3, p1:13.4, p2:14.6, p3:15.8},
95:{m3:10.6, m2:11.4, m1:12.4, med:13.4, p1:14.6, p2:16.0, p3:17.3},
100:{m3:11.4, m2:12.3, m1:13.3, med:14.5, p1:15.8, p2:17.3, p3:18.7},
105:{m3:12.3, m2:13.3, m1:14.4, med:15.7, p1:17.2, p2:18.8, p3:20.4},
110:{m3:13.2, m2:14.2, m1:15.5, med:16.9, p1:18.5, p2:20.2, p3:21.9}
};

// ==================== CLASSIFICATION ====================
function sexLetter(g) { return (g || "").toString().charAt(0).toUpperCase(); }
function sexFull(g) { return sexLetter(g) === "F" ? "Female" : sexLetter(g) === "M" ? "Male" : ""; }

function computeAgeInMonths(dobStr, measuredStr){
  if(!dobStr || !measuredStr) return null;
  const dob = new Date(dobStr);
  const meas = new Date(measuredStr);
  if(isNaN(dob) || isNaN(meas)) return null;
  let years = meas.getFullYear() - dob.getFullYear();
  let months = meas.getMonth() - dob.getMonth();
  let total = years*12 + months; // disregard days per NNC instruction
  return total <0 ? 0 : total;
}

function classifyWFA(ageMonths, weight, sex){
  if(ageMonths==null || weight==null) return 'N';
  let table = sexLetter(sex)==='F' ? WFA_GIRLS : WFA_BOYS;
  // find closest age if not exact
  let row = table[ageMonths];
  if(!row){
    let keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
    let closest = keys.reduce((prev,curr)=> Math.abs(curr-ageMonths) < Math.abs(prev-ageMonths) ? curr : prev);
    row = table[closest];
  }
  if(!row) return 'N';
  if(weight <= row.su) return 'SUW';
  if(weight >= row.uw_from && weight <= row.uw_to) return 'UW';
  if(weight >= row.n_from && weight <= row.n_to) return 'N';
  if(weight >= row.ow) return 'OW';
  return 'N';
}

// Interpolate between table rows (HFA only has some ages, WFH only every 5 cm)
function interpRow(table, key) {
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (key <= keys[0]) return table[keys[0]];
  if (key >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  let lo = keys[0], hi = keys[keys.length - 1];
  for (const k of keys) {
    if (k <= key) lo = k;
    if (k >= key) { hi = k; break; }
  }
  if (lo === hi) return table[lo];
  const t = (key - lo) / (hi - lo), a = table[lo], b = table[hi], r = {};
  for (const f in a) r[f] = a[f] + (b[f] - a[f]) * t;
  return r;
}

function classifyHFA(ageMonths, height, sex) {
  if (ageMonths == null || height == null || isNaN(height)) return "N";
  const table = sexLetter(sex) === "F" ? HFA_GIRLS : HFA_BOYS;
  const r = interpRow(table, ageMonths);
  if (height < r.s_from) return "SS";
  if (height < r.n_from) return "S";
  if (height >= r.tall) return "T";
  return "N";
}

function classifyWFH(heightCm, weightKg, sex) {
  if (!heightCm || !weightKg || isNaN(heightCm) || isNaN(weightKg)) return "N";
  const table = sexLetter(sex) === "F" ? WFH_GIRLS : WFH_BOYS;
  const r = interpRow(table, heightCm);
  if (weightKg < r.m3) return "SW";
  if (weightKg < r.m2) return "W";
  if (weightKg <= r.p2) return "N";
  if (weightKg <= r.p3) return "OW";
  return "O";
}

// Global compute for add form
function autoComputeEOPT(){
  const dob = document.getElementById('cDOB')?.value;
  const measured = document.getElementById('cDate')?.value;
  const w = parseFloat(document.getElementById('cWeight')?.value);
  const h = parseFloat(document.getElementById('cHeight')?.value);
  const sex = document.getElementById('cGender')?.value;
  let age = parseInt(document.getElementById('cAge')?.value, 10); // manual input
  if(isNaN(age)) age = null;
  let wfa = age!=null && !isNaN(w) ? classifyWFA(age,w,sex) : '';
  let hfa = age!=null && !isNaN(h) ? classifyHFA(age,h,sex) : '';
  let wfh = !isNaN(w) && !isNaN(h) ? classifyWFH(h,w,sex) : '';
  if(document.getElementById('cWFA')) document.getElementById('cWFA').value = wfa;
  if(document.getElementById('cHFA')) document.getElementById('cHFA').value = hfa;
  if(document.getElementById('cWFH')) document.getElementById('cWFH').value = wfh;
  const bmiBox = document.getElementById('bmiResultBox');
  if(bmiBox){
    document.getElementById('bmiValue').textContent = age!=null? age+' months' : '--';
    document.getElementById('bmiClass').textContent = `WFA:${wfa} | HFA:${hfa} | WFH:${wfh}`;
    const girl = sexLetter(sex)==='F' ? 'Girls' : 'Boys';
    document.getElementById('rangeInfo').innerHTML = `<small>Based on WHO Child Growth Standards adopted by NNC (nnc.gov.ph).<br>WFA source: ${girl} table, HFA: ${girl} table, WFH: WHO weight-for-length/height https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height</small>`;
    bmiBox.style.display='block';
  }
}
window.autoComputeEOPT = autoComputeEOPT;

// ==================== DATA LAYER ====================
const PUROK_LIST = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6"];
let activePurok = "Purok 1";
let pendingDeleteId = null;
let statusChartInst = null;
let childrenCache = null;

function byId(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function getCurrentUserGlobal(){ try{ const s=localStorage.getItem('nt_current'); return s?JSON.parse(s):null;}catch{return null;} }
function getCurrentUsernameGlobal(){ const u=getCurrentUserGlobal(); return u? u.username||u.name||'admin':'admin';}
function getChildrenStorageKeyGlobal(){ return `nt_children_${getCurrentUsernameGlobal()}`; }
if(typeof getCurrentUser==='undefined'){ var getCurrentUser=getCurrentUserGlobal; var getCurrentUsername=getCurrentUsernameGlobal; var getChildrenStorageKey=getChildrenStorageKeyGlobal; }

function getChildrenSync(){
  try{
    const shared = localStorage.getItem('nt_children_shared');
    if(shared) return JSON.parse(shared);
  }catch{}
  try{
    const key = typeof getChildrenStorageKey==='function'? getChildrenStorageKey() : 'nt_children';
    const v = localStorage.getItem(key);
    if(v) return JSON.parse(v);
  }catch{}
  try{
    const old = localStorage.getItem('nt_children');
    if(old) return JSON.parse(old);
  }catch{}
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

// Normalize old records: "Purok 6" format + compute missing WFA/HFA/WFH
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
  const a = c.age, w = c.weight, h = c.height, sex = c.gender;
  if (!c.wfa) c.wfa = a != null && !isNaN(w) ? classifyWFA(a, w, sex) : "N";
  if (!c.hfa) c.hfa = a != null && !isNaN(h) ? classifyHFA(a, h, sex) : "N";
  if (!c.wfh) c.wfh = !isNaN(w) && !isNaN(h) ? classifyWFH(h, w, sex) : "N";
  c.status = c.wfa;
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

function getStats(list) {
  return {
    total: list.length,
    normal: list.filter((c) => c.wfa === "N").length,
    uw: list.filter((c) => c.wfa === "UW").length,
    suw: list.filter((c) => c.wfa === "SUW").length,
    ow: list.filter((c) => c.wfa === "OW").length,
    stunted: list.filter((c) => c.hfa === "S" || c.hfa === "SS").length,
    wasted: list.filter((c) => c.wfh === "W" || c.wfh === "SW").length,
  };
}
function st(code) { return `<span class="st st-${esc(code || "N")}">${esc(code || "N")}</span>`; }

function refreshAll() {
  renderDashboard();
  renderTable();
  if (byId("view-purok")?.classList.contains("active")) renderPurok();
  if (byId("view-feeding")?.classList.contains("active")) renderFeeding();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const s = getStats(getChildren());
  const set = (id, v) => { const e = byId(id); if (e) e.textContent = v; };
  set("totalChildren", s.total);
  set("totalNormal", s.normal);
  set("totalUnder", s.uw);
  set("totalSevere", s.suw);
  set("totalOver", s.ow);
  set("totalStunted", s.stunted);
  set("totalWasted", s.wasted);
  renderStatusChart(s);
}

function renderStatusChart(s) {
  const cv = byId("statusChart");
  if (!cv || typeof Chart === "undefined") return;
  const labels = ["Normal", "Underweight", "Severely Underweight", "Overweight", "Stunted", "Wasted"];
  const data = [s.normal, s.uw, s.suw, s.ow, s.stunted, s.wasted];
  const colors = ["#1a7a4c", "#ffb300", "#c62828", "#fb8c00", "#8e24aa", "#1e88e5"];
  if (statusChartInst) statusChartInst.destroy();
  statusChartInst = new Chart(cv, {
    type: "bar",
    data: { labels, datasets: [{ label: "Children", data, backgroundColor: colors, borderRadius: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 30 } },
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grace: "15%", ticks: { precision: 0 } } },
    },
    plugins: [{
      id: "vals",
      afterDatasetsDraw(c) {
        const ctx = c.ctx;
        ctx.save();
        ctx.font = "bold 13px Poppins, sans-serif";
        ctx.fillStyle = "#222";
        ctx.textAlign = "center";
        c.getDatasetMeta(0).data.forEach((b, i) => ctx.fillText(data[i], b.x, b.y - 6));
        ctx.restore();
      },
    }],
  });
}

// ==================== ADD FORM ====================
const childForm = document.getElementById('childForm');
if (childForm) {
  childForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const dob = byId("cDOB").value, measured = byId("cDate").value;
    if (dob && measured && dob > measured) return alert("Date of Birth cannot be later than Date Measured.");
    const age = parseInt(byId("cAge").value, 10); // manual input
    if (isNaN(age)) return alert("Please enter the Age in Months.");
    if (age < 0 || age > 59) return alert("Age must be 0-59 months (coverage).");
    const w = parseFloat(byId("cWeight").value), h = parseFloat(byId("cHeight").value);
    const sex = byId("cGender").value;
    const wfa = classifyWFA(age, w, sex), hfa = classifyHFA(age, h, sex), wfh = classifyWFH(h, w, sex);
    const list = getChildren();
    list.push({
      id: "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      no: list.length + 1,
      purok: byId("cPurok").value,
      address: byId("cAddress").value.trim(),
      mother: byId("cMother").value.trim(),
      name: byId("cName").value.trim(),
      ip: byId("cIP").value,
      gender: sex, dob, date: measured, weight: w, height: h, age, wfa, hfa, wfh,
      status: wfa,
      bmi: Math.round((w / Math.pow(h / 100, 2)) * 10) / 10,
      created_by: getCurrentUsernameGlobal(),
      created_at: new Date().toISOString(),
    });
    saveChildren(list);
    syncChild(list[list.length - 1]);
    alert("Record saved!  WFA: " + wfa + "  |  HFA: " + hfa + "  |  WFL/H: " + wfh);
    resetForm();
    refreshAll();
  });
}

function resetForm(){
  const f=document.getElementById('childForm');
  if(f) f.reset();
  document.getElementById('editId').value='';
  document.getElementById('cAge').value='';
  document.getElementById('cWFA').value='';
  document.getElementById('cHFA').value='';
  document.getElementById('cWFH').value='';
  const box=document.getElementById('bmiResultBox');
  if(box) box.style.display='none';
}
window.resetForm = resetForm;

// ==================== ALL RECORDS ====================
function matchesStatus(c, f) {
  if (!f) return true;
  if (f === "S") return c.hfa === "S" || c.hfa === "SS";
  if (f === "W") return c.wfh === "W" || c.wfh === "SW";
  if (f === "N") return c.wfa === "N";
  if (f === "UW" || f === "SUW") return c.wfa === f;
  if (f === "OW") return c.wfa === "OW" || c.wfh === "OW";
  if (f === "SS") return c.hfa === "SS";
  if (f === "SW") return c.wfh === "SW";
  if (f === "O") return c.wfh === "O";
  return false;
}
function getFilteredRecords() {
  const search = (byId("searchInput")?.value || "").toLowerCase().trim();
  const filter = byId("filterStatus")?.value || "";
  return getChildren().filter((c) => {
    const txt = `${c.name} ${c.mother} ${c.purok} ${c.address}`.toLowerCase();
    if (search && !txt.includes(search)) return false;
    return matchesStatus(c, filter);
  });
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
    tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;padding:20px;color:#888">No records found.</td></tr>';
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
      <td>${st(c.wfa)}</td>
      <td>${st(c.hfa)}</td>
      <td>${st(c.wfh)}</td>
      <td>${actionButtons(c.id)}</td>
    </tr>`).join("");
}
window.renderTable = renderTable;

const REC_HEAD = ["No.", "Purok", "Address", "Mother/Caregiver", "Child", "IP Group", "Sex", "Date of Birth",
  "Date Measured", "Weight (kg)", "Height (cm)", "Age (months)", "WFA", "HFA", "WFL/H"];
function recRow(c, i) {
  return [i + 1, c.purok, c.address, c.mother, c.name, c.ip || "NO", sexLetter(c.gender), c.dob, c.date,
    c.weight, c.height, c.age, c.wfa, c.hfa, c.wfh];
}

// ==================== EXPORT / PRINT HELPERS ====================
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
const EOPT_DATE = "05/05/2026"; // petsa ng e-OPT tool sa header ng print - palitan dito kung magbago
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${MONTHS[+m[2] - 1]}-${m[3]}-${m[1]}` : s || "";
}
function num1(v) { const n = parseFloat(v); return isNaN(n) ? "" : n.toFixed(1); }

// Print in the official Community Level e-OPT PLUS Tool layout
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
      <td class="s s-${esc(c.wfa)}">${esc(c.wfa)}</td>
      <td class="s s-${esc(c.hfa)}">${esc(c.hfa)}</td>
      <td class="s s-${esc(c.wfh)}">${esc(c.wfh)}</td>
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
  .olive { background: #9b8a3e; font-size: 6.5pt !important; }
  .brown { background: #3f342b; }
  .olive2 { background: #8a7a3a; }
  .grid td { padding: 3px 5px; height: 17px; background: #fff; }
  .ctr { text-align: center; }
  .b { font-weight: 700; }
  .s { text-align: center; font-weight: 700; background: #78b32b !important; }
  .s-UW, .s-S, .s-W { background: #f4a300 !important; }
  .s-SUW, .s-SS, .s-SW { background: #e0393e !important; color: #fff; }
  .s-OW { background: #ffe066 !important; }
  .s-T { background: #9ccc65 !important; }
  .s-O { background: #bf360c !important; color: #fff; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .legend { margin-top: 8px; font-size: 7.5pt; color: #333; }
</style></head><body>
<table class="top"><tr>
  <td class="tf"><span class="red">TOOL IS FOR:</span><div class="bg">Barangay</div></td>
  <td class="mid"><div class="t">Community Level e-OPT PLUS Tool</div>
    <div class="s2">WEIGHT FOR AGE, HEIGHT FOR AGE, &amp; WEIGHT FOR LENGTH/HEIGHT STATUS</div></td>
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
  <th rowspan="2" class="blue" style="width:17%">Address or Location<br>of Child's Residence<br><span>(Purok, Block #, Area or Location in the barangay)</span></th>
  <th rowspan="2" class="blue" style="width:13%">Name of Mother<br>or Caregiver<br><span>(Surname, First Name)</span></th>
  <th rowspan="2" class="blue" style="width:15%">Full Name of Child<br><span>(Surname, First Name)</span></th>
  <th rowspan="2" class="blue" style="width:5%">Belongs to IP<br>Group?<br><span>YES/NO</span></th>
  <th rowspan="2" class="blue" style="width:3.5%">Sex<br><span>M/F</span></th>
  <th colspan="2" class="yellow">IMPORTANT INFO ON DATE FORMAT<br>ENTRY: PLS READ</th>
  <th rowspan="2" class="blue" style="width:4.5%">Weight<br><span>(kg)</span></th>
  <th rowspan="2" class="blue" style="width:4.5%">Height<br><span>(cm)</span></th>
  <th colspan="4" class="olive">NO DATA ENTRY REQUIRED<br>RESULTS WILL BE AUTO-FILLED</th>
</tr>
<tr>
  <th class="blue" style="width:7%">Date of Birth</th>
  <th class="blue" style="width:7%">Date Measured</th>
  <th class="brown" style="width:5%">Age in<br>Months</th>
  <th class="olive2" style="width:6%">Weight for Age<br>Status</th>
  <th class="olive2" style="width:6%">Height for Age<br>Status</th>
  <th class="olive2" style="width:6%">Weight for Lt/Ht<br>Status</th>
</tr>
</thead>
<tbody>${body}</tbody></table>
<div class="legend">${LEGEND}</div>
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
const TODAY = () => new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
const LEGEND = "<b>Legend:</b> WFA: N=Normal, UW=Underweight, SUW=Severely Underweight, OW=Overweight | HFA: N=Normal, S=Stunted, SS=Severely Stunted, T=Tall | WFL/H: N=Normal, W=Wasted, SW=Severely Wasted, OW=Overweight, O=Obese";

function exportAllToExcel() {
  const list = getFilteredRecords();
  if (!list.length) return alert("Walang records na i-export.");
  downloadCSV("e-OPT-PLUS-SAOG-15columns.csv", REC_HEAD, list.map(recRow));
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
  const all = getChildren().filter((c) => c.purok === activePurok);
  const s = getStats(all);
  const box = byId("purokStats");
  if (box) box.innerHTML = `
    <div class="card card-total"><h3>${s.total}</h3><p>Total Children - ${activePurok}</p></div>
    <div class="card normal"><h3>${s.normal}</h3><p>Normal</p></div>
    <div class="card under"><h3>${s.uw}</h3><p>Underweight</p></div>
    <div class="card severely"><h3>${s.suw}</h3><p>Severely Underweight</p></div>
    <div class="card over"><h3>${s.ow}</h3><p>Overweight</p></div>
    <div class="card stunted"><h3>${s.stunted}</h3><p>Stunted</p></div>
    <div class="card wasted"><h3>${s.wasted}</h3><p>Wasted</p></div>`;
  const tbody = document.querySelector("#purokTable tbody");
  const list = purokList();
  tbody.innerHTML = list.length ? list.map((c) => `
    <tr>
      <td><b>${esc(c.name)}</b></td>
      <td>${sexLetter(c.gender)}</td>
      <td>${c.age != null ? esc(c.age) : ""}</td>
      <td>${esc(c.address)}</td>
      <td>${esc(c.weight)}</td>
      <td>${esc(c.height)}</td>
      <td>${st(c.wfa)}</td><td>${st(c.hfa)}</td><td>${st(c.wfh)}</td>
      <td>${actionButtons(c.id)}</td>
    </tr>`).join("")
    : `<tr><td colspan="10" style="text-align:center;padding:20px;color:#888">Walang records sa ${activePurok}.</td></tr>`;
}
const PUROK_HEAD = ["Name", "Sex", "Age (months)", "Address", "Weight (kg)", "Height (cm)", "WFA", "HFA", "WFL/H"];
const purokRow = (c) => [c.name, sexLetter(c.gender), c.age, c.address, c.weight, c.height, c.wfa, c.hfa, c.wfh];
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

// ==================== FEEDING PROGRAM ====================
function feedingBase() { return getChildren().filter((c) => c.wfa === "UW" || c.wfa === "SUW"); }
function feedingList() {
  const q = (byId("feedingSearch")?.value || "").toLowerCase().trim();
  return feedingBase().filter((c) => !q || `${c.name} ${c.purok} ${c.address}`.toLowerCase().includes(q));
}
function renderFeeding() {
  const base = feedingBase();
  const counts = {};
  PUROK_LIST.forEach((p) => (counts[p] = 0));
  base.forEach((c) => { if (c.purok) counts[c.purok] = (counts[c.purok] || 0) + 1; });
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = ranked[0] ? ranked[0][1] : 0;
  byId("feedTotal").textContent = base.length;
  byId("feedPurokCount").textContent = ranked.filter((r) => r[1] > 0).length;
  byId("topPurokName").textContent = max > 0 ? `${ranked[0][0]} (${max})` : "-";
  byId("purokRankingList").innerHTML = ranked.map(([p, n], i) => `
    <div class="rank-row">
      <span class="rank-no">${i + 1}</span><span class="rank-name">${p}</span>
      <div class="rank-bar"><div style="width:${max ? (n / max) * 100 : 0}%"></div></div><b>${n}</b>
    </div>`).join("");
  const list = feedingList();
  document.querySelector("#feedingTable tbody").innerHTML = list.length ? list.map((c) => `
    <tr>
      <td><b>${esc(c.name)}</b></td><td>${sexLetter(c.gender)}</td><td>${esc(c.purok)}</td>
      <td>${c.age != null ? esc(c.age) + " mos" : ""}</td><td>${st(c.wfa)}</td>
      <td>${esc(c.weight)} kg</td><td>${esc(c.address)}</td>
    </tr>`).join("")
    : '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Walang Underweight na bata.</td></tr>';
}
const FEED_HEAD = ["Name", "Sex", "Purok", "Age (months)", "WFA Status", "Weight (kg)", "Address"];
const feedRow = (c) => [c.name, sexLetter(c.gender), c.purok, c.age, c.wfa, c.weight, c.address];
function exportFeedingToExcel() {
  const list = feedingList();
  if (!list.length) return alert("Walang records na i-export.");
  downloadCSV("Feeding-Program-List.csv", FEED_HEAD, list.map(feedRow));
}
function printFeedingReport() {
  const list = feedingList();
  if (!list.length) return alert("Walang records na i-print.");
  printEOPT(list, { note: "FEEDING PROGRAM PRIORITY LIST - UNDERWEIGHT / SEVERELY UNDERWEIGHT" });
}
window.renderFeeding = renderFeeding;

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
  calcUpdateEOPT();
  byId("updateChildModal").classList.add("show");
}
function closeUpdateChildModal() { byId("updateChildModal").classList.remove("show"); }

function calcUpdateEOPT() {
  const dob = byId("uDOB").value, meas = byId("uDate").value, sex = byId("uGender").value;
  const w = parseFloat(byId("uWeight").value), h = parseFloat(byId("uHeight").value);
  let age = parseInt(byId("uAge").value, 10); // manual input
  if (isNaN(age)) age = null;
  const wfa = age != null && !isNaN(w) ? classifyWFA(age, w, sex) : "";
  const hfa = age != null && !isNaN(h) ? classifyHFA(age, h, sex) : "";
  const wfh = !isNaN(w) && !isNaN(h) ? classifyWFH(h, w, sex) : "";
  byId("uBmiValue").textContent = age != null ? age + " months" : "--";
  byId("uBmiClass").textContent = `WFA: ${wfa || "-"} | HFA: ${hfa || "-"} | WFL/H: ${wfh || "-"}`;
  byId("uBmiResultBox").classList.add("show");
  return { age, wfa, hfa, wfh, w, h, sex };
}

function saveUpdateChild(e) {
  if (e) e.preventDefault();
  const r = calcUpdateEOPT();
  if (r.age == null) return alert("Please enter the Age in Months.");
  if (r.age < 0 || r.age > 59) return alert("Age must be 0-59 months.");
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
    gender: r.sex,
    dob: byId("uDOB").value,
    date: byId("uDate").value,
    weight: r.w, height: r.h, age: r.age,
    wfa: r.wfa, hfa: r.hfa, wfh: r.wfh, status: r.wfa,
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
// Supabase "status" column only accepts Normal / Underweight / Overweight (check constraint).
// Exact result (N, UW, SUW, OW) is kept in the "wfa" column.
function legacyStatus(wfa) {
  return wfa === "UW" || wfa === "SUW" ? "Underweight" : wfa === "OW" ? "Overweight" : "Normal";
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
    bmi: !isNaN(w) && !isNaN(h) && h > 0 ? Math.round((w / Math.pow(h / 100, 2)) * 100) / 100 : null,
    status: legacyStatus(c.wfa),
    mother: c.mother || "",
    ip: c.ip || "NO",
    dob: c.dob || null,
    date_measured: c.date || null,
    wfa: c.wfa || "N",
    hfa: c.hfa || "N",
    wfh: c.wfh || "N",
    created_by: c.created_by || getCurrentUsernameGlobal(),
    updated_by: c.updated_by || getCurrentUsernameGlobal(),
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

// ==================== MODALS: click outside / Esc ====================
document.querySelectorAll(".modal-overlay").forEach((ov) => {
  ov.addEventListener("mousedown", (e) => { if (e.target === ov) ov.classList.remove("show"); });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".modal-overlay.show").forEach((m) => m.classList.remove("show"));
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded',()=>{
  if (!isDashboard) return;
  refreshAll();
  syncAllToSupabase();
  const s=document.getElementById('searchInput');
  if(s) s.addEventListener('input', renderTable);
  const f=document.getElementById('filterStatus');
  if(f) f.addEventListener('change', renderTable);
});
