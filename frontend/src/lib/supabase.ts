import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

// Support both key names (Supabase dashboard uses ANON_KEY; some setups use PUBLISHABLE_KEY)
const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ""
)
  .trim()
  .replace(/^["']|["']$/g, "");

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project-ref") &&
  supabaseUrl.startsWith("https://")
);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
