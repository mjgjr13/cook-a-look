// Generates public/sitemap.xml. Runs predev/prebuild.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://www.cookalook.com";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://chjmyzzczwattluqpbat.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoam15enpjendhdHRsdXFwYmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDM3NjksImV4cCI6MjA4MzgxOTc2OX0.Y6N53UNdAZ5x02ADZNo7KMbjxEIsAmu8tq5OShOIHOs";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/advisors", changefreq: "daily", priority: "0.9" },
  { path: "/lookbook", changefreq: "weekly", priority: "0.8" },
  { path: "/become-advisor", changefreq: "monthly", priority: "0.7" },
  { path: "/signin", changefreq: "yearly", priority: "0.3" },
  { path: "/signup", changefreq: "yearly", priority: "0.3" },
  { path: "/forgot-password", changefreq: "yearly", priority: "0.2" },
  { path: "/reset-password", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

async function fetchAdvisorIds(): Promise<string[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/advisor_profiles?select=id&is_visible=eq.true&advisor_approved=eq.true&limit=1000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { id: string }[];
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

function render(entries: Entry[]): string {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${BASE_URL}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    urls,
    `</urlset>`,
    "",
  ].join("\n");
}

const advisorIds = await fetchAdvisorIds();
const entries: Entry[] = [
  ...staticEntries.map((e) => ({ ...e, lastmod: today })),
  ...advisorIds.map<Entry>((id) => ({
    path: `/advisors/${id}`,
    lastmod: today,
    changefreq: "weekly",
    priority: "0.7",
  })),
];

writeFileSync(resolve("public/sitemap.xml"), render(entries));
console.log(`sitemap.xml written (${entries.length} entries; ${advisorIds.length} advisor profiles)`);
