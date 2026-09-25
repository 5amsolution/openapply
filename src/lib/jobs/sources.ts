import "server-only";
import { serverEnv } from "@/lib/env";
import { cacheGet, cacheSet, consumeQuota } from "@/lib/api-cache";
import type { JobInput } from "@/lib/types";
import {
  fetchJSON,
  fixMojibake,
  htmlToText,
  isRemoteText,
  matchesKeywords,
  num,
  toISO,
} from "@/lib/jobs/util";

// Each source turns a (keywords, location) query into normalized jobs.
// Free public APIs work out of the box; keyed sources switch on when their
// env vars are set. Every job keeps a link back to the original posting,
// which is what these APIs ask for in return.

export interface SearchQuery {
  keywords: string;
  location?: string;
  remoteOnly?: boolean;
  /** Background runs (autopilot) set this so metered sources only answer from cache. */
  cacheOnly?: boolean;
}

export interface JobSource {
  id: string;
  label: string;
  homepage: string;
  /** Only remote jobs? Used to skip the source for on-site-only searches. */
  remoteOnly: boolean;
  enabled: () => boolean;
  search: (q: SearchQuery) => Promise<JobInput[]>;
}

const base = {
  company_logo: null,
  employment_type: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  salary_period: null,
  apply_url: null,
  tags: [],
  posted_at: null,
} satisfies Partial<JobInput>;

// ---------------------------------------------------------------------------
// Remotive — remote jobs, keyword search
// ---------------------------------------------------------------------------
const remotive: JobSource = {
  id: "remotive",
  label: "Remotive",
  homepage: "https://remotive.com",
  remoteOnly: true,
  enabled: () => true,
  async search(q) {
    type R = {
      jobs: {
        id: number;
        url: string;
        title: string;
        company_name: string;
        company_logo?: string;
        tags?: string[];
        job_type?: string;
        publication_date?: string;
        candidate_required_location?: string;
        salary?: string;
        description?: string;
      }[];
    };
    const data = await fetchJSON<R>(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q.keywords)}&limit=60`,
    );
    return data.jobs.map((j) => ({
      ...base,
      source: "remotive",
      external_id: String(j.id),
      title: j.title,
      company: j.company_name,
      company_logo: j.company_logo || null,
      location: j.candidate_required_location || "Remote",
      remote: true,
      employment_type: j.job_type?.replace(/_/g, " ") || null,
      description: htmlToText(j.description),
      url: j.url,
      tags: j.tags ?? [],
      posted_at: toISO(j.publication_date),
    }));
  },
};

// ---------------------------------------------------------------------------
// Himalayas — remote jobs, keyword search
// ---------------------------------------------------------------------------
const himalayas: JobSource = {
  id: "himalayas",
  label: "Himalayas",
  homepage: "https://himalayas.app",
  remoteOnly: true,
  enabled: () => true,
  async search(q) {
    type H = {
      jobs: {
        title: string;
        companyName: string;
        companyLogo?: string;
        employmentType?: string;
        minSalary?: number | null;
        maxSalary?: number | null;
        currency?: string | null;
        salaryPeriod?: string | null;
        locationRestrictions?: string[];
        categories?: string[];
        description?: string;
        excerpt?: string;
        pubDate?: number;
        applicationLink: string;
        guid: string;
      }[];
    };
    const data = await fetchJSON<H>(
      `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q.keywords)}&limit=50`,
    );
    return (data.jobs ?? []).map((j) => ({
      ...base,
      source: "himalayas",
      external_id: j.guid,
      title: j.title,
      company: j.companyName,
      company_logo: j.companyLogo || null,
      location: j.locationRestrictions?.length ? j.locationRestrictions.slice(0, 6).join(", ") : "Worldwide",
      remote: true,
      employment_type: j.employmentType || null,
      salary_min: num(j.minSalary),
      salary_max: num(j.maxSalary),
      salary_currency: j.currency || null,
      salary_period: j.salaryPeriod || null,
      description: htmlToText(j.description || j.excerpt),
      url: j.guid,
      apply_url: j.applicationLink,
      tags: (j.categories ?? []).slice(0, 8).map((c) => c.replace(/-/g, " ")),
      posted_at: toISO(j.pubDate),
    }));
  },
};

// ---------------------------------------------------------------------------
// Jobicy — remote jobs, tag search (one tag per request)
// ---------------------------------------------------------------------------
const jobicy: JobSource = {
  id: "jobicy",
  label: "Jobicy",
  homepage: "https://jobicy.com",
  remoteOnly: true,
  enabled: () => true,
  async search(q) {
    type J = {
      jobs?: {
        id: number;
        url: string;
        jobTitle: string;
        companyName: string;
        companyLogo?: string;
        jobIndustry?: string[];
        jobType?: string[];
        jobGeo?: string;
        jobDescription?: string;
        jobExcerpt?: string;
        pubDate?: string;
        annualSalaryMin?: number;
        annualSalaryMax?: number;
        salaryCurrency?: string;
      }[];
    };
    const tag = q.keywords.trim().toLowerCase();
    const data = await fetchJSON<J>(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`);
    return (data.jobs ?? []).map((j) => ({
      ...base,
      source: "jobicy",
      external_id: String(j.id),
      title: htmlToText(j.jobTitle),
      company: j.companyName,
      company_logo: j.companyLogo || null,
      location: j.jobGeo?.replace(/\s+,/g, ",").replace(/,\s+/g, ", ") || "Remote",
      remote: true,
      employment_type: j.jobType?.join(", ") || null,
      salary_min: num(j.annualSalaryMin),
      salary_max: num(j.annualSalaryMax),
      salary_currency: j.salaryCurrency || null,
      salary_period: j.annualSalaryMin ? "annual" : null,
      description: htmlToText(j.jobDescription || j.jobExcerpt),
      url: j.url,
      tags: j.jobIndustry?.map(htmlToText) ?? [],
      posted_at: toISO(j.pubDate),
    }));
  },
};

// ---------------------------------------------------------------------------
// Remote OK — full remote feed, filtered locally (cached for 30 minutes)
// ---------------------------------------------------------------------------
let remoteOkCache: { at: number; jobs: JobInput[] } | null = null;

const remoteok: JobSource = {
  id: "remoteok",
  label: "Remote OK",
  homepage: "https://remoteok.com",
  remoteOnly: true,
  enabled: () => true,
  async search(q) {
    if (!remoteOkCache || Date.now() - remoteOkCache.at > 30 * 60_000) {
      type O = {
        id?: string;
        slug?: string;
        date?: string;
        company?: string;
        company_logo?: string;
        position?: string;
        tags?: string[];
        description?: string;
        location?: string;
        apply_url?: string;
        url?: string;
        salary_min?: number;
        salary_max?: number;
      };
      const data = await fetchJSON<O[]>("https://remoteok.com/api");
      const jobs = data
        .filter((j) => j.id && j.position)
        .map((j) => ({
          ...base,
          source: "remoteok",
          external_id: String(j.id),
          title: fixMojibake(j.position!),
          company: fixMojibake(j.company || ""),
          company_logo: j.company_logo || null,
          location: fixMojibake(j.location || "") || "Remote",
          remote: true,
          salary_min: num(j.salary_min),
          salary_max: num(j.salary_max),
          salary_currency: j.salary_min ? "USD" : null,
          salary_period: j.salary_min ? "annual" : null,
          description: htmlToText(fixMojibake(j.description || "")),
          url: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
          apply_url: j.apply_url || null,
          tags: j.tags ?? [],
          posted_at: toISO(j.date),
        }));
      remoteOkCache = { at: Date.now(), jobs };
    }
    return remoteOkCache.jobs.filter((j) => matchesKeywords(j, q.keywords));
  },
};

// ---------------------------------------------------------------------------
// Arbeitnow — Europe-focused board (on-site + remote), filtered locally
// ---------------------------------------------------------------------------
const arbeitnow: JobSource = {
  id: "arbeitnow",
  label: "Arbeitnow",
  homepage: "https://www.arbeitnow.com",
  remoteOnly: false,
  enabled: () => true,
  async search(q) {
    type A = {
      data: {
        slug: string;
        company_name: string;
        title: string;
        description: string;
        remote: boolean;
        url: string;
        tags: string[];
        job_types: string[];
        location: string;
        created_at: number;
      }[];
    };
    const pages = await Promise.allSettled(
      [1, 2, 3].map((p) => fetchJSON<A>(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)),
    );
    return pages
      .flatMap((p) => (p.status === "fulfilled" ? p.value.data : []))
      .map((j) => ({
        ...base,
        source: "arbeitnow",
        external_id: j.slug,
        title: j.title,
        company: j.company_name,
        location: j.location,
        remote: j.remote,
        employment_type: j.job_types?.join(", ") || null,
        description: htmlToText(j.description),
        url: j.url,
        tags: j.tags ?? [],
        posted_at: toISO(j.created_at),
      }))
      .filter((j) => matchesKeywords(j, q.keywords));
  },
};

// ---------------------------------------------------------------------------
// Company career boards: Greenhouse, Lever, Ashby (public, no key).
// Which companies to scan is configurable; defaults are well-known employers.
// ---------------------------------------------------------------------------
const DEFAULT_GREENHOUSE = [
  "anthropic", "airbnb", "stripe", "figma", "discord", "databricks", "dropbox", "reddit",
  "coinbase", "robinhood", "gitlab", "cloudflare", "duolingo", "instacart", "lyft", "pinterest",
];
const DEFAULT_LEVER = ["spotify", "palantir", "plaid", "zoox", "whoop", "mistral"];
const DEFAULT_ASHBY = ["openai", "notion", "linear", "ramp", "vercel", "supabase", "replit", "deel"];

type BoardCache = Map<string, { at: number; jobs: JobInput[] }>;
const boardCache: BoardCache = new Map();

async function cachedBoard(key: string, load: () => Promise<JobInput[]>): Promise<JobInput[]> {
  const hit = boardCache.get(key);
  if (hit && Date.now() - hit.at < 60 * 60_000) return hit.jobs;
  const jobs = await load();
  boardCache.set(key, { at: Date.now(), jobs });
  return jobs;
}

async function scanBoards(
  companies: string[],
  prefix: string,
  load: (company: string) => Promise<JobInput[]>,
  q: SearchQuery,
): Promise<JobInput[]> {
  const results = await Promise.allSettled(companies.map((c) => cachedBoard(`${prefix}:${c}`, () => load(c))));
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((j) => matchesKeywords(j, q.keywords));
}

const greenhouse: JobSource = {
  id: "greenhouse",
  label: "Greenhouse boards",
  homepage: "https://www.greenhouse.com",
  remoteOnly: false,
  enabled: () => true,
  search: (q) =>
    scanBoards(
      serverEnv.greenhouseBoards().length ? serverEnv.greenhouseBoards() : DEFAULT_GREENHOUSE,
      "gh",
      async (board) => {
        type G = {
          jobs: {
            id: number;
            title: string;
            absolute_url: string;
            location?: { name?: string };
            updated_at?: string;
            first_published?: string;
            company_name?: string;
            content?: string;
            departments?: { name: string }[];
          }[];
        };
        const data = await fetchJSON<G>(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, {}, 15_000);
        return data.jobs.map((j) => ({
          ...base,
          source: "greenhouse",
          external_id: `${board}:${j.id}`,
          title: j.title,
          company: j.company_name || board,
          location: j.location?.name || "",
          remote: isRemoteText(j.location?.name, j.title),
          description: htmlToText(j.content),
          url: j.absolute_url,
          tags: j.departments?.map((d) => d.name) ?? [],
          posted_at: toISO(j.first_published || j.updated_at),
        }));
      },
      q,
    ),
};

const lever: JobSource = {
  id: "lever",
  label: "Lever boards",
  homepage: "https://www.lever.co",
  remoteOnly: false,
  enabled: () => true,
  search: (q) =>
    scanBoards(
      serverEnv.leverCompanies().length ? serverEnv.leverCompanies() : DEFAULT_LEVER,
      "lever",
      async (company) => {
        type L = {
          id: string;
          text: string;
          hostedUrl: string;
          applyUrl?: string;
          createdAt?: number;
          workplaceType?: string;
          descriptionPlain?: string;
          additionalPlain?: string;
          lists?: { text: string; content: string }[];
          categories?: { commitment?: string; department?: string; location?: string; team?: string; allLocations?: string[] };
          salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
        }[];
        const data = await fetchJSON<L>(`https://api.lever.co/v0/postings/${company}?mode=json`, {}, 15_000);
        return data.map((j) => ({
          ...base,
          source: "lever",
          external_id: `${company}:${j.id}`,
          title: j.text,
          company: company.charAt(0).toUpperCase() + company.slice(1),
          location: j.categories?.allLocations?.join(", ") || j.categories?.location || "",
          remote: j.workplaceType === "remote" || isRemoteText(j.categories?.location),
          employment_type: j.categories?.commitment || null,
          salary_min: num(j.salaryRange?.min),
          salary_max: num(j.salaryRange?.max),
          salary_currency: j.salaryRange?.currency || null,
          salary_period: j.salaryRange?.interval || null,
          description: [
            j.descriptionPlain || "",
            ...(j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`),
            j.additionalPlain || "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          url: j.hostedUrl,
          apply_url: j.applyUrl || null,
          tags: [j.categories?.department, j.categories?.team].filter((t): t is string => !!t),
          posted_at: toISO(j.createdAt),
        }));
      },
      q,
    ),
};

const ashby: JobSource = {
  id: "ashby",
  label: "Ashby boards",
  homepage: "https://www.ashbyhq.com",
  remoteOnly: false,
  enabled: () => true,
  search: (q) =>
    scanBoards(
      serverEnv.ashbyBoards().length ? serverEnv.ashbyBoards() : DEFAULT_ASHBY,
      "ashby",
      async (board) => {
        type S = {
          jobs: {
            id: string;
            title: string;
            department?: string;
            team?: string;
            employmentType?: string;
            location?: string;
            secondaryLocations?: { location?: string }[];
            isRemote?: boolean | null;
            workplaceType?: string | null;
            publishedAt?: string;
            jobUrl: string;
            applyUrl?: string;
            descriptionHtml?: string;
            descriptionPlain?: string;
            isListed?: boolean;
          }[];
        };
        const data = await fetchJSON<S>(`https://api.ashbyhq.com/posting-api/job-board/${board}`, {}, 15_000);
        return data.jobs
          .filter((j) => j.isListed !== false)
          .map((j) => ({
            ...base,
            source: "ashby",
            external_id: `${board}:${j.id}`,
            title: j.title,
            company: board.charAt(0).toUpperCase() + board.slice(1),
            location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join(", "),
            remote: j.isRemote === true || j.workplaceType === "Remote" || isRemoteText(j.location),
            employment_type: j.employmentType || null,
            description: j.descriptionPlain || htmlToText(j.descriptionHtml),
            url: j.jobUrl,
            apply_url: j.applyUrl || null,
            tags: [j.department, j.team].filter((t): t is string => !!t),
            posted_at: toISO(j.publishedAt),
          }));
      },
      q,
    ),
};

// ---------------------------------------------------------------------------
// Keyed sources (free tiers): Adzuna, USAJOBS, JSearch
// ---------------------------------------------------------------------------
const adzuna: JobSource = {
  id: "adzuna",
  label: "Adzuna",
  homepage: "https://www.adzuna.com",
  remoteOnly: false,
  enabled: () => !!serverEnv.adzunaAppId() && !!serverEnv.adzunaAppKey(),
  async search(q) {
    type Z = {
      results: {
        id: string;
        title: string;
        description: string;
        redirect_url: string;
        created?: string;
        company?: { display_name?: string };
        location?: { display_name?: string };
        salary_min?: number;
        salary_max?: number;
        contract_time?: string;
        category?: { label?: string };
      }[];
    };
    const params = new URLSearchParams({
      app_id: serverEnv.adzunaAppId(),
      app_key: serverEnv.adzunaAppKey(),
      what: q.remoteOnly ? `${q.keywords} remote` : q.keywords,
      results_per_page: "50",
      "content-type": "application/json",
    });
    if (q.location) params.set("where", q.location);
    const data = await fetchJSON<Z>(
      `https://api.adzuna.com/v1/api/jobs/${serverEnv.adzunaCountry()}/search/1?${params}`,
    );
    return data.results.map((j) => ({
      ...base,
      source: "adzuna",
      external_id: j.id,
      title: htmlToText(j.title),
      company: j.company?.display_name || "",
      location: j.location?.display_name || "",
      remote: isRemoteText(j.title, j.description),
      employment_type: j.contract_time?.replace(/_/g, " ") || null,
      salary_min: num(j.salary_min),
      salary_max: num(j.salary_max),
      salary_period: j.salary_min ? "annual" : null,
      description: htmlToText(j.description),
      url: j.redirect_url,
      tags: j.category?.label ? [j.category.label] : [],
      posted_at: toISO(j.created),
    }));
  },
};

const usajobs: JobSource = {
  id: "usajobs",
  label: "USAJOBS",
  homepage: "https://www.usajobs.gov",
  remoteOnly: false,
  enabled: () => !!serverEnv.usajobsKey() && !!serverEnv.usajobsEmail(),
  async search(q) {
    type U = {
      SearchResult: {
        SearchResultItems: {
          MatchedObjectId: string;
          MatchedObjectDescriptor: {
            PositionTitle: string;
            PositionURI: string;
            ApplyURI?: string[];
            OrganizationName: string;
            PositionLocationDisplay?: string;
            PositionRemuneration?: { MinimumRange?: string; MaximumRange?: string; RateIntervalCode?: string }[];
            PublicationStartDate?: string;
            QualificationSummary?: string;
            UserArea?: { Details?: { JobSummary?: string; MajorDuties?: string[] } };
            PositionSchedule?: { Name: string }[];
          };
        }[];
      };
    };
    const params = new URLSearchParams({ Keyword: q.keywords, ResultsPerPage: "50" });
    if (q.location) params.set("LocationName", q.location);
    if (q.remoteOnly) params.set("RemoteIndicator", "True");
    const data = await fetchJSON<U>(`https://data.usajobs.gov/api/search?${params}`, {
      headers: {
        host: "data.usajobs.gov",
        "user-agent": serverEnv.usajobsEmail(),
        "authorization-key": serverEnv.usajobsKey(),
      },
    });
    return data.SearchResult.SearchResultItems.map(({ MatchedObjectId, MatchedObjectDescriptor: d }) => {
      const pay = d.PositionRemuneration?.[0];
      return {
        ...base,
        source: "usajobs",
        external_id: MatchedObjectId,
        title: d.PositionTitle,
        company: d.OrganizationName,
        location: d.PositionLocationDisplay || "",
        remote: isRemoteText(d.PositionLocationDisplay),
        employment_type: d.PositionSchedule?.map((s) => s.Name).join(", ") || null,
        salary_min: num(pay?.MinimumRange),
        salary_max: num(pay?.MaximumRange),
        salary_currency: pay ? "USD" : null,
        salary_period: pay?.RateIntervalCode === "PA" ? "annual" : pay?.RateIntervalCode?.toLowerCase() || null,
        description: [
          d.UserArea?.Details?.JobSummary,
          ...(d.UserArea?.Details?.MajorDuties ?? []),
          d.QualificationSummary,
        ]
          .filter(Boolean)
          .join("\n\n"),
        url: d.PositionURI,
        apply_url: d.ApplyURI?.[0] || null,
        posted_at: toISO(d.PublicationStartDate),
      };
    });
  },
};

const jsearch: JobSource = {
  id: "jsearch",
  label: "JSearch (LinkedIn, Indeed, Glassdoor…)",
  homepage: "https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch",
  remoteOnly: false,
  enabled: () => !!serverEnv.jsearchKey(),
  async search(q) {
    type S = {
      data: {
        job_id: string;
        job_title: string;
        employer_name: string;
        employer_logo?: string | null;
        job_publisher?: string;
        job_employment_type?: string;
        job_apply_link: string;
        job_description: string;
        job_is_remote?: boolean;
        job_city?: string;
        job_state?: string;
        job_country?: string;
        job_posted_at_datetime_utc?: string;
        job_min_salary?: number | null;
        job_max_salary?: number | null;
        job_salary_currency?: string | null;
        job_salary_period?: string | null;
        job_google_link?: string;
      }[];
    };
    // The free plan is ~200 requests/month for the whole deployment, so every
    // query is cached for everyone and spending is capped per month.
    const query = [q.keywords, q.location ? `in ${q.location}` : ""].filter(Boolean).join(" ");
    const cacheKey = `jsearch:${query.toLowerCase().replace(/s+/g, " ").trim()}|${q.remoteOnly ? "remote" : "any"}`;
    let data = await cacheGet<S>(cacheKey);
    if (!data) {
      if (q.cacheOnly) return [];
      if (!(await consumeQuota("jsearch", serverEnv.jsearchMonthlyLimit()))) throw new Error("monthly JSearch quota used up");
      const params = new URLSearchParams({ query, page: "1", num_pages: "1", date_posted: "month" });
      if (q.remoteOnly) params.set("work_from_home", "true");
      data = await fetchJSON<S>(
        `https://jsearch.p.rapidapi.com/search?${params}`,
        { headers: { "x-rapidapi-key": serverEnv.jsearchKey(), "x-rapidapi-host": "jsearch.p.rapidapi.com" } },
        20_000,
      );
      await cacheSet(cacheKey, data, 24 * 3_600_000);
    }
    return (data.data ?? []).map((j) => ({
      ...base,
      source: "jsearch",
      external_id: j.job_id,
      title: j.job_title,
      company: j.employer_name,
      company_logo: j.employer_logo || null,
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", "),
      remote: !!j.job_is_remote,
      employment_type: j.job_employment_type || null,
      salary_min: num(j.job_min_salary),
      salary_max: num(j.job_max_salary),
      salary_currency: j.job_salary_currency || null,
      salary_period: j.job_salary_period?.toLowerCase() || null,
      description: j.job_description,
      url: j.job_google_link || j.job_apply_link || "",
      apply_url: j.job_apply_link,
      tags: j.job_publisher ? [`via ${j.job_publisher}`] : [],
      posted_at: toISO(j.job_posted_at_datetime_utc),
    }));
  },
};

export const SOURCES: JobSource[] = [
  jsearch,
  adzuna,
  usajobs,
  remotive,
  himalayas,
  jobicy,
  remoteok,
  arbeitnow,
  greenhouse,
  lever,
  ashby,
];

export function enabledSources(): JobSource[] {
  return SOURCES.filter((s) => s.enabled());
}

