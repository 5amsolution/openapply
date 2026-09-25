// Client-safe source metadata (the adapters themselves are server-only).

export const SOURCE_META: Record<string, { label: string; homepage: string }> = {
  jsearch: { label: "JSearch", homepage: "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" },
  adzuna: { label: "Adzuna", homepage: "https://www.adzuna.com" },
  usajobs: { label: "USAJOBS", homepage: "https://www.usajobs.gov" },
  remotive: { label: "Remotive", homepage: "https://remotive.com" },
  himalayas: { label: "Himalayas", homepage: "https://himalayas.app" },
  jobicy: { label: "Jobicy", homepage: "https://jobicy.com" },
  remoteok: { label: "Remote OK", homepage: "https://remoteok.com" },
  arbeitnow: { label: "Arbeitnow", homepage: "https://www.arbeitnow.com" },
  greenhouse: { label: "Greenhouse", homepage: "https://www.greenhouse.com" },
  lever: { label: "Lever", homepage: "https://www.lever.co" },
  ashby: { label: "Ashby", homepage: "https://www.ashbyhq.com" },
};

export function sourceLabel(id: string): string {
  return SOURCE_META[id]?.label ?? id;
}
