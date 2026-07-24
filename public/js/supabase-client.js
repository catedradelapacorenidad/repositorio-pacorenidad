const SUPABASE_URL =
  "https://rzqbdcggkkseuqlwanvr.supabase.co";

const SUPABASE_PUBLIC_KEY =
  "sb_publishable_88OgMEMwE59-ddHHNLUBsw_PhhnTULw";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);

window.supabaseClient = supabaseClient;