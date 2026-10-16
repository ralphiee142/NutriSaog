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

// Functions (safe to declare globally)
function logout() {
  showLogoutModal();
}
function showLogoutModal() {
  document.getElementById("logoutModal")?.classList.add("show");
}
function closeLogoutModal() {
  document.getElementById("logoutModal")?.classList.remove("show");
}
function confirmLogout() {
  localStorage.removeItem("nt_current");
  location.href = "index.html";
}

// === USER ISOLATION - Login mo, Record mo ===
function getCurrentUserGlobal() {
  try {
    const curStr = localStorage.getItem("nt_current");
    if (!curStr) return null;
    return JSON.parse(curStr);
  } catch (e) {
    return null;
  }
}
function getCurrentUsernameGlobal() {
  const u = getCurrentUserGlobal();
  return u ? u.username || u.name || "admin" : "admin";
}
function getCurrentUserIdGlobal() {
  const u = getCurrentUserGlobal();
  return u ? u.id || u.username : null;
}
function getChildrenStorageKeyGlobal() {
  const username = getCurrentUsernameGlobal();
  return `nt_children_${username}`;
}
// Alias for global use (outside dashboard)
if (typeof getCurrentUser === "undefined") {
  var getCurrentUser = getCurrentUserGlobal;
  var getCurrentUsername = getCurrentUsernameGlobal;
  var getCurrentUserId = getCurrentUserIdGlobal;
  var getChildrenStorageKey = getChildrenStorageKeyGlobal;
}

// === DATA LAYER - Hybrid Supabase + localStorage ===
let childrenCache = null; // cache for faster rendering

async function fetchChildrenFromSupabase() {
  if (
    !USE_SUPABASE ||
    typeof getSupabase !== "function" ||
    !isSupabaseConfigured()
  )
    return null;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    // SHARED MODE: Load ALL records for ALL users - Barangay Saog shared system
    const { data, error } = await supabase
      .from("children")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    console.log(
      `📂 Loading SHARED records - found ${data.length} total (all accounts)`,
    );
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      gender: row.gender,
      age: row.age,
      purok: row.purok,
      address: row.address,
      weight: parseFloat(row.weight),
      height: parseFloat(row.height),
      bmi: parseFloat(row.bmi),
      status: row.status,
      date: row.date,
      notes: row.notes || "",
      created_at: row.created_at,
      created_by: row.created_by || "unknown",
      updated_by: row.updated_by || row.created_by || "unknown",
      updated_at: row.updated_at || row.created_at,
    }));
  } catch (err) {
    console.warn("Supabase fetch failed:", err);
    return null;
  }
}

function getChildrenSync() {
  // SHARED MODE: All accounts see same records - Barangay Saog shared system
  try {
    const shared = localStorage.getItem("nt_children_shared");
    if (shared) return JSON.parse(shared);
  } catch (e) {}
  // Fallback to old keys
  try {
    const old = localStorage.getItem("nt_children");
    if (old) return JSON.parse(old);
  } catch (e) {}
  return [];
}

function getChildren() {
  if (childrenCache) return childrenCache;
  return getChildrenSync();
}

async function loadChildren() {
  // Async load - tries Supabase first (per-user)
  const supabaseData = await fetchChildrenFromSupabase();
  // supabaseData = null means error/offline, [] means empty table for this user
  if (supabaseData !== null) {
    if (supabaseData.length === 0) {
      // Check if we already migrated (prevent double migration)
      const migratedKey = `migrated_${typeof getCurrentUsername === "function" ? getCurrentUsername() : "admin"}`;
      if (localStorage.getItem(migratedKey)) {
        console.log(
          "Already migrated for this user, skipping to avoid duplicates",
        );
        childrenCache = [];
        return [];
      }
      const localData = getChildrenSync();
      // Only migrate if localData is not already from Supabase (has no UUID-like id)
      const needsMigration = localData.filter(
        (c) => !c.id || c.id.length < 20 || !c.id.includes("-"),
      );
      if (needsMigration.length > 0) {
        console.log(
          "Supabase empty for user but localStorage has",
          needsMigration.length,
          "records - migrating...",
        );
        childrenCache = localData;
        localStorage.setItem(migratedKey, "true");
        migrateLocalToSupabase(needsMigration);
        return localData;
      } else if (localData.length > 0) {
        console.log("Local data already has UUIDs, not migrating again");
        localStorage.setItem(migratedKey, "true");
      }
    }
    childrenCache = supabaseData;
    try {
      const key =
        typeof getChildrenStorageKey === "function"
          ? getChildrenStorageKey()
          : "nt_children";
      localStorage.setItem(key, JSON.stringify(supabaseData));
    } catch (e) {}
    localStorage.setItem("nt_children", JSON.stringify(supabaseData));
    return supabaseData;
  }
  // Fallback offline
  const localData = getChildrenSync();
  childrenCache = localData;
  return localData;
}

async function migrateLocalToSupabase(localData) {
  if (!isSupabaseConfigured()) return;
  if (!localData || localData.length === 0) return;
  // Prevent re-migration
  const migratedKey = `migrated_${typeof getCurrentUsername === "function" ? getCurrentUsername() : "admin"}_${localData.length}`;
  if (localStorage.getItem(migratedKey + "_done")) {
    console.log("Migration already done, skipping");
    return;
  }
  try {
    const supabase = getSupabase();
    const currentUsername =
      typeof getCurrentUsername === "function"
        ? getCurrentUsername()
        : typeof getCurrentUsernameGlobal === "function"
          ? getCurrentUsernameGlobal()
          : "admin";
    const toInsert = localData.map((c) => ({
      name: c.name,
      gender: c.gender || "Male",
      age: parseInt(c.age),
      purok: c.purok,
      address: c.address,
      weight: parseFloat(c.weight),
      height: parseFloat(c.height),
      bmi: parseFloat(c.bmi),
      status: c.status,
      date: c.date || new Date().toISOString().split("T")[0],
      notes: c.notes || "",
      created_by: c.created_by || currentUsername,
    }));
    console.log("Migrating", toInsert.length, "records to Supabase...");
    const { data, error } = await supabase
      .from("children")
      .insert(toInsert)
      .select();
    if (error) throw error;
    console.log("✅ Migrated", data.length, "records to Supabase!");
    localStorage.setItem(migratedKey + "_done", "true");
    // After migration, reload
    const fresh = await fetchChildrenFromSupabase();
    if (fresh) {
      childrenCache = fresh;
      localStorage.setItem("nt_children", JSON.stringify(fresh));
      if (typeof renderDashboard === "function") renderDashboard();
      if (typeof renderTable === "function") renderTable();
    }
  } catch (err) {
    console.warn("Migration failed:", err);
  }
}

async function saveChildrenToSupabase(newData) {
  if (
    !USE_SUPABASE ||
    typeof getSupabase !== "function" ||
    !isSupabaseConfigured()
  )
    return false;
  try {
    const supabase = getSupabase();
    // For simplicity, we do upsert per item - in production use batch
    // This function is called with full array, we need to diff
    // We'll handle insert/update in saveSingleChild instead
    return false; // indicate not handled here, use single methods
  } catch (err) {
    return false;
  }
}

function saveChildren(d) {
  childrenCache = d;
  try {
    localStorage.setItem("nt_children_shared", JSON.stringify(d));
    localStorage.setItem("nt_children", JSON.stringify(d));
    // Also update per-user key for backward compat
    const key =
      typeof getChildrenStorageKey === "function"
        ? getChildrenStorageKey()
        : null;
    if (key) localStorage.setItem(key, JSON.stringify(d));
  } catch (e) {
    localStorage.setItem("nt_children", JSON.stringify(d));
  }
}

async function saveSingleChildToSupabase(data, isUpdate = false) {
  if (
    !USE_SUPABASE ||
    typeof getSupabase !== "function" ||
    !isSupabaseConfigured()
  ) {
    console.warn("Supabase not configured");
    return null;
  }
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error("Supabase client is null!");
      return null;
    }
    const currentUsername =
      typeof getCurrentUsername === "function"
        ? getCurrentUsername()
        : typeof getCurrentUsernameGlobal === "function"
          ? getCurrentUsernameGlobal()
          : "admin";
    const now = new Date().toISOString();
    let payload = {};
    if (isUpdate) {
      payload = {
        name: data.name,
        gender: data.gender,
        age: parseInt(data.age),
        purok: data.purok,
        address: data.address,
        weight: parseFloat(data.weight),
        height: parseFloat(data.height),
        bmi: parseFloat(data.bmi),
        status: data.status,
        date: data.date,
        notes: data.notes || "",
        updated_by: currentUsername,
        updated_at: now,
      };
    } else {
      payload = {
        name: data.name,
        gender: data.gender,
        age: parseInt(data.age),
        purok: data.purok,
        address: data.address,
        weight: parseFloat(data.weight),
        height: parseFloat(data.height),
        bmi: parseFloat(data.bmi),
        status: data.status,
        date: data.date,
        notes: data.notes || "",
        created_by: data.created_by || currentUsername,
        updated_by: currentUsername,
        created_at: now,
        updated_at: now,
      };
    }
    console.log(
      "Saving to Supabase (SHARED):",
      isUpdate ? "UPDATE" : "INSERT",
      data.id,
      payload,
    );
    if (isUpdate) {
      const { data: result, error } = await supabase
        .from("children")
        .update(payload)
        .eq("id", data.id)
        .select();
      if (error) {
        console.error("UPDATE ERROR:", error);
        alert("Supabase UPDATE failed: " + error.message);
        throw error;
      }
      console.log("UPDATE success:", result);
      return result && result[0] ? result[0] : { id: data.id, ...payload };
    } else {
      const { data: result, error } = await supabase
        .from("children")
        .insert([payload])
        .select();
      if (error) {
        console.error("INSERT ERROR:", error);
        throw error;
      }
      return result && result[0] ? result[0] : null;
    }
  } catch (err) {
    console.error("Supabase save failed FULL ERROR:", err);
    return null;
  }
}

async function deleteSingleChildFromSupabase(id) {
  if (
    !USE_SUPABASE ||
    typeof getSupabase !== "function" ||
    !isSupabaseConfigured()
  )
    return false;
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase delete failed:", err);
    return false;
  }
}


// === WHO CHILD GROWTH STANDARDS - Weight for Age 0-71 months ===
// Based on printed tables: Girls (first pic) and Boys (second pic)
// Format per age: [severely_max, underweight_from, underweight_to, normal_from, normal_to, overweight_min]

const GIRLS_WFA = {
  0:[2.0,2.1,2.3,2.4,4.2,4.3],
  1:[2.7,2.8,3.1,3.2,5.5,5.6],
  2:[3.4,3.5,3.8,3.9,6.6,6.7],
  3:[4.0,4.1,4.4,4.5,7.5,7.6],
  4:[4.4,4.5,4.9,5.0,8.2,8.3],
  5:[4.8,4.9,5.3,5.4,8.8,8.9],
  6:[5.1,5.2,5.6,5.7,9.3,9.4],
  7:[5.3,5.4,5.9,6.0,9.8,9.9],
  8:[5.6,5.7,6.2,6.3,10.2,10.3],
  9:[5.8,5.9,6.4,6.5,10.5,10.6],
  10:[5.9,6.0,6.6,6.7,10.9,11.0],
  11:[6.1,6.2,6.8,6.9,11.2,11.3],
  12:[6.3,6.4,6.9,7.0,11.5,11.6],
  13:[6.4,6.5,7.1,7.2,11.8,11.9],
  14:[6.6,6.7,7.3,7.4,12.1,12.2],
  15:[6.7,6.8,7.5,7.6,12.4,12.5],
  16:[6.9,7.0,7.6,7.7,12.6,12.7],
  17:[7.0,7.1,7.8,7.9,12.9,13.0],
  18:[7.2,7.3,8.0,8.1,13.2,13.3],
  19:[7.3,7.4,8.1,8.2,13.5,13.6],
  20:[7.5,7.6,8.3,8.4,13.7,13.8],
  21:[7.6,7.7,8.5,8.6,14.0,14.1],
  22:[7.8,7.9,8.6,8.7,14.3,14.4],
  23:[7.9,8.0,8.8,8.9,14.6,14.7],
  24:[8.1,8.2,8.9,9.0,14.8,14.9],
  25:[8.2,8.3,9.1,9.2,15.1,15.2],
  26:[8.4,8.5,9.3,9.4,15.4,15.5],
  27:[8.5,8.6,9.4,9.5,15.7,15.8],
  28:[8.6,8.7,9.6,9.7,16.0,16.1],
  29:[8.8,8.9,9.7,9.8,16.2,16.3],
  30:[8.9,9.0,9.9,10.0,16.5,16.6],
  31:[9.0,9.1,10.0,10.1,16.8,16.9],
  32:[9.1,9.2,10.2,10.3,17.1,17.2],
  33:[9.3,9.4,10.3,10.4,17.3,17.4],
  34:[9.4,9.5,10.4,10.5,17.6,17.7],
  35:[9.5,9.6,10.6,10.7,17.9,18.0],
  36:[9.6,9.7,10.7,10.8,18.1,18.2],
  37:[9.7,9.8,10.8,10.9,18.4,18.5],
  38:[9.8,9.9,11.0,11.1,18.7,18.8],
  39:[9.9,10.0,11.1,11.2,19.0,19.1],
  40:[10.1,10.2,11.2,11.3,19.2,19.3],
  41:[10.2,10.3,11.4,11.5,19.5,19.6],
  42:[10.3,10.4,11.5,11.6,19.8,19.9],
  43:[10.4,10.5,11.6,11.7,20.1,20.2],
  44:[10.5,10.6,11.7,11.8,20.4,20.5],
  45:[10.6,10.7,11.9,12.0,20.7,20.8],
  46:[10.7,10.8,12.0,12.1,20.9,21.0],
  47:[10.8,10.9,12.1,12.2,21.2,21.3],
  48:[10.9,11.0,12.2,12.3,21.5,21.6],
  49:[11.0,11.1,12.3,12.4,21.8,21.9],
  50:[11.1,11.2,12.4,12.5,22.1,22.2],
  51:[11.2,11.3,12.6,12.7,22.4,22.5],
  52:[11.3,11.4,12.7,12.8,22.6,22.7],
  53:[11.4,11.5,12.8,12.9,22.9,23.0],
  54:[11.5,11.6,12.9,13.0,23.2,23.3],
  55:[11.6,11.7,13.1,13.2,23.5,23.6],
  56:[11.7,11.8,13.2,13.3,23.8,23.9],
  57:[11.8,11.9,13.3,13.4,24.1,24.2],
  58:[11.9,12.0,13.4,13.5,24.4,24.5],
  59:[12.0,12.1,13.5,13.6,24.6,24.7],
  60:[12.1,12.2,13.6,13.7,24.7,24.8],
  61:[12.4,12.5,13.9,14.0,24.8,24.9],
  62:[12.5,12.6,14.0,14.1,25.1,25.2],
  63:[12.6,12.7,14.1,14.2,25.4,25.5],
  64:[12.7,12.8,14.2,14.3,25.6,25.7],
  65:[12.8,12.9,14.3,14.4,25.9,26.0],
  66:[12.9,13.0,14.5,14.6,26.2,26.3],
  67:[13.0,13.1,14.6,14.7,26.5,26.6],
  68:[13.1,13.2,14.7,14.8,26.7,26.8],
  69:[13.2,13.3,14.8,14.9,27.0,27.1],
  70:[13.3,13.4,14.9,15.0,27.3,27.4],
  71:[13.4,13.5,15.1,15.2,27.6,27.7]
};

const BOYS_WFA = {
  0:[2.1,2.2,2.4,2.5,4.4,4.5],
  1:[2.9,3.0,3.3,3.4,5.8,5.9],
  2:[3.8,3.9,4.2,4.3,7.1,7.2],
  3:[4.4,4.5,4.9,5.0,8.0,8.1],
  4:[4.9,5.0,5.5,5.6,8.7,8.8],
  5:[5.3,5.4,5.9,6.0,9.3,9.4],
  6:[5.7,5.8,6.3,6.4,9.8,9.9],
  7:[5.9,6.0,6.6,6.7,10.3,10.4],
  8:[6.2,6.3,6.8,6.9,10.7,10.8],
  9:[6.4,6.5,7.0,7.1,11.0,11.1],
  10:[6.6,6.7,7.3,7.4,11.4,11.5],
  11:[6.8,6.9,7.5,7.6,11.7,11.8],
  12:[6.9,7.0,7.6,7.7,12.0,12.1],
  13:[7.1,7.2,7.8,7.9,12.3,12.4],
  14:[7.2,7.3,8.0,8.1,12.6,12.7],
  15:[7.4,7.5,8.2,8.3,12.8,12.9],
  16:[7.5,7.6,8.3,8.4,13.1,13.2],
  17:[7.7,7.8,8.5,8.6,13.4,13.5],
  18:[7.8,7.9,8.7,8.8,13.7,13.8],
  19:[8.0,8.1,8.8,8.9,13.9,14.0],
  20:[8.1,8.2,9.0,9.1,14.2,14.3],
  21:[8.2,8.3,9.1,9.2,14.5,14.6],
  22:[8.4,8.5,9.3,9.4,14.7,14.8],
  23:[8.5,8.6,9.4,9.5,15.0,15.1],
  24:[8.6,8.7,9.6,9.7,15.3,15.4],
  25:[8.8,8.9,9.7,9.8,15.5,15.6],
  26:[8.9,9.0,9.9,10.0,15.8,15.9],
  27:[9.0,9.1,10.0,10.1,16.1,16.2],
  28:[9.1,9.2,10.1,10.2,16.3,16.4],
  29:[9.2,9.3,10.3,10.4,16.6,16.7],
  30:[9.4,9.5,10.4,10.5,16.9,17.0],
  31:[9.5,9.6,10.6,10.7,17.1,17.2],
  32:[9.6,9.7,10.7,10.8,17.4,17.5],
  33:[9.7,9.8,10.8,10.9,17.6,17.7],
  34:[9.8,9.9,10.9,11.0,17.8,17.9],
  35:[9.9,10.0,11.1,11.2,18.1,18.2],
  36:[10.0,10.1,11.2,11.3,18.3,18.4],
  37:[10.1,10.2,11.3,11.4,18.6,18.7],
  38:[10.2,10.3,11.4,11.5,18.8,18.9],
  39:[10.3,10.4,11.5,11.6,19.0,19.1],
  40:[10.4,10.5,11.7,11.8,19.3,19.4],
  41:[10.5,10.6,11.8,11.9,19.5,19.6],
  42:[10.6,10.7,11.9,12.0,19.7,19.8],
  43:[10.7,10.8,12.0,12.1,20.0,20.1],
  44:[10.8,10.9,12.1,12.2,20.2,20.3],
  45:[10.9,11.0,12.3,12.4,20.5,20.6],
  46:[11.0,11.1,12.4,12.5,20.7,20.8],
  47:[11.1,11.2,12.5,12.6,20.9,21.0],
  48:[11.2,11.3,12.6,12.7,21.2,21.3],
  49:[11.3,11.4,12.7,12.8,21.4,21.5],
  50:[11.4,11.5,12.8,12.9,21.7,21.8],
  51:[11.5,11.6,13.0,13.1,21.9,22.0],
  52:[11.6,11.7,13.1,13.2,22.2,22.3],
  53:[11.7,11.8,13.2,13.3,22.4,22.5],
  54:[11.8,11.9,13.3,13.4,22.7,22.8],
  55:[11.9,12.0,13.4,13.5,22.9,23.0],
  56:[12.0,12.1,13.5,13.6,23.2,23.3],
  57:[12.1,12.2,13.6,13.7,23.4,23.5],
  58:[12.2,12.3,13.7,13.8,23.7,23.8],
  59:[12.3,12.4,13.9,14.0,23.9,24.0],
  60:[12.4,12.5,14.0,14.1,24.2,24.3],
  61:[12.7,12.8,14.3,14.4,24.3,24.4],
  62:[12.8,12.9,14.4,14.5,24.4,24.5],
  63:[13.0,13.1,14.5,14.6,24.7,24.8],
  64:[13.1,13.2,14.7,14.8,24.9,25.0],
  65:[13.2,13.3,14.8,14.9,25.2,25.3],
  66:[13.3,13.4,14.9,15.0,25.5,25.6],
  67:[13.4,13.5,15.1,15.2,25.7,25.8],
  68:[13.6,13.7,15.2,15.3,26.0,26.1],
  69:[13.7,13.8,15.3,15.4,26.3,26.4],
  70:[13.8,13.9,15.5,15.6,26.6,26.7],
  71:[13.9,14.0,15.6,15.7,26.8,26.9]
};

function getWFAClassification(weight, ageMonths, gender) {
  if (weight == null || ageMonths == null || !gender) return "Unknown";
  const table = gender.toLowerCase().startsWith("f") ? GIRLS_WFA : BOYS_WFA;
  // Clamp age to 0-71, but our app is 0-59; still support
  let age = Math.floor(parseInt(ageMonths));
  if (isNaN(age)) return "Unknown";
  if (age < 0) age = 0;
  if (age > 71) age = 71;
  // If age not in table (should be), use closest
  let row = table[age];
  if (!row) {
    // fallback to nearest available
    let keys = Object.keys(table).map(k=>parseInt(k)).sort((a,b)=>a-b);
    let nearest = keys.reduce((prev,curr)=> Math.abs(curr-age) < Math.abs(prev-age) ? curr : prev, keys[0]);
    row = table[nearest];
  }
  const [sevMax, uwFrom, uwTo, normFrom, normTo, overMin] = row;
  // WHO logic: < -3SD = Severely Underweight, -3SD to < -2SD = Underweight, -2SD to +2SD = Normal, > +2SD = Overweight
  // Use From values as cutoffs to handle 0.1 gaps
  if (weight < uwFrom) return "Severely Underweight";
  if (weight < normFrom) return "Underweight";
  if (weight <= normTo) return "Normal";
  return "Overweight";
}

// Keep old name for compatibility but now uses WFA
function getClassification(weight, ageMonths, gender) {
  // If called with only 1 arg (old BMI logic), fallback to weight-based generic
  if (arguments.length === 1) {
    // old BMI path no longer used; return Normal as fallback
    return "Normal";
  }
  return getWFAClassification(weight, ageMonths, gender);
}

function getClassificationWithRange(weight, ageMonths, gender) {
  const status = getWFAClassification(weight, ageMonths, gender);
  const table = gender && gender.toLowerCase().startsWith("f") ? GIRLS_WFA : BOYS_WFA;
  let age = Math.floor(parseInt(ageMonths));
  if (isNaN(age)) age = 0;
  if (age < 0) age = 0;
  if (age > 71) age = 71;
  const row = table[age] || table[0];
  return { status, range: row };
}


function calculateBMI() {
  const w = parseFloat(document.getElementById("cWeight")?.value);
  const h = parseFloat(document.getElementById("cHeight")?.value);
  const age = parseInt(document.getElementById("cAge")?.value);
  const gender = document.getElementById("cGender")?.value;
  if (!w || isNaN(age) || !gender) {
    alert("Please enter weight, age, and gender first!");
    return null;
  }
  const bmi = h ? w / ((h/100)*(h/100)) : 0;
  const cls = getWFAClassification(w, age, gender);
  const box = document.getElementById("bmiResultBox");
  if (box) box.classList.add("show");
  const bv = document.getElementById("bmiValue");
  if (bv) bv.textContent = h ? bmi.toFixed(2) : w.toFixed(1) + " kg";
  const el = document.getElementById("bmiClass");
  if (el) {
    el.textContent = cls;
    el.className = "badge " + cls.replace(/\s+/g,"-");
  }
  // Show range info if available
  const rangeInfo = document.getElementById("rangeInfo");
  if (rangeInfo) {
    const table = gender.toLowerCase().startsWith("f") ? GIRLS_WFA : BOYS_WFA;
    const row = table[age] || table[0];
    if (row) {
      rangeInfo.innerHTML = `<small style="color:#666">Range for ${gender}, ${age}mo: SU < ${row[1]}kg | UW ${row[1]}-${row[2]}kg | Normal ${row[3]}-${row[4]}kg | OW > ${row[4]}kg</small>`;
    }
  }
  return { bmi: h ? parseFloat(bmi.toFixed(2)) : w, cls };
}

function calculateUpdateBMI() {
  const w = parseFloat(document.getElementById("uWeight")?.value);
  const h = parseFloat(document.getElementById("uHeight")?.value);
  const age = parseInt(document.getElementById("uAge")?.value);
  const gender = document.getElementById("uGender")?.value;
  if (!w || isNaN(age) || !gender) {
    alert("Please enter weight, age, and gender first!");
    return null;
  }
  const bmi = h ? w / ((h/100)*(h/100)) : 0;
  const cls = getWFAClassification(w, age, gender);
  const box = document.getElementById("uBmiResultBox");
  if (box) box.classList.add("show");
  const bv = document.getElementById("uBmiValue");
  if (bv) bv.textContent = h ? bmi.toFixed(2) : w.toFixed(1) + " kg";
  const el = document.getElementById("uBmiClass");
  if (el) {
    el.textContent = cls;
    el.className = "badge " + cls.replace(/\s+/g,"-");
  }
  return { bmi: h ? parseFloat(bmi.toFixed(2)) : w, cls };
}

const childForm = document.getElementById("childForm");
if (childForm) {
  childForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    // ADD ONLY - Add Child Record is for adding only!
    const result = calculateBMI();
    if (!result) return;
    const currentUser =
      typeof getCurrentUsername === "function"
        ? getCurrentUsername()
        : typeof getCurrentUsernameGlobal === "function"
          ? getCurrentUsernameGlobal()
          : "admin";
    const data = {
      id: Date.now().toString(),
      name: document.getElementById("cName").value.trim(),
      age: parseInt(document.getElementById("cAge").value),
      gender: document.getElementById("cGender").value,
      purok: document.getElementById("cPurok").value,
      address: document.getElementById("cAddress").value.trim(),
      weight: parseFloat(document.getElementById("cWeight").value),
      height: parseFloat(document.getElementById("cHeight").value),
      bmi: parseFloat(result.bmi.toFixed(2)),
      status: result.cls,
      date:
        document.getElementById("cDate").value ||
        new Date().toISOString().split("T")[0],
      notes: document.getElementById("cNotes")?.value.trim() || "",
      created_by: currentUser,
      updated_by: currentUser,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (data.age < 0 || data.age > 59)
      return alert("Age must be 0-59 months only!");

    if (USE_SUPABASE && isSupabaseConfigured()) {
      const saved = await saveSingleChildToSupabase(data, false);
      if (saved) {
        data.id = saved.id;
        let children = getChildrenSync();
        children.push(data);
        saveChildren(children);
        alert("✅ Added! Record for " + data.name);
        resetForm();
        await loadChildren();
        renderDashboard();
        renderTable();
        return;
      }
    }
    let children = getChildrenSync();
    children.push(data);
    saveChildren(children);
    alert("✅ Added! Record for " + data.name);
    resetForm();
    renderDashboard();
    renderTable();
  });
}

function resetForm() {
  document.getElementById("childForm")?.reset();
  const eid = document.getElementById("editId");
  if (eid) eid.value = "";
  const box = document.getElementById("bmiResultBox");
  if (box) box.classList.remove("show");
}

function renderDashboard() {
  const el = document.getElementById("totalChildren");
  if (!el) return;
  const children = getChildren();
  document.getElementById("totalChildren").textContent = children.length;
  const normalEl = document.getElementById("totalNormal");
  if (normalEl) normalEl.textContent = children.filter((c) => c.status === "Normal").length;
  const underEl = document.getElementById("totalUnder");
  if (underEl) underEl.textContent = children.filter((c) => c.status === "Underweight").length;
  const overEl = document.getElementById("totalOver");
  if (overEl) overEl.textContent = children.filter((c) => c.status === "Overweight").length;
  const obeseEl = document.getElementById("totalObese");
  // totalObese element now repurposed as Severely Underweight
  if (obeseEl) obeseEl.textContent = children.filter((c) => c.status === "Severely Underweight").length;
  const sevEl = document.getElementById("totalSevUnder");
  if (sevEl) sevEl.textContent = children.filter((c) => c.status === "Severely Underweight").length;
  drawChart(children);
}

function drawChart(children) {
  const canvas = document.getElementById("statusChart");
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (parent) {
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = rect.width - 40;
    const displayHeight = 420;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = displayWidth;
    const height = displayHeight;
    ctx.clearRect(0, 0, width, height);

    const counts = {
      "Severely Underweight": children.filter((c) => c.status === "Severely Underweight").length,
      Underweight: children.filter((c) => c.status === "Underweight").length,
      Normal: children.filter((c) => c.status === "Normal").length,
      Overweight: children.filter((c) => c.status === "Overweight").length,
    };
    const total = children.length || 1;
    const maxVal = Math.max(...Object.values(counts), 1);
    const colors = {
      "Severely Underweight": "#d32f2f",
      Underweight: "#ffb300",
      Normal: "#1a7a4c",
      Overweight: "#fb8c00",
    };
    const labels = Object.keys(counts);
    const barCount = labels.length;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 40;
    const paddingBottom = 60;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    const barWidth = Math.min(90, (chartWidth / barCount) * 0.6);
    const gap = (chartWidth - barWidth * barCount) / (barCount + 1);

    // grid lines
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
      ctx.fillStyle = "#999";
      ctx.font = "11px Poppins";
      ctx.textAlign = "right";
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.fillText(val.toString(), paddingLeft - 10, y + 3);
    }

    // bars
    labels.forEach((k, i) => {
      const v = counts[k];
      const h = maxVal === 0 ? 0 : (v / maxVal) * (chartHeight - 20);
      const x = paddingLeft + gap + i * (barWidth + gap);
      const y = paddingTop + chartHeight - h;

      // shadow
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(x + 3, y + 3, barWidth, h);

      // bar with gradient
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, colors[k]);
      grad.addColorStop(1, colors[k] + "cc");
      ctx.fillStyle = grad;
      // rounded top
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, h, [8, 8, 0, 0]);
      ctx.fill();

      // value on top
      ctx.fillStyle = "#222";
      ctx.font = "bold 13px Poppins";
      ctx.textAlign = "center";
      ctx.fillText(v.toString(), x + barWidth / 2, y - 10);

      // label bottom
      ctx.fillStyle = "#555";
      ctx.font = "11px Poppins";
      ctx.fillText(k, x + barWidth / 2, paddingTop + chartHeight + 20);

      // percentage
      if (total > 0 && v > 0) {
        const pct = ((v / total) * 100).toFixed(0);
        ctx.fillStyle = "#888";
        ctx.font = "10px Poppins";
        ctx.fillText(
          pct + "%",
          x + barWidth / 2,
          paddingTop + chartHeight + 34,
        );
      }
    });

    ctx.textAlign = "left";
    return;
  }
  // fallback old
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const counts = {
    "Severely Underweight": children.filter((c) => c.status === "Severely Underweight").length,
    Underweight: children.filter((c) => c.status === "Underweight").length,
    Normal: children.filter((c) => c.status === "Normal").length,
    Overweight: children.filter((c) => c.status === "Overweight").length,
  };
  const total = children.length || 1;
  const colors = {
    "Severely Underweight": "#d32f2f",
    Underweight: "#ffb300",
    Normal: "#1a7a4c",
    Overweight: "#fb8c00",
  };
  let x = 20;
  ctx.font = "12px Poppins";
  Object.entries(counts).forEach(([k, v]) => {
    const h = (v / total) * 180;
    ctx.fillStyle = colors[k];
    ctx.fillRect(x, 220 - h, 70, h);
    ctx.fillStyle = "#222";
    ctx.fillText(k, x, 235);
    ctx.fillText(v + "", x + 20, 215 - h);
    x += 90;
  });
}

// ====== SEARCH BAR FUNCTION ======
function renderTable() {
  const tbody = document.querySelector("#recordsTable tbody");
  if (!tbody) return;
  const searchVal =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  const f = document.getElementById("filterStatus")?.value || "";
  let children = getChildren().filter((c) => {
    // SEARCH: name, purok, address, status
    const matchQ =
      !searchVal ||
      c.name.toLowerCase().includes(searchVal) ||
      c.purok.toLowerCase().includes(searchVal) ||
      c.address.toLowerCase().includes(searchVal) ||
      c.status.toLowerCase().includes(searchVal);
    const matchF = !f || c.status === f;
    return matchQ && matchF;
  });
  // sort newest first
  children = children.reverse();
  tbody.innerHTML =
    children
      .map(
        (c) =>
          `<tr>\n    <td><b>${c.name}</b><br><small style="color:#888;font-size:10px">Added by: ${c.created_by || "-"}</small></td><td><span style="background:${c.gender === "Male" ? "#e3f2fd" : "#fce4ec"};color:${c.gender === "Male" ? "#1565c0" : "#c2185b"};padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600">${c.gender === "Male" ? " Male" : c.gender === "Female" ? " Female" : c.gender || "-"}</span></td><td>${c.age}</td><td>${c.purok}</td><td style="max-width:200px;min-width:140px;white-space:normal;word-break:break-word;line-height:1.4;font-size:12px;cursor:pointer" title="${c.address} - Click to see full address" onclick="showFullAddressById('${c.id}')" class="address-cell">${c.address || "-"}</td><td>${c.weight}kg</td><td>${c.height}cm</td>\n    <td>${c.bmi}</td><td><span class="badge ${c.status}">${c.status}</span></td><td>${c.date}</td><td><span style="background:#f3f4f6;padding:4px 8px;border-radius:10px;font-size:11px;font-weight:600" title="Last updated: ${c.updated_at || c.date}">${c.updated_by && c.updated_by !== c.created_by ? "✏️ " + c.updated_by : c.created_by || "-"}</span></td>\n    <td><div class="action-group"><button class="btn-update" onclick="editChild('${c.id}')"><i class="fa-solid fa-pen"></i> Update</button><button class="btn-delete" onclick="deleteChild('${c.id}')"><i class="fa-solid fa-trash"></i> Delete</button></div></td>\n  </tr>`,
      )
      .join("") ||
    `<tr><td colspan=12 style="text-align:center;padding:20px">No records found for "${searchVal}" - try another name</td></tr>`;
}

const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", renderTable);
  searchInput.addEventListener("keyup", renderTable);
}
document
  .getElementById("filterStatus")
  ?.addEventListener("change", renderTable);

let pendingDeleteId = null;

// NEW: Update stays in All Records - uses modal, Add Child Record is for ADD ONLY!
function editChild(id) {
  const c = getChildren().find((x) => x.id === id);
  if (!c) return;
  // Populate update modal (u = update)
  document.getElementById("uEditId").value = c.id;
  document.getElementById("uName").value = c.name;
  document.getElementById("uGender").value = c.gender || "";
  document.getElementById("uAge").value = c.age;
  document.getElementById("uPurok").value = c.purok;
  document.getElementById("uAddress").value = c.address;
  document.getElementById("uWeight").value = c.weight;
  document.getElementById("uHeight").value = c.height;
  document.getElementById("uDate").value = c.date;
  calculateUpdateBMI();
  // Show modal - stays in All Records!
  document.getElementById("updateChildModal")?.classList.add("show");
}
function closeUpdateChildModal() {
  document.getElementById("updateChildModal")?.classList.remove("show");
  document.getElementById("uEditId").value = "";
}
function calculateUpdateBMI() {
  const w = parseFloat(document.getElementById("uWeight")?.value);
  const h = parseFloat(document.getElementById("uHeight")?.value);
  if (!w || !h) {
    const box = document.getElementById("uBmiResultBox");
    if (box) box.classList.remove("show");
    return null;
  }
  const hm = h / 100;
  const bmi = w / (hm * hm);
  const cls = getClassification(bmi);
  const box = document.getElementById("uBmiResultBox");
  if (box) box.classList.add("show");
  const bv = document.getElementById("uBmiValue");
  if (bv) bv.textContent = bmi.toFixed(2);
  const el = document.getElementById("uBmiClass");
  if (el) {
    el.textContent = cls;
    el.className = "badge " + cls;
  }
  return { bmi, cls };
}
async function saveUpdateChild() {
  const result = calculateUpdateBMI();
  if (!result) return alert("Please enter weight and height first!");
  const id = document.getElementById("uEditId").value;
  if (!id) return alert("No child selected for update!");
  const currentUserUpdate =
    typeof getCurrentUsername === "function"
      ? getCurrentUsername()
      : typeof getCurrentUsernameGlobal === "function"
        ? getCurrentUsernameGlobal()
        : "admin";
  const orig = getChildren().find((x) => x.id === id) || {};
  const data = {
    id: id,
    name: document.getElementById("uName").value.trim(),
    age: parseInt(document.getElementById("uAge").value),
    gender: document.getElementById("uGender").value,
    purok: document.getElementById("uPurok").value,
    address: document.getElementById("uAddress").value.trim(),
    weight: parseFloat(document.getElementById("uWeight").value),
    height: parseFloat(document.getElementById("uHeight").value),
    bmi: parseFloat(result.bmi.toFixed(2)),
    status: result.cls,
    date:
      document.getElementById("uDate").value ||
      new Date().toISOString().split("T")[0],
    notes: "",
    created_by: orig.created_by || currentUserUpdate,
    created_at: orig.created_at || new Date().toISOString(),
    updated_by: currentUserUpdate,
    updated_at: new Date().toISOString(),
  };
  if (data.age < 0 || data.age > 59)
    return alert("Age must be 0-59 months only!");

  const btn = document.querySelector("#updateChildModal .btn-primary");
  const oldText = btn ? btn.textContent : "";
  if (btn) {
    btn.textContent = "Updating...";
    btn.disabled = true;
  }

  try {
    if (USE_SUPABASE && isSupabaseConfigured()) {
      const saved = await saveSingleChildToSupabase(data, true);
      if (saved) {
        let children = getChildrenSync();
        children = children.map((c) =>
          c.id === id ? { ...data, id: saved.id || id } : c,
        );
        saveChildren(children);
        await loadChildren();
        renderDashboard();
        renderTable();
        renderPurok();
        renderFeeding();
        alert("✅ Updated! Record for " + data.name);
        closeUpdateChildModal();
        // Stay in All Records!
        return;
      }
    }
    let children = getChildrenSync();
    children = children.map((c) => (c.id === id ? data : c));
    saveChildren(children);
    renderDashboard();
    renderTable();
    renderPurok();
    renderFeeding();
    alert("✅ Updated! Record for " + data.name);
    closeUpdateChildModal();
  } catch (err) {
    alert("Update failed: " + (err.message || err));
  } finally {
    if (btn) {
      btn.textContent = oldText || "💾 Update Record";
      btn.disabled = false;
    }
  }
}
// Legacy cancelUpdate no longer needed - add is add-only now
function cancelUpdate() {
  resetForm();
}

function deleteChild(id) {
  const child = getChildren().find((x) => x.id === id);
  pendingDeleteId = id;
  document.getElementById("deleteMsg").textContent = child
    ? `Are you sure you want to delete record of "${child.name}"? This action cannot be undone.`
    : "Are you sure you want to delete this record?";
  document.getElementById("deleteModal").classList.add("show");
}
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("show");
  pendingDeleteId = null;
}
async function confirmDelete() {
  if (!pendingDeleteId) return;
  // Try Supabase delete first
  if (
    typeof deleteSingleChildFromSupabase === "function" &&
    typeof isSupabaseConfigured === "function" &&
    isSupabaseConfigured()
  ) {
    const deleted = await deleteSingleChildFromSupabase(pendingDeleteId);
    if (deleted) {
      // Remove from cache
      if (childrenCache)
        childrenCache = childrenCache.filter((c) => c.id !== pendingDeleteId);
    }
  }
  // Local fallback
  saveChildren(getChildren().filter((c) => c.id !== pendingDeleteId));
  closeDeleteModal();
  renderTable();
  renderDashboard();
  renderPurok();
  renderFeeding();
  alert("Record deleted successfully!");
}

let activePurok = "Purok 1";
function initPurok() {
  const tabs = document.getElementById("purokTabs");
  if (!tabs) return;
  tabs.innerHTML = [
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
    "Purok 5",
    "Purok 6",
  ]
    .map(
      (p) =>
        `<button class="purok-tab ${p === activePurok ? "active" : ""}" onclick="setPurok('${p}')">${p}</button>`,
    )
    .join("");
  renderPurok();
}
function setPurok(p) {
  activePurok = p;
  initPurok();
}
function renderPurok() {
  const container = document.getElementById("purokStats");
  if (!container) return;
  const searchP =
    document.getElementById("purokSearch")?.value.toLowerCase() || "";
  let children = getChildren().filter((c) => c.purok === activePurok);
  if (searchP) {
    children = children.filter(
      (c) =>
        c.name.toLowerCase().includes(searchP) ||
        c.address.toLowerCase().includes(searchP),
    );
  }
  document.getElementById("purokStats").innerHTML = `
    <div class="card"><h3>${children.length}</h3><p>Total in ${activePurok}</p></div>
    <div class="card normal"><h3>${children.filter((c) => c.status === "Normal").length}</h3><p>Normal</p></div>
    <div class="card under"><h3>${children.filter((c) => c.status === "Underweight").length}</h3><p>Underweight</p></div>
    <div class="card severely"><h3>${children.filter((c) => c.status === "Severely Underweight").length}</h3><p>Severely Underweight</p></div>
    <div class="card over"><h3>${children.filter((c) => c.status === "Overweight").length}</h3><p>Overweight</p></div>
  `;
  document.querySelector("#purokTable tbody").innerHTML =
    children
      .map(
        (c) =>
          `<tr>\n    <td>${c.name}</td><td><span style="background:${c.gender === "Male" ? "#e3f2fd" : "#fce4ec"};color:${c.gender === "Male" ? "#1565c0" : "#c2185b"};padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600">${c.gender || "-"}</span></td><td>${c.age}m</td><td>${c.address}</td><td>${c.bmi}</td><td><span class="badge ${c.status}">${c.status}</span></td>\n    <td><div class="action-group"><button class="btn-update" onclick="editChild('${c.id}')"><i class="fa-solid fa-pen"></i> Update</button><button class="btn-delete" onclick="deleteChild('${c.id}')"><i class="fa-solid fa-trash"></i> Delete</button></div></td>\n  </tr>`,
      )
      .join("") || "<tr><td colspan=7>No children in this purok</td></tr>";
}

function renderFeeding() {
  const tbody = document.querySelector("#feedingTable tbody");
  if (!tbody) return;
  const searchF =
    document.getElementById("feedingSearch")?.value.toLowerCase() || "";
  let allNeeding = getChildren().filter((c) => c.status === "Underweight");
  let children = [...allNeeding];
  if (searchF)
    children = children.filter(
      (c) =>
        c.name.toLowerCase().includes(searchF) ||
        c.purok.toLowerCase().includes(searchF),
    );

  document.getElementById("feedTotal").textContent = allNeeding.length;
  const affectedPuroks = new Set(allNeeding.map((c) => c.purok));
  document.getElementById("feedPurokCount").textContent = affectedPuroks.size;

  // Purok ranking logic - count per purok (Underweight only)
  const purokCounts = {};
  allNeeding.forEach((c) => {
    if (!purokCounts[c.purok]) purokCounts[c.purok] = { total: 0, under: 0 };
    purokCounts[c.purok].total++;
    if (c.status === "Underweight") purokCounts[c.purok].under++;
  });
  const ranked = Object.entries(purokCounts).sort(
    (a, b) => b[1].total - a[1].total,
  );

  // Top purok
  const topPurokEl = document.getElementById("topPurokName");
  if (topPurokEl) {
    if (ranked.length > 0) {
      topPurokEl.textContent = `${ranked[0][0]} (${ranked[0][1].total} ${ranked[0][1].total === 1 ? "case" : "cases"})`;
    } else {
      topPurokEl.textContent = "-";
    }
  }

  // Render ranking list
  const rankingList = document.getElementById("purokRankingList");
  if (rankingList) {
    if (ranked.length === 0) {
      rankingList.innerHTML =
        '<p style="text-align:center;padding:16px;opacity:.6;font-size:13px">No underweight children - great job! No priority needed.</p>';
    } else {
      rankingList.innerHTML = ranked
        .map(([purok, data], idx) => {
          const isTop = idx === 0;
          const medal =
            idx === 0
              ? "🚨"
              : idx === 1
                ? "🥈"
                : idx === 2
                  ? "🥉"
                  : ` ${idx + 1}.`;
          const severityLabel = "Needs Feeding";
          const barWidth =
            ranked[0][1].total > 0
              ? (data.total / ranked[0][1].total) * 100
              : 0;
          return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:${isTop ? "linear-gradient(135deg,#ffebee,#ffcdd2)" : "#f8faf8"};border:1.5px solid ${isTop ? "#ef9a9a" : "#eef1ef"};${isTop ? "box-shadow:0 2px 10px rgba(229,57,53,.15)" : ""}">
          <div style="font-size:18px;min-width:32px;text-align:center">${medal}</div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <b style="font-size:14px;color:${isTop ? "#c62828" : "#222"}">${purok} ${isTop ? " - PRIORITY" : ""}</b><small style="margin-left:8px;background:#ffb300;color:#fff;padding:2px 6px;border-radius:8px;font-size:9px">${severityLabel}</small>
              <span style="font-size:13px;font-weight:700;background:${isTop ? "#c62828" : "#666"};color:#fff;padding:3px 10px;border-radius:12px">${data.total} ${data.total === 1 ? "child" : "children"}</span>
            </div>
            <div style="display:flex;gap:8px;font-size:11px;opacity:.7;margin-bottom:6px">
              <span>Underweight: ${data.under}</span>
            </div>
            <div style="height:6px;background:#e0e0e0;border-radius:10px;overflow:hidden">
              <div style="height:100%;width:${barWidth}%;background:${isTop ? "linear-gradient(90deg,#e53935,#ff7043)" : "linear-gradient(90deg,#999,#bbb)"};border-radius:10px;transition:width .5s"></div>
            </div>
          </div>
        </div>`;
        })
        .join("");
    }
  }

  tbody.innerHTML =
    children
      .map(
        (c) => `<tr>
    <td><b>${c.name}</b></td><td><span style="background:${c.gender === "Male" ? "#e3f2fd" : "#fce4ec"};color:${c.gender === "Male" ? "#1565c0" : "#c2185b"};padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600">${c.gender === "Male" ? "" : c.gender === "Female" ? "" : ""} ${c.gender || "N/A"}</span></td><td><span style="background:#f0f0f0;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600">${c.purok}</span></td><td>${c.age}m</td><td><span class="badge ${c.status}">${c.status}</span></td><td>${c.bmi}</td><td>${c.address}</td>
  </tr>`,
      )
      .join("") ||
    '<tr><td colspan=7 style="text-align:center;padding:20px">No underweight children - great job!</td></tr>';
}

function exportToCSV(rows, filename) {
  const csvContent = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAllToExcel() {
  const children = getChildren();
  if (children.length === 0) return alert("No records to export!");
  const rows = [
    [
      "Name",
      "Gender",
      "Age (months)",
      "Purok",
      "Address",
      "Weight(kg)",
      "Height(cm)",
      "BMI",
      "Status",
      "Date",
    ],
  ];
  children.forEach((c) =>
    rows.push([
      c.name,
      c.gender || "",
      c.age,
      c.purok,
      c.address,
      c.weight,
      c.height,
      c.bmi,
      c.status,
      c.date,
    ]),
  );
  exportToCSV(
    rows,
    `NutriTrack_AllRecords_${new Date().toISOString().split("T")[0]}.csv`,
  );
}

function exportFeedingToExcel() {
  const children = getChildren().filter((c) => c.status === "Underweight");
  if (children.length === 0)
    return alert("No underweight children - no feeding list needed!");
  const rows = [
    [
      "Name",
      "Gender",
      "Purok",
      "Age",
      "Status",
      "BMI",
      "Weight",
      "Height",
      "Address",
      "Date",
    ],
  ];
  children.forEach((c) =>
    rows.push([
      c.name,
      c.gender || "",
      c.purok,
      c.age,
      c.status,
      c.bmi,
      c.weight,
      c.height,
      c.address,
      c.date,
    ]),
  );
  exportToCSV(
    rows,
    `FeedingList_${new Date().toISOString().split("T")[0]}.csv`,
  );
  return;
}
function exportFeedingToExcel_old() {
  const children2 = getChildren().filter((c) => c.status === "Underweight");
  if (children2.length === 0)
    return alert("No feeding list to export - great job!");
  // will be defined below
  const rows = [
    [
      "Name",
      "Purok",
      "Age (months)",
      "Status",
      "BMI",
      "Weight",
      "Height",
      "Address",
      "Date",
      "Notes",
    ],
  ];
  children.forEach((c) =>
    rows.push([
      c.name,
      c.purok,
      c.age,
      c.status,
      c.bmi,
      c.weight,
      c.height,
      c.address,
      c.date,
      c.notes || "",
    ]),
  );
  exportToCSV(
    rows,
    `NutriTrack_FeedingList_${new Date().toISOString().split("T")[0]}.csv`,
  );
}

function printPurokReport() {
  const children = getChildren().filter((c) => c.purok === activePurok);
  if (children.length === 0) return alert("No records in " + activePurok);
  const total = children.length;
  const normal = children.filter((c) => c.status === "Normal").length;
  const under = children.filter((c) => c.status === "Underweight").length;
  const over = children.filter((c) => c.status === "Overweight").length;
  const obese = children.filter((c) => c.status === "Obese").length;
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Purok Report - ${activePurok}</title>
    <style>
      body{font-family:Poppins,Arial;padding:24px;color:#222}
      .header{display:flex;align-items:flex-start;gap:18px;border-bottom:2px solid #1a7a4c;padding-bottom:14px;margin-bottom:16px}
      .header img{width:80px;height:80px;border-radius:50%;object-fit:cover;flex-shrink:0}
      .header-text{flex:1;text-align:center}
      .header-text h1{margin:0;font-size:20px;color:#1a7a4c;text-align:center}
      .header-text h2{margin:4px 0;font-size:16px;text-align:center}
      .header-text p{margin:2px 0;font-size:11px;opacity:.7;text-align:center}
      table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #999;padding:6px;text-align:left;font-size:11px} th{background:#1a7a4c;color:#fff}
      .footer{margin-top:18px;border-top:1px solid #ddd;padding-top:10px;font-size:11px}
      .summary-box{margin-top:16px;background:#f9f9f9;padding:12px;border:1px solid #ddd;border-radius:6px;text-align:justify}
      .summary-box p{text-align:justify;margin:4px 0;font-size:12px}
      @media print{.no-print{display:none}}
    </style>
    </head><body>
    <div class="header">
      <img src="logo.png" onerror="this.style.display='none'">
      <div class="header-text">
        <h1>Barangay Saog, Marilao, Bulacan</h1>
        <h2>NutriTrack Saog - ${activePurok} Monitoring Report</h2>
        <p>Office Hours: 7:30AM - 4:00PM | Coverage: 0-59 Months | Ramcar Phase 2, Saog</p>
        <p>Generated: ${new Date().toLocaleString()} | Purok: ${activePurok}</p>
      </div>
    </div>
    <table><tr><th>#</th><th>Name</th><th>Gender</th><th>Age</th><th>Address</th><th>Weight</th><th>Height</th><th>BMI</th><th>Status</th><th>Date</th></tr>
    ${children.map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.gender || ""}</td><td>${c.age}m</td><td>${c.address}</td><td>${c.weight}kg</td><td>${c.height}cm</td><td>${c.bmi}</td><td>${c.status}</td><td>${c.date}</td></tr>`).join("") || '<tr><td colspan=11 style="text-align:center">No records</td></tr>'}
    </table>
    <div class="summary-box">
      <p><b>Summary:</b> Normal: ${normal} | Underweight: ${under} | Overweight: ${over} | Obese: ${obese}</p>
      <p style="margin-top:8px;text-align:justify"><b>Total Number of Children in ${activePurok}: ${total}</b></p>
      <p style="text-align:justify"><b>Purok:</b> ${activePurok} | <b>Office:</b> Ramcar Phase 2 | <b>Coverage:</b> 0-59 Months</p>
    </div>
    <div class="no-print" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:10px 24px;background:#1a7a4c;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Print</button></div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function exportPurokToExcel() {
  const children = getChildren().filter((c) => c.purok === activePurok);
  if (children.length === 0) return alert("No records in " + activePurok);
  const rows = [
    ["Purok: " + activePurok],
    [],
    ["Name", "Age", "Address", "Weight", "Height", "BMI", "Status", "Date"],
  ];
  children.forEach((c) =>
    rows.push([
      c.name,
      c.age,
      c.address,
      c.weight,
      c.height,
      c.bmi,
      c.status,
      c.date,
    ]),
  );
  exportToCSV(
    rows,
    `NutriTrack_${activePurok.replace(" ", "")}_${new Date().toISOString().split("T")[0]}.csv`,
  );
}

function printAllRecords() {
  const children = getChildren();
  const total = children.length;
  const normal = children.filter((c) => c.status === "Normal").length;
  const under = children.filter((c) => c.status === "Underweight").length;
  const obese = children.filter((c) => c.status === "Obese").length;
  const over = children.filter((c) => c.status === "Overweight").length;
  const win = window.open("", "_blank");
  win.document.write(`

    <html><head><title>NutriTrack - All Records Report</title>
    <style>
      body{font-family:Poppins,Arial;padding:24px;color:#222}
      .header{display:flex;align-items:flex-start;gap:18px;border-bottom:2px solid #1a7a4c;padding-bottom:14px;margin-bottom:16px}
      .header img{width:80px;height:80px;border-radius:50%;object-fit:cover;flex-shrink:0}
      .header-text{flex:1;text-align:center}
      .header-text h1{margin:0;font-size:20px;color:#1a7a4c;text-align:center}
      .header-text h2{margin:4px 0;font-size:16px;text-align:center}
      .header-text p{margin:2px 0;font-size:11px;opacity:.7;text-align:center}
      table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #999;padding:6px;text-align:left;font-size:11px} th{background:#1a7a4c;color:#fff}
      .footer{margin-top:18px;border-top:1px solid #ddd;padding-top:10px;font-size:11px}
      .summary-box{margin-top:16px;background:#f9f9f9;padding:12px;border:1px solid #ddd;border-radius:6px;text-align:justify}
      .summary-box p{text-align:justify}
    </style>
    </head><body>
    <div class="header">
      <img src="data:image/png;base64,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" alt="Barangay Saog Logo">
      <div class="header-text">
        <h1>Barangay Saog, Marilao, Bulacan</h1>
        <h2>NutriTrack Saog - All Children Records</h2>
        <p>Office Hours: 7:30AM - 4:00PM | Coverage: 0-59 Months | Ramcar Phase 2, Saog</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
    </div>

    <table><tr><th>#</th><th>Name</th><th>Gender</th><th>Age</th><th>Purok</th><th>Wt</th><th>Ht</th><th>BMI</th><th>Status</th><th>Address</th><th>Date</th></tr>
    ${children.map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.gender || ""}</td><td>${c.age}m</td><td>${c.purok}</td><td>${c.weight}kg</td><td>${c.height}cm</td><td>${c.bmi}</td><td>${c.status}</td><td>${c.address}</td><td>${c.date}</td></tr>`).join("") || '<tr><td colspan=11 style="text-align:center">No records</td></tr>'}
    </table>

    <div class="summary-box">
      <p><b>Summary:</b> Normal: ${normal} | Underweight: ${under} | Overweight: ${over} | Obese: ${obese}</p>
      <p style="margin-top:8px;text-align:justify"><b>Total Number of Children: ${total}</b></p>
    </div>

    <div class="footer">
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function printFeedingReport() {
  const all = getChildren();
  const children = all.filter((c) => c.status === "Underweight");
  const totalAll = all.length;
  const win = window.open("", "_blank");
  win.document.write(`

    <html><head><title>Feeding Program Priority List</title>
    <style>
      body{font-family:Poppins,Arial;padding:24px;color:#222}
      .header{display:flex;align-items:flex-start;gap:18px;border-bottom:2px solid #c62828;padding-bottom:14px;margin-bottom:16px}
      .header img{width:80px;height:80px;border-radius:50%;object-fit:cover;flex-shrink:0}
      .header-text{flex:1;text-align:center}
      .header-text h1{margin:0;font-size:18px;color:#c62828;text-align:center}
      .header-text h2{margin:4px 0;font-size:15px;text-align:center}
      .header-text p{font-size:11px;opacity:.7;text-align:center}
      table{width:100%;border-collapse:collapse;margin-top:12px} th,td{border:1px solid #999;padding:6px;font-size:11px;text-align:left} th{background:#c62828;color:#fff}
      .summary-box{margin-top:16px;background:#fff5f5;padding:12px;border:1px solid #ddd;border-radius:6px;text-align:justify}
    </style>
    </head><body>
    <div class="header">
      <img src="data:image/png;base64,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" alt="Barangay Saog Logo">
      <div class="header-text">
        <h1>Barangay Saog, Marilao, Bulacan</h1>
        <h2>Feeding Program Priority List</h2>
        <p>Generated: ${new Date().toLocaleString()} | Office: Ramcar Phase 2 | Coverage: 0-59 Months</p>
      </div>
    </div>

    <table><tr><th>#</th><th>Name</th><th>Purok</th><th>Age</th><th>Status</th><th>BMI</th><th>Weight</th><th>Height</th><th>Address</th><th>Date</th></tr>
    ${children.map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.purok}</td><td>${c.age}m</td><td>${c.status}</td><td>${c.bmi}</td><td>${c.weight}kg</td><td>${c.height}cm</td><td>${c.address}</td><td>${c.date}</td></tr>`).join("") || "<tr><td colspan=11>No priority children - Excellent!</td></tr>"}
    </table>

    <div class="summary-box">
      <p style="text-align:justify"><b>Summary:</b> Target is Underweight Children for Feeding Program</p>
      <p style="text-align:justify"><b>Total Number of Children Monitored: ${totalAll}</b></p>
      <p style="text-align:justify"><b>Total Number of Children Needing Feeding: ${children.length}</b></p>
      <p style="text-align:justify"><b>Total Number of Healthy Children: ${totalAll - children.length}</b></p>
    </div>

    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

function printFeeding() {
  printFeedingReport();
}
if (isDashboard) {
  renderDashboard();
}

// === ACCOUNT SETTINGS - Change Username/Password but keep records ===
function showAccountModal() {
  const cur = getCurrentUser();
  if (!cur) return;
  document.getElementById("currentUserLabel").textContent = cur.username;
  document.getElementById("newUsername").value = cur.username;
  document.getElementById("newPassword").value = "";
  document.getElementById("newPassword2").value = "";
  document.getElementById("accountModal")?.classList.add("show");
}
function closeAccountModal() {
  document.getElementById("accountModal")?.classList.remove("show");
}
async function saveAccountChanges() {
  const cur = getCurrentUser();
  if (!cur) return alert("No current user!");
  const oldUsername = cur.username;
  const newUsername = document.getElementById("newUsername").value.trim();
  const newPass = document.getElementById("newPassword").value;
  const newPass2 = document.getElementById("newPassword2").value;
  if (!newUsername) return alert("Username required!");
  if (!newPass) return alert("Password required!");
  if (newPass !== newPass2) return alert("Passwords do not match!");
  if (newUsername.length < 3) return alert("Username must be at least 3 chars");
  if (newPass.length < 4) return alert("Password must be at least 4 chars");

  const btn = document.getElementById("saveAccountBtn");
  const oldText = btn.textContent;
  btn.textContent = "Saving...";
  btn.disabled = true;

  try {
    if (
      USE_SUPABASE &&
      typeof getSupabase === "function" &&
      isSupabaseConfigured()
    ) {
      const supabase = getSupabase();
      // Check if new username exists (if changed)
      if (newUsername !== oldUsername) {
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("username", newUsername)
          .maybeSingle();
        if (existing) {
          alert(
            'Username "' + newUsername + '" already exists! Choose another.',
          );
          btn.textContent = oldText;
          btn.disabled = false;
          return;
        }
      }
      // Update users table
      const { data, error } = await supabase
        .from("users")
        .update({ username: newUsername, password: newPass })
        .eq("id", cur.id)
        .select()
        .single();
      if (error) throw error;

      // Update children created_by from old to new (keep records!)
      if (newUsername !== oldUsername) {
        const { error: childErr } = await supabase
          .from("children")
          .update({ created_by: newUsername })
          .eq("created_by", oldUsername);
        if (childErr)
          console.warn("Failed to transfer children records:", childErr);
        else
          console.log(
            `Transferred records from ${oldUsername} to ${newUsername}`,
          );
      }

      // Update localStorage current user
      const updatedUser = data || {
        ...cur,
        username: newUsername,
        password: newPass,
      };
      localStorage.setItem("nt_current", JSON.stringify(updatedUser));

      // Migrate localStorage keys if username changed
      if (newUsername !== oldUsername) {
        try {
          const oldKey = `nt_children_${oldUsername}`;
          const newKey = `nt_children_${newUsername}`;
          const oldData = localStorage.getItem(oldKey);
          if (oldData) {
            localStorage.setItem(newKey, oldData);
            // Keep old for backup but mark migrated
            console.log("Migrated localStorage from", oldKey, "to", newKey);
          }
        } catch (e) {}
      }

      // Update UI
      document.getElementById("userDisplay").textContent =
        updatedUser.name || updatedUser.username;
      alert(
        `✅ Account updated!\nUsername: ${oldUsername} → ${newUsername}\nYour ${getChildren().length} child records are still there!\nPlease login with new credentials next time.`,
      );
      closeAccountModal();
      // Reload children to reflect new username
      await loadChildren();
      if (typeof renderDashboard === "function") renderDashboard();
      if (typeof renderTable === "function") renderTable();
    } else {
      // Offline fallback - localStorage only
      let users = JSON.parse(localStorage.getItem("nt_users") || "[]");
      if (
        newUsername !== oldUsername &&
        users.find((u) => u.username === newUsername)
      ) {
        alert("Username already exists!");
        btn.textContent = oldText;
        btn.disabled = false;
        return;
      }
      users = users.map((u) =>
        u.username === oldUsername
          ? { ...u, username: newUsername, password: newPass }
          : u,
      );
      localStorage.setItem("nt_users", JSON.stringify(users));
      const updated = { ...cur, username: newUsername, password: newPass };
      localStorage.setItem("nt_current", JSON.stringify(updated));
      // Transfer local children
      if (newUsername !== oldUsername) {
        const oldKey = `nt_children_${oldUsername}`;
        const newKey = `nt_children_${newUsername}`;
        const oldData = localStorage.getItem(oldKey);
        if (oldData) localStorage.setItem(newKey, oldData);
        // Also update old shared key's created_by if needed
        let children = JSON.parse(localStorage.getItem(newKey) || "[]");
        children = children.map((c) => ({ ...c, created_by: newUsername }));
        localStorage.setItem(newKey, JSON.stringify(children));
      }
      document.getElementById("userDisplay").textContent = newUsername;
      alert("✅ Account updated offline! Records kept.");
      closeAccountModal();
      location.reload();
    }
  } catch (err) {
    console.error("Account update failed:", err);
    alert("Failed to update account: " + (err.message || err));
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

window.togglePass = togglePass;
window.logout = logout;
window.calculateBMI = calculateBMI;
window.resetForm = resetForm;
window.cancelUpdate = cancelUpdate;
window.editChild = editChild;
window.closeUpdateChildModal = closeUpdateChildModal;
window.calculateUpdateBMI = calculateUpdateBMI;
window.saveUpdateChild = saveUpdateChild;
window.deleteChild = deleteChild;
window.setPurok = setPurok;
window.renderPurok = renderPurok;
window.renderTable = renderTable;
window.renderFeeding = renderFeeding;
window.printFeeding = printFeeding;
window.exportAllToExcel = exportAllToExcel;
window.exportFeedingToExcel = exportFeedingToExcel;
window.exportPurokToExcel = exportPurokToExcel;
window.printAllRecords = printAllRecords;
window.printFeedingReport = printFeedingReport;
window.initPurok = initPurok;
window.printPurokReport = printPurokReport;
window.closeDeleteModal = closeDeleteModal;
window.showLogoutModal = showLogoutModal;

function showDeleteAccountModal() {
  const cur = getCurrentUser();
  if (!cur) return;
  const username = cur.username;
  const recordsCount = getChildren().length;
  document.getElementById("deleteAccountUsername").textContent = username;
  document.getElementById("deleteAccountRecords").textContent = recordsCount;
  document.getElementById("deleteConfirmUsernameLabel").textContent = username;
  document.getElementById("deleteConfirmInput").value = "";
  document.getElementById("deleteAccountModal")?.classList.add("show");
}
function closeDeleteAccountModal() {
  document.getElementById("deleteAccountModal")?.classList.remove("show");
  document.getElementById("deleteConfirmInput").value = "";
}
async function confirmDeleteAccount() {
  const cur = getCurrentUser();
  if (!cur) return;
  const username = cur.username;
  const confirmInput = document
    .getElementById("deleteConfirmInput")
    .value.trim();
  if (confirmInput !== username) {
    alert(`Please type exactly "${username}" to confirm deletion!`);
    return;
  }
  if (
    !confirm(
      `FINAL CONFIRMATION:\n\nDelete account "${username}" and ${getChildren().length} child records?\n\nThis CANNOT be undone!\n\nClick OK to PERMANENTLY DELETE.`,
    )
  ) {
    return;
  }
  const btn = document.getElementById("confirmDeleteAccountBtn");
  const oldText = btn.textContent;
  btn.textContent = "Deleting...";
  btn.disabled = true;
  try {
    if (
      USE_SUPABASE &&
      typeof getSupabase === "function" &&
      isSupabaseConfigured()
    ) {
      const supabase = getSupabase();
      // Delete children records first
      const { error: childErr } = await supabase
        .from("children")
        .delete()
        .eq("created_by", username);
      if (childErr) console.warn("Failed to delete children:", childErr);
      else console.log(`Deleted children records for ${username}`);
      // Delete user
      const { error: userErr } = await supabase
        .from("users")
        .delete()
        .eq("id", cur.id);
      if (userErr) {
        // Try by username if id fails
        const { error: userErr2 } = await supabase
          .from("users")
          .delete()
          .eq("username", username);
        if (userErr2) throw userErr2;
      }
      console.log(`Deleted user ${username} from Supabase`);
    }
    // Delete from localStorage
    try {
      let users = JSON.parse(localStorage.getItem("nt_users") || "[]");
      users = users.filter((u) => u.username !== username);
      localStorage.setItem("nt_users", JSON.stringify(users));
      // Delete per-user children
      localStorage.removeItem(`nt_children_${username}`);
      localStorage.removeItem("nt_current");
      localStorage.removeItem("nt_children");
      // Clean migrated flags
      Object.keys(localStorage).forEach((k) => {
        if (k.includes(username) || k.includes("migrated_" + username)) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn("Local cleanup error", e);
    }

    alert(
      `✅ Account "${username}" and all ${getChildren().length} records have been permanently deleted!\n\nRedirecting to login...`,
    );
    closeDeleteAccountModal();
    closeAccountModal();
    location.href = "index.html";
  } catch (err) {
    console.error("Delete account failed:", err);
    alert("Failed to delete account: " + (err.message || err));
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

window.showAccountModal = showAccountModal;
window.closeAccountModal = closeAccountModal;
window.saveAccountChanges = saveAccountChanges;
window.showDeleteAccountModal = showDeleteAccountModal;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.confirmDeleteAccount = confirmDeleteAccount;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
window.confirmDelete = confirmDelete;
window.showLogoutModal = showLogoutModal;

function showDeleteAccountModal() {
  const cur = getCurrentUser();
  if (!cur) return;
  const username = cur.username;
  const recordsCount = getChildren().length;
  document.getElementById("deleteAccountUsername").textContent = username;
  document.getElementById("deleteAccountRecords").textContent = recordsCount;
  document.getElementById("deleteConfirmUsernameLabel").textContent = username;
  document.getElementById("deleteConfirmInput").value = "";
  document.getElementById("deleteAccountModal")?.classList.add("show");
}
function closeDeleteAccountModal() {
  document.getElementById("deleteAccountModal")?.classList.remove("show");
  document.getElementById("deleteConfirmInput").value = "";
}
async function confirmDeleteAccount() {
  const cur = getCurrentUser();
  if (!cur) return;
  const username = cur.username;
  const confirmInput = document
    .getElementById("deleteConfirmInput")
    .value.trim();
  if (confirmInput !== username) {
    alert(`Please type exactly "${username}" to confirm deletion!`);
    return;
  }
  if (
    !confirm(
      `FINAL CONFIRMATION:\n\nDelete account "${username}" and ${getChildren().length} child records?\n\nThis CANNOT be undone!\n\nClick OK to PERMANENTLY DELETE.`,
    )
  ) {
    return;
  }
  const btn = document.getElementById("confirmDeleteAccountBtn");
  const oldText = btn.textContent;
  btn.textContent = "Deleting...";
  btn.disabled = true;
  try {
    if (
      USE_SUPABASE &&
      typeof getSupabase === "function" &&
      isSupabaseConfigured()
    ) {
      const supabase = getSupabase();
      // Delete children records first
      const { error: childErr } = await supabase
        .from("children")
        .delete()
        .eq("created_by", username);
      if (childErr) console.warn("Failed to delete children:", childErr);
      else console.log(`Deleted children records for ${username}`);
      // Delete user
      const { error: userErr } = await supabase
        .from("users")
        .delete()
        .eq("id", cur.id);
      if (userErr) {
        // Try by username if id fails
        const { error: userErr2 } = await supabase
          .from("users")
          .delete()
          .eq("username", username);
        if (userErr2) throw userErr2;
      }
      console.log(`Deleted user ${username} from Supabase`);
    }
    // Delete from localStorage
    try {
      let users = JSON.parse(localStorage.getItem("nt_users") || "[]");
      users = users.filter((u) => u.username !== username);
      localStorage.setItem("nt_users", JSON.stringify(users));
      // Delete per-user children
      localStorage.removeItem(`nt_children_${username}`);
      localStorage.removeItem("nt_current");
      localStorage.removeItem("nt_children");
      // Clean migrated flags
      Object.keys(localStorage).forEach((k) => {
        if (k.includes(username) || k.includes("migrated_" + username)) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn("Local cleanup error", e);
    }

    alert(
      `✅ Account "${username}" and all ${getChildren().length} records have been permanently deleted!\n\nRedirecting to login...`,
    );
    closeDeleteAccountModal();
    closeAccountModal();
    location.href = "index.html";
  } catch (err) {
    console.error("Delete account failed:", err);
    alert("Failed to delete account: " + (err.message || err));
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

window.showAccountModal = showAccountModal;
window.closeAccountModal = closeAccountModal;
window.saveAccountChanges = saveAccountChanges;
window.showDeleteAccountModal = showDeleteAccountModal;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.confirmDeleteAccount = confirmDeleteAccount;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;

// =============================================
// DB STATUS & INITIAL LOAD - Robust version
// =============================================
async function initDBStatus() {
  const statusEl = document.getElementById("dbStatus");
  // Always hide badge visually but keep connection logic
  if (statusEl) {
    statusEl.classList.add("d-none");
    statusEl.style.display = "none";
    statusEl.setAttribute("hidden", "");
  }
  const isConfigured =
    typeof isSupabaseConfigured === "function" && isSupabaseConfigured();
  console.log(
    "isSupabaseConfigured:",
    isConfigured,
    "USE_SUPABASE:",
    typeof USE_SUPABASE !== "undefined" ? USE_SUPABASE : "undefined",
  );
  if (isConfigured) {
    console.log(
      "✅ Supabase PostgreSQL Connected (badge hidden, connection active) - URL:",
      typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "unknown",
    );
    // Keep badge text for debugging but hidden
    if (statusEl) {
      statusEl.textContent = "🟢 Supabase PostgreSQL Connected";
      statusEl.className = "db-status db-connected d-none";
      statusEl.style.display = "none";
    }
    try {
      await loadChildren();
    } catch (e) {
      console.warn("loadChildren failed", e);
    }
    if (typeof renderDashboard === "function") renderDashboard();
    if (typeof renderTable === "function") renderTable();
    if (typeof renderPurok === "function") renderPurok();
    if (typeof renderFeeding === "function") renderFeeding();
  } else {
    console.log("🟡 Offline Mode - Supabase not configured (badge hidden)");
    if (statusEl) {
      statusEl.textContent = "🟡 Offline Mode (localStorage)";
      statusEl.className = "db-status db-offline d-none";
      statusEl.style.display = "none";
    }
    if (typeof renderDashboard === "function") renderDashboard();
  }
}
// Run now or on DOMContentLoaded - handles both cases
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDBStatus);
} else {
  initDBStatus();
}
window.initDBStatus = initDBStatus;

// === Show full address modal ===
function showFullAddress(name, address) {
  const existing = document.getElementById("addressModal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.id = "addressModal";
  modal.className = "modal-overlay show";
  modal.style.zIndex = "9999";
  modal.innerHTML =
    '<div class="modal" style="max-width:480px"><div style="text-align:center;margin-bottom:12px"><div style="font-size:32px">📍</div><h3 style="margin:8px 0 4px 0">' +
    name +
    '</h3><p style="font-size:12px;color:#666;margin:0">Complete Address</p></div><div style="background:#f8faf8;border:1.5px solid #e0e4e1;border-radius:12px;padding:16px;margin:16px 0;text-align:left;line-height:1.5;font-size:14px;word-break:break-word">' +
    address +
    '</div><div style="text-align:center"><button class="btn-primary" onclick="document.getElementById(\'addressModal\').remove()" style="padding:10px 24px;border-radius:10px">OK, Close</button></div></div>';
  modal.onclick = function (e) {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}
function showFullAddressById(id) {
  const c = getChildren().find(function (x) {
    return x.id === id;
  });
  if (!c) return;
  showFullAddress(c.name, c.address);
}
