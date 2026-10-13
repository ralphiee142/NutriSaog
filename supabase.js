const SUPABASE_URL = "https://owwqmlcctjkhxayhliei.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zJ_zh5Jo8wCBNM9a4IbKkg_gQuwXLIv";

let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient) {
    if (typeof window.supabase === "undefined") {
      console.error("Supabase JS not loaded!");
      return null;
    }
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );
  }
  return supabaseClient;
}
function isSupabaseConfigured() {
  return (
    SUPABASE_URL.includes("supabase.co") && SUPABASE_ANON_KEY.startsWith("sb_")
  );
}
async function testSupabaseConnection() {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);
    if (error) throw error;
    console.log("✅ Supabase PostgreSQL Connected!");
    return true;
  } catch (err) {
    console.error("❌ Supabase connection failed:", err);
    return false;
  }
}
