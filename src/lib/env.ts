// Central place for environment access so missing config fails loudly and early.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
};

export const serverEnv = {
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  encryptionKey: () => required("ENCRYPTION_KEY", process.env.ENCRYPTION_KEY),
  cronSecret: () => process.env.CRON_SECRET || "",
  // Optional job sources that need their own (free) API keys
  adzunaAppId: () => process.env.ADZUNA_APP_ID || "",
  adzunaAppKey: () => process.env.ADZUNA_APP_KEY || "",
  adzunaCountry: () => process.env.ADZUNA_COUNTRY || "us",
  usajobsKey: () => process.env.USAJOBS_API_KEY || "",
  usajobsEmail: () => process.env.USAJOBS_EMAIL || "",
  jsearchKey: () => process.env.RAPIDAPI_JSEARCH_KEY || "",
  // Company career boards scanned by the Greenhouse / Lever / Ashby sources
  greenhouseBoards: () => list(process.env.GREENHOUSE_BOARDS),
  leverCompanies: () => list(process.env.LEVER_COMPANIES),
  ashbyBoards: () => list(process.env.ASHBY_BOARDS),
};

function list(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
