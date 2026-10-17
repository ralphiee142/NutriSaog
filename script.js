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

function getClosestHFA(age){
  let keys = Object.keys(HFA_BOYS).map(Number).sort((a,b)=>a-b);
  let closest = keys[0];
  for(let k of keys){ if(Math.abs(k-age) < Math.abs(closest-age)) closest=k; }
  return closest;
}

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
  let table = (sex && sex.toString().toUpperCase().startsWith('F')) ? WFA_GIRLS : WFA_BOYS;
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
  // between gaps - interpolate as Normal if between uw_to and n_from etc
  if(weight > row.uw_to && weight < row.n_from) return 'N';
  if(weight > row.n_to && weight < row.ow) return 'N';
  return 'N';
}

function classifyHFA(ageMonths, height, sex){
  if(ageMonths==null || height==null) return 'N';
  let table = (sex && sex.toString().toUpperCase().startsWith('F')) ? HFA_GIRLS : HFA_BOYS;
  let row = table[ageMonths];
  if(!row){
    let ageKey = getClosestHFA(ageMonths);
    row = table[ageKey];
  }
  if(!row) return 'N';
  if(height < row.ss) return 'SS';
  if(height >= row.s_from && height <= row.s_to) return 'S';
  if(height >= row.n_from && height <= row.n_to) return 'N';
  if(height >= row.tall) return 'T';
  return 'N';
}

function classifyWFH(heightCm, weightKg, sex){
  if(!heightCm || !weightKg) return 'N';
  let table = (sex && sex.toString().toUpperCase().startsWith('F')) ? WFH_GIRLS : WFH_BOYS;
  // find closest height
  let keys = Object.keys(table).map(Number).sort((a,b)=>a-b);
  let closest = keys[0];
  for(let k of keys){ if(Math.abs(k-heightCm) <= Math.abs(closest-heightCm)) closest=k; }
  let row = table[closest];
  if(!row) return 'N';
  if(weightKg < row.m3) return 'SW';
  if(weightKg >= row.m3 && weightKg < row.m2) return 'W';
  if(weightKg >= row.m2 && weightKg <= row.p2) return 'N';
  if(weightKg > row.p2 && weightKg <= row.p3) return 'OW';
  if(weightKg > row.p3) return 'O';
  return 'N';
}

// Global compute for form
function autoComputeEOPT(){
  const dob = document.getElementById('cDOB')?.value;
  const measured = document.getElementById('cDate')?.value;
  const w = parseFloat(document.getElementById('cWeight')?.value);
  const h = parseFloat(document.getElementById('cHeight')?.value);
  const sex = document.getElementById('cGender')?.value;
  let age = computeAgeInMonths(dob, measured);
  if(document.getElementById('cAge')) document.getElementById('cAge').value = age!=null? age : '';
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
    document.getElementById('rangeInfo').innerHTML = `<small>Based on WHO Child Growth Standards adopted by NNC (nnc.gov.ph).<br>WFA source: ${sex&&sex.startsWith('F')?'Girls':'Boys'} table, HFA: ${sex&&sex.startsWith('F')?'Girls':'Boys'} table, WFH: WHO weight-for-length/height https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height</small>`;
    bmiBox.style.display='block';
  }
}
window.autoComputeEOPT = autoComputeEOPT;

// Override calculateBMI to call autoCompute
function calculateBMI(){ autoComputeEOPT(); }
function calculateUpdateBMI(){
  const dob = document.getElementById('uDOB')?.value;
  const measured = document.getElementById('uDate')?.value;
  const w = parseFloat(document.getElementById('uWeight')?.value);
  const h = parseFloat(document.getElementById('uHeight')?.value);
  const sex = document.getElementById('uGender')?.value;
  let age = computeAgeInMonths(dob, measured);
  if(document.getElementById('uAge')) document.getElementById('uAge').value = age!=null? age : '';
  let wfa = age!=null && !isNaN(w) ? classifyWFA(age,w,sex) : '';
  let hfa = age!=null && !isNaN(h) ? classifyHFA(age,h,sex) : '';
  let wfh = !isNaN(w) && !isNaN(h) ? classifyWFH(h,w,sex) : '';
  if(document.getElementById('uWFA')) document.getElementById('uWFA').value = wfa;
  if(document.getElementById('uHFA')) document.getElementById('uHFA').value = hfa;
  if(document.getElementById('uWFH')) document.getElementById('uWFH').value = wfh;
  const box = document.getElementById('uBmiResultBox');
  if(box){ 
    document.getElementById('uBmiValue').textContent = age!=null? age+' months' : '--';
    document.getElementById('uBmiClass').textContent = `WFA:${wfa} | HFA:${hfa} | WFH:${wfh}`;
    box.classList.add('show');
  }
}
window.calculateUpdateBMI = calculateUpdateBMI;

// ===== DATA LAYER PATCHED FOR 15 COLUMNS =====
let childrenCache = null;
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
function getChildren(){ if(childrenCache) return childrenCache; return getChildrenSync(); }
async function loadChildren(){
  const data = getChildrenSync();
  childrenCache = data;
  return data;
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

// Form submit - new 15 columns
const childForm = document.getElementById('childForm');
if(childForm){
  childForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const dob = document.getElementById('cDOB').value;
    const measured = document.getElementById('cDate').value;
    const age = computeAgeInMonths(dob, measured);
    const w = parseFloat(document.getElementById('cWeight').value);
    const h = parseFloat(document.getElementById('cHeight').value);
    const sex = document.getElementById('cGender').value;
    const wfa = classifyWFA(age,w,sex);
    const hfa = classifyHFA(age,h,sex);
    const wfh = classifyWFH(h,w,sex);
    const editId = document.getElementById('editId').value;
    const record = {
      id: editId || 'id_'+Date.now()+'_'+Math.random().toString(36).substr(2,5),
      no: getChildren().length+1,
      purok: document.getElementById('cPurok').value,
      address: document.getElementById('cAddress').value,
      mother: document.getElementById('cMother').value,
      name: document.getElementById('cName').value,
      ip: document.getElementById('cIP').value,
      gender: sex,
      dob: dob,
      date: measured,
      weight: w,
      height: h,
      age: age,
      wfa: wfa,
      hfa: hfa,
      wfh: wfh,
      status: wfa, // for dashboard cards
      bmi: w,
      created_by: getCurrentUsernameGlobal(),
      updated_by: getCurrentUsernameGlobal(),
      created_at: new Date().toISOString()
    };
    let list = getChildren();
    if(editId){
      const idx = list.findIndex(x=>x.id===editId);
      if(idx>=0) list[idx]= {...list[idx], ...record};
    }else{
      list.push(record);
    }
    saveChildren(list);
    alert('Record saved! WFA:'+wfa+' HFA:'+hfa+' WFH:'+wfh);
    resetForm();
    renderTable();
    renderDashboard();
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

// Render table with 15 columns
function renderTable(){
  const tbody = document.querySelector('#recordsTable tbody');
  if(!tbody) return;
  const list = getChildren();
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filter = document.getElementById('filterStatus')?.value || '';
  let filtered = list.filter(c=>{
    const txt = `${c.name} ${c.mother} ${c.purok} ${c.address} ${c.wfa} ${c.hfa} ${c.wfh}`.toLowerCase();
    if(search && !txt.includes(search)) return false;
    if(filter && !(c.wfa===filter || c.hfa===filter || c.wfh===filter || c.status===filter)) return false;
    return true;
  });
  tbody.innerHTML='';
  filtered.forEach((c,i)=>{
    const tr=document.createElement('tr');
    const wfaColor = c.wfa==='N' ? '#4caf50' : c.wfa==='UW' ? '#ff9800' : c.wfa==='SUW' ? '#f44336' : '#ffeb3b';
    const hfaColor = c.hfa==='N' ? '#4caf50' : c.hfa==='S' ? '#ff9800' : c.hfa==='SS' ? '#f44336' : '#8bc34a';
    const wfhColor = c.wfh==='N' ? '#4caf50' : c.wfh==='W' ? '#ff9800' : c.wfh==='SW' ? '#f44336' : '#ffeb3b';
    tr.innerHTML=`
      <td>${i+1}</td>
      <td>${c.purok||''}</td>
      <td title="${c.address||''}"><span style="display:inline-block;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.address||''}</span></td>
      <td>${c.mother||''}</td>
      <td><b>${c.name||''}</b></td>
      <td>${c.ip||'NO'}</td>
      <td>${(c.gender||'').toString().charAt(0).toUpperCase()}</td>
      <td>${c.dob||''}</td>
      <td>${c.date||''}</td>
      <td>${c.weight||''}</td>
      <td>${c.height||''}</td>
      <td>${c.age!=null?c.age:''}</td>
      <td><span class="badge" style="background:${wfaColor};color:${c.wfa==='N'?'#fff':'#000'};padding:4px 8px;border-radius:6px;font-weight:700">${c.wfa||'N'}</span></td>
      <td><span class="badge" style="background:${hfaColor};color:#fff;padding:4px 8px;border-radius:6px;font-weight:700">${c.hfa||'N'}</span></td>
      <td><span class="badge" style="background:${wfhColor};color:#000;padding:4px 8px;border-radius:6px;font-weight:700">${c.wfh||'N'}</span></td>
      <td>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px" onclick="editChild('${c.id}')">✏️</button>
        <button class="btn-outline" style="padding:4px 8px;font-size:11px" onclick="deleteChild('${c.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if(filtered.length===0){
    tbody.innerHTML='<tr><td colspan="16" style="text-align:center;padding:20px;color:#888">No records found. Add child information using 15 columns format.</td></tr>';
  }
}
window.renderTable = renderTable;

function editChild(id){
  const c = getChildren().find(x=>x.id===id);
  if(!c) return;
  document.querySelector('[data-view="add"]')?.click();
  document.getElementById('editId').value=c.id;
  document.getElementById('cPurok').value=c.purok||'';
  document.getElementById('cAddress').value=c.address||'';
  document.getElementById('cMother').value=c.mother||'';
  document.getElementById('cName').value=c.name||'';
  document.getElementById('cIP').value=c.ip||'NO';
  document.getElementById('cGender').value=c.gender||'';
  document.getElementById('cDOB').value=c.dob||'';
  document.getElementById('cDate').value=c.date||'';
  document.getElementById('cWeight').value=c.weight||'';
  document.getElementById('cHeight').value=c.height||'';
  autoComputeEOPT();
  window.scrollTo(0,0);
}
window.editChild = editChild;

function deleteChild(id){
  if(!confirm('Delete this record?')) return;
  let list=getChildren();
  list=list.filter(x=>x.id!==id);
  saveChildren(list);
  renderTable();
  renderDashboard();
}
window.deleteChild = deleteChild;

function renderDashboard(){
  const list=getChildren();
  const total = list.length;
  const normal = list.filter(c=>c.wfa==='N').length;
  const under = list.filter(c=>c.wfa==='UW').length;
  const severe = list.filter(c=>c.wfa==='SUW').length;
  const over = list.filter(c=>c.wfa==='OW').length;
  if(document.getElementById('totalChildren')) document.getElementById('totalChildren').textContent=total;
  if(document.getElementById('totalNormal')) document.getElementById('totalNormal').textContent=normal;
  if(document.getElementById('totalUnder')) document.getElementById('totalUnder').textContent=under;
  if(document.getElementById('totalObese')) document.getElementById('totalObese').textContent=severe;
  if(document.getElementById('totalOver')) document.getElementById('totalOver').textContent=over;
}
window.renderDashboard = renderDashboard;

function initPurok(){ renderPurok(); }
function renderPurok(){
  const container=document.getElementById('purokTabs');
  if(!container) return;
  const puroks=['PUROK 1- PUNONG TULAY','PUROK 2- GITNA','PUROK 3- BAHAY PARE','PUROK 4- LOMA','PUROK 5- IBABA','PUROK 6- ITAAS'];
  container.innerHTML='';
  puroks.forEach(p=>{
    const btn=document.createElement('button');
    btn.className='purok-tab';
    btn.textContent=p;
    btn.onclick=()=>{ document.getElementById('purokSearch').value=p; renderFeeding(); };
    container.appendChild(btn);
  });
}
window.renderPurok=renderPurok;
window.initPurok=initPurok;

function renderFeeding(){
  const tbody=document.querySelector('#feedingTable tbody');
  if(!tbody) return;
  const list=getChildren().filter(c=> c.wfa!=='N' || c.hfa!=='N' || c.wfh!=='N');
  tbody.innerHTML='';
  list.forEach(c=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${c.name}</td><td>${c.purok}</td><td>${c.wfa}/${c.hfa}/${c.wfh}</td><td>${c.age}m</td>`;
    tbody.appendChild(tr);
  });
}
window.renderFeeding=renderFeeding;

function exportAllToExcel(){
  const list=getChildren();
  let csv='No.,Purok,Address,Mother,Child,IP Group,Sex,DOB,Date Measured,Weight,Height,Age Months,WFA,HFA,WFH\\n';
  list.forEach((c,i)=>{
    csv+=`${i+1},"${c.purok}","${c.address}","${c.mother}","${c.name}","${c.ip}","${c.gender}","${c.dob}","${c.date}",${c.weight},${c.height},${c.age},${c.wfa},${c.hfa},${c.wfh}\\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='e-OPT-PLUS-SAOG-15columns.csv'; a.click();
}
window.exportAllToExcel=exportAllToExcel;
function printAllRecords(){ window.print(); }
window.printAllRecords=printAllRecords;

// Init
document.addEventListener('DOMContentLoaded',()=>{
  renderDashboard();
  renderTable();
  const s=document.getElementById('searchInput');
  if(s) s.addEventListener('input', renderTable);
  const f=document.getElementById('filterStatus');
  if(f) f.addEventListener('change', renderTable);
});
