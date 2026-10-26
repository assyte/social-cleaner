/**
 * Curated platform catalogue.
 *
 * Two different promises are kept apart:
 * - `check` means we can probe a public profile/API and distinguish exists vs
 * not found. Only these platforms are selectable for a username scan.
 * - Everything else is catalogue coverage: a real brand, a public profile URL
 * when one exists, and an explicit limitation. It is never guessed by URL
 * probing and only appears as a web-search "mention" when a provider is set.
 */

export const PLATFORM_CATEGORIES = [
 "social",
 "forum",
 "blog",
 "dev",
 "video",
 "gaming",
 "music",
 "messaging",
 "streaming",
 "professional",
 "education",
 "commerce",
 "photos",
 "reading",
 "other",
] as const;

export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];

export const PLATFORM_CATEGORY_LABELS: Record<PlatformCategory, string> = {
 social: "Social",
 forum: "Forum",
 blog: "Blog",
 dev: "Developer",
 video: "Video",
 gaming: "Gaming",
 music: "Music",
 messaging: "Messaging",
 streaming: "Streaming",
 professional: "Professional",
 education: "Education",
 commerce: "Commerce",
 photos: "Photos",
 reading: "Reading",
 other: "Other",
};

type CheckBase = {
 /** Mobile pages expose structured profile data on some networks. */
 userAgent?: "desktop" | "mobile";
 /** Marker checks may use `{handle}`; matching can be case-insensitive. */
 caseInsensitive?: boolean;
 /** A 200 without an explicit marker means "likely", not "certain". */
 verification?: "verified" | "possible";
 /** Overrides the default confidence for this check. */
 confidence?: number;
 /** What to report when a marker check is inconclusive. */
 unknownOutcome?: "not_found" | "blocked";
};

export type DirectCheck = CheckBase &
 (
 | {
 kind: "status";
 profileUrl: (handle: string) => string;
 notFoundStatus: number[];
 okStatus: number[];
 }
 | {
 kind: "marker";
 profileUrl: (handle: string) => string;
 /** 200 + any of these = account exists. */
 foundMarkers?: string[];
 /** 200 + any of these = no such account. */
 notFoundMarkers?: string[];
 /** When true, a 200 without a found marker is not a positive hit. */
 foundMarkerRequired?: boolean;
 }
 | {
 kind: "json_array";
 profileUrl: (handle: string) => string;
 /** JSON array field that must equal the handle (case-insensitive). */
 usernameField: string;
 }
 );

export type PlatformMode = "direct" | "provider" | "manual";

export type PlatformDefinition = {
 id: string;
 name: string;
 domain: string;
 icon: string;
 color: string;
 category: PlatformCategory;
 /** Directly probeable public profile. */
 check?: DirectCheck;
 /** Public profile URL even when we cannot probe it automatically. */
 profileUrl?: (handle: string) => string;
 /** How a username scan can cover this platform. */
 mode: PlatformMode;
 /** Shown in the default selection for the free plan. */
 recommended?: boolean;
 /** Lower number = higher priority in the default selection. */
 recommendedRank?: number;
 /** Why the platform cannot be probed directly (shown in UI). */
 limitation?: string;
};

type SeedCheck = CheckBase & {
 kind: "status" | "marker" | "json_array";
 url: string;
 okStatus?: number[];
 notFoundStatus?: number[];
 foundMarkers?: string[];
 notFoundMarkers?: string[];
 foundMarkerRequired?: boolean;
 usernameField?: string;
};

type PlatformSeed = {
 id: string;
 name: string;
 domain: string;
 color: string;
 category: PlatformCategory;
 recommendedRank?: number;
 profile?: string;
 limitation?: string;
 check?: SeedCheck;
};

const enc = encodeURIComponent;

function fill(template: string, handle: string): string {
 return template.replaceAll("{handle}", enc(handle));
}

const SEEDS: PlatformSeed[] = [
 // ── Developer / code ──────────────────────────────────────────────────────
 {
 id: "github",
 name: "GitHub",
 domain: "github.com",
 color: "#181717",
 category: "dev",
 recommendedRank: 1,
 profile: "https://github.com/{handle}",
 check: { kind: "status", url: "https://github.com/{handle}" },
 },
 {
 id: "gitlab",
 name: "GitLab",
 domain: "gitlab.com",
 color: "#fc6d26",
 category: "dev",
 recommendedRank: 9,
 profile: "https://gitlab.com/{handle}",
 check: {
 kind: "json_array",
 url: "https://gitlab.com/api/v4/users?username={handle}",
 usernameField: "username",
 },
 },
 {
 id: "codeberg",
 name: "Codeberg",
 domain: "codeberg.org",
 color: "#2185d0",
 category: "dev",
 recommendedRank: 10,
 profile: "https://codeberg.org/{handle}",
 check: { kind: "status", url: "https://codeberg.org/{handle}" },
 },
 {
 id: "bitbucket",
 name: "Bitbucket",
 domain: "bitbucket.org",
 color: "#0052cc",
 category: "dev",
 profile: "https://bitbucket.org/{handle}/",
 check: { kind: "status", url: "https://bitbucket.org/{handle}/" },
 },
 {
 id: "sourceforge",
 name: "SourceForge",
 domain: "sourceforge.net",
 color: "#ff6600",
 category: "dev",
 profile: "https://sourceforge.net/u/{handle}/profile",
 check: { kind: "status", url: "https://sourceforge.net/u/{handle}/profile" },
 },
 {
 id: "dockerhub",
 name: "Docker Hub",
 domain: "hub.docker.com",
 color: "#2496ed",
 category: "dev",
 profile: "https://hub.docker.com/u/{handle}",
 check: { kind: "status", url: "https://hub.docker.com/u/{handle}" },
 },
 {
 id: "huggingface",
 name: "Hugging Face",
 domain: "huggingface.co",
 color: "#ffd21e",
 category: "dev",
 recommendedRank: 11,
 profile: "https://huggingface.co/{handle}",
 check: { kind: "status", url: "https://huggingface.co/{handle}" },
 },
 {
 id: "kaggle",
 name: "Kaggle",
 domain: "kaggle.com",
 color: "#20beff",
 category: "dev",
 recommendedRank: 12,
 profile: "https://www.kaggle.com/{handle}",
 check: { kind: "status", url: "https://www.kaggle.com/{handle}" },
 },
 {
 id: "replit",
 name: "Replit",
 domain: "replit.com",
 color: "#f26207",
 category: "dev",
 profile: "https://replit.com/@{handle}",
 check: { kind: "status", url: "https://replit.com/@{handle}" },
 },
 {
 id: "jsfiddle",
 name: "JSFiddle",
 domain: "jsfiddle.net",
 color: "#0084ff",
 category: "dev",
 profile: "https://jsfiddle.net/user/{handle}/",
 check: { kind: "status", url: "https://jsfiddle.net/user/{handle}/" },
 },
 {
 id: "lobsters",
 name: "Lobsters",
 domain: "lobste.rs",
 color: "#ac130d",
 category: "dev",
 profile: "https://lobste.rs/~{handle}",
 check: { kind: "status", url: "https://lobste.rs/~{handle}" },
 },
 {
 id: "keybase",
 name: "Keybase",
 domain: "keybase.io",
 color: "#33a0ff",
 category: "dev",
 profile: "https://keybase.io/{handle}",
 check: { kind: "status", url: "https://keybase.io/{handle}" },
 },
 {
 id: "npm",
 name: "npm",
 domain: "npmjs.com",
 color: "#cb3837",
 category: "dev",
 profile: "https://www.npmjs.com/~{handle}",
 check: { kind: "status", url: "https://www.npmjs.com/~{handle}" },
 },
 {
 id: "pypi",
 name: "PyPI",
 domain: "pypi.org",
 color: "#3775a9",
 category: "dev",
 profile: "https://pypi.org/user/{handle}/",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "devto",
 name: "DEV Community",
 domain: "dev.to",
 color: "#0a0a0a",
 category: "dev",
 profile: "https://dev.to/{handle}",
 check: { kind: "status", url: "https://dev.to/{handle}" },
 },
 {
 id: "hackernews",
 name: "Hacker News",
 domain: "news.ycombinator.com",
 color: "#ff6600",
 category: "dev",
 profile: "https://news.ycombinator.com/user?id={handle}",
 check: {
 kind: "marker",
 url: "https://news.ycombinator.com/user?id={handle}",
 notFoundMarkers: ["No such user."],
 },
 },
 {
 id: "stackoverflow",
 name: "Stack Overflow",
 domain: "stackoverflow.com",
 color: "#f48024",
 category: "dev",
 limitation: "Profile URLs require a numeric user ID, so they cannot be checked directly by handle.",
 },
 {
 id: "hashnode",
 name: "Hashnode",
 domain: "hashnode.com",
 color: "#2962ff",
 category: "dev",
 profile: "https://hashnode.com/@{handle}",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "producthunt",
 name: "Product Hunt",
 domain: "producthunt.com",
 color: "#da552f",
 category: "dev",
 profile: "https://www.producthunt.com/@{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "indiehackers",
 name: "Indie Hackers",
 domain: "indiehackers.com",
 color: "#0e2439",
 category: "dev",
 profile: "https://www.indiehackers.com/{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "codepen",
 name: "CodePen",
 domain: "codepen.io",
 color: "#000000",
 category: "dev",
 profile: "https://codepen.io/{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "exercism",
 name: "Exercism",
 domain: "exercism.org",
 color: "#009cab",
 category: "dev",
 profile: "https://exercism.org/profiles/{handle}",
 check: { kind: "status", url: "https://exercism.org/profiles/{handle}" },
 },
 {
 id: "freecodecamp",
 name: "freeCodeCamp",
 domain: "freecodecamp.org",
 color: "#0a0a23",
 category: "dev",
 profile: "https://www.freecodecamp.org/{handle}",
 check: { kind: "status", url: "https://www.freecodecamp.org/{handle}" },
 },
 {
 id: "codewars",
 name: "Codewars",
 domain: "codewars.com",
 color: "#b1361e",
 category: "dev",
 profile: "https://www.codewars.com/users/{handle}",
 check: { kind: "status", url: "https://www.codewars.com/users/{handle}" },
 },
 {
 id: "hackerrank",
 name: "HackerRank",
 domain: "hackerrank.com",
 color: "#00ea64",
 category: "dev",
 profile: "https://www.hackerrank.com/profile/{handle}",
 check: {
 kind: "status",
 url: "https://www.hackerrank.com/rest/contests/master/hackers/{handle}/profile",
 },
 },
 {
 id: "leetcode",
 name: "LeetCode",
 domain: "leetcode.com",
 color: "#ffa116",
 category: "dev",
 profile: "https://leetcode.com/{handle}/",
 limitation: "Automatic verification is not available due to bot protection.",
 },

 // ── Social / forum ────────────────────────────────────────────────────────
 {
 id: "facebook",
 name: "Facebook",
 domain: "facebook.com",
 color: "#1877f2",
 category: "social",
 profile: "https://www.facebook.com/{handle}",
 // Facebook serves a lightweight public preview to a mobile browser. A 200
 // with an og:title is a public preview; a redirect to /login is not
 // evidence of absence and is reported as blocked.
 check: {
 kind: "status",
 url: "https://www.facebook.com/{handle}",
 okStatus: [200],
 notFoundStatus: [],
 userAgent: "mobile",
 verification: "possible",
 confidence: 68,
 },
 },
 {
 id: "instagram",
 name: "Instagram",
 domain: "instagram.com",
 color: "#e1306c",
 category: "social",
 profile: "https://www.instagram.com/{handle}/",
 // The mobile profile page embeds a real title/og:title for existing
 // accounts. A missing account returns the generic "Instagram" shell and
 // the httpErrorPage route; that is the absence marker.
 check: {
 kind: "marker",
 url: "https://www.instagram.com/{handle}/",
 userAgent: "mobile",
 foundMarkers: ["&#064;{handle})"],
 notFoundMarkers: ['"pageID":"httpErrorPage"'],
 foundMarkerRequired: true,
 unknownOutcome: "blocked",
 caseInsensitive: true,
 confidence: 90,
 },
 },
 {
 id: "x",
 name: "X",
 domain: "x.com",
 color: "#000000",
 category: "social",
 profile: "https://x.com/{handle}",
 // X returns a real 404 for a missing handle and a 200 profile shell for an
 // existing one. It is status-only evidence, hence a lower confidence.
 check: {
 kind: "status",
 url: "https://x.com/{handle}",
 okStatus: [200],
 notFoundStatus: [404],
 confidence: 82,
 },
 },
 {
 id: "tiktok",
 name: "TikTok",
 domain: "tiktok.com",
 color: "#010101",
 category: "social",
 profile: "https://www.tiktok.com/@{handle}",
 // The mobile page embeds `webapp.user-detail.userInfo` for existing
 // accounts and `webapp.user-detail.statusCode=10221` for missing ones.
 check: {
 kind: "marker",
 url: "https://www.tiktok.com/@{handle}",
 userAgent: "mobile",
 foundMarkers: ['"webapp.user-detail":{"userInfo"'],
 notFoundMarkers: ['"webapp.user-detail":{"statusCode":10221'],
 foundMarkerRequired: true,
 unknownOutcome: "blocked",
 confidence: 90,
 },
 },
 {
 id: "threads",
 name: "Threads",
 domain: "threads.net",
 color: "#000000",
 category: "social",
 profile: "https://www.threads.net/@{handle}",
 limitation: "Automatic verification is not available because of Meta's login wall.",
 },
 {
 id: "bluesky",
 name: "Bluesky",
 domain: "bsky.app",
 color: "#0285ff",
 category: "social",
 profile: "https://bsky.app/profile/{handle}",
 limitation: "The public API requires a different query format; planned for Phase 2B.",
 },
 {
 id: "mastodon",
 name: "Mastodon",
 domain: "mastodon.social",
 color: "#6364ff",
 category: "social",
 profile: "https://mastodon.social/@{handle}",
 limitation: "The fediverse is distributed, so only the mastodon.social instance is shown.",
 },
 {
 id: "snapchat",
 name: "Snapchat",
 domain: "snapchat.com",
 color: "#fffc00",
 category: "social",
 profile: "https://www.snapchat.com/add/{handle}",
 limitation: "Automatic verification is not available.",
 },
 {
 id: "pinterest",
 name: "Pinterest",
 domain: "pinterest.com",
 color: "#bd081c",
 category: "social",
 profile: "https://www.pinterest.com/{handle}/",
 limitation: "Automatic verification is not available.",
 },
 {
 id: "reddit",
 name: "Reddit",
 domain: "reddit.com",
 color: "#ff4500",
 category: "social",
 profile: "https://www.reddit.com/user/{handle}",
 limitation: "Reddit blocks unauthenticated requests, so there is no automatic verification.",
 },
 {
 id: "vk",
 name: "VK",
 domain: "vk.com",
 color: "#0077ff",
 category: "social",
 profile: "https://vk.com/{handle}",
 check: { kind: "status", url: "https://vk.com/{handle}" },
 },
 {
 id: "okru",
 name: "Odnoklassniki",
 domain: "ok.ru",
 color: "#ee8208",
 category: "social",
 profile: "https://ok.ru/{handle}",
 check: { kind: "status", url: "https://ok.ru/{handle}" },
 },
 {
 id: "weibo",
 name: "Weibo",
 domain: "weibo.com",
 color: "#e6162d",
 category: "social",
 profile: "https://weibo.com/{handle}",
 limitation: "Automatic verification is not available because of a login/redirect wall.",
 },
 {
 id: "truthsocial",
 name: "Truth Social",
 domain: "truthsocial.com",
 color: "#544e8a",
 category: "social",
 profile: "https://truthsocial.com/@{handle}",
 limitation: "Automatic verification is not available because of Cloudflare and a session wall.",
 },
 {
 id: "minds",
 name: "Minds",
 domain: "minds.com",
 color: "#4a4a4a",
 category: "social",
 profile: "https://www.minds.com/{handle}/",
 check: { kind: "status", url: "https://www.minds.com/{handle}/" },
 },
 {
 id: "quora",
 name: "Quora",
 domain: "quora.com",
 color: "#b92b27",
 category: "forum",
 profile: "https://www.quora.com/profile/{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "zhihu",
 name: "Zhihu",
 domain: "zhihu.com",
 color: "#0084ff",
 category: "forum",
 profile: "https://www.zhihu.com/people/{handle}",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "eksisozluk",
 name: "Ekşi Sözlük",
 domain: "eksisozluk.com",
 color: "#3c3c3c",
 category: "forum",
 profile: "https://eksisozluk.com/biri/{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "uludagsozluk",
 name: "Uludağ Sözlük",
 domain: "uludagsozluk.com",
 color: "#1d4ed8",
 category: "forum",
 profile: "https://www.uludagsozluk.com/biri/{handle}/",
 check: { kind: "status", url: "https://www.uludagsozluk.com/biri/{handle}/" },
 },
 {
 id: "donanimhaber",
 name: "DonanımHaber",
 domain: "donanimhaber.com",
 color: "#f59e0b",
 category: "forum",
 limitation: "The forum profile uses a numeric member ID, so it cannot be checked directly by handle.",
 },
 {
 id: "technopat",
 name: "Technopat",
 domain: "technopat.net",
 color: "#e11d48",
 category: "forum",
 profile: "https://www.technopat.net/sosyal/uye/{handle}/",
 check: { kind: "status", url: "https://www.technopat.net/sosyal/uye/{handle}/" },
 },
 {
 id: "shiftdelete",
 name: "ShiftDelete",
 domain: "shiftdelete.net",
 color: "#0ea5e9",
 category: "forum",
 profile: "https://forum.shiftdelete.net/uye/{handle}/",
 check: { kind: "status", url: "https://forum.shiftdelete.net/uye/{handle}/" },
 },
 {
 id: "r10",
 name: "R10",
 domain: "r10.net",
 color: "#1d4ed8",
 category: "forum",
 profile: "https://www.r10.net/uyeler/{handle}/",
 check: { kind: "status", url: "https://www.r10.net/uyeler/{handle}/" },
 },
 {
 id: "blackhatworld",
 name: "BlackHatWorld",
 domain: "blackhatworld.com",
 color: "#111827",
 category: "forum",
 profile: "https://www.blackhatworld.com/members/{handle}/",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "warriorforum",
 name: "Warrior Forum",
 domain: "warriorforum.com",
 color: "#b91c1c",
 category: "forum",
 profile: "https://www.warriorforum.com/members/{handle}.html",
 limitation: "Automatic verification is disabled because responses differ for unauthenticated requests.",
 },
 {
 id: "untappd",
 name: "Untappd",
 domain: "untappd.com",
 color: "#ffcc00",
 category: "social",
 profile: "https://untappd.com/user/{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "foursquare",
 name: "Foursquare",
 domain: "foursquare.com",
 color: "#f94877",
 category: "social",
 profile: "https://foursquare.com/{handle}",
 check: { kind: "status", url: "https://foursquare.com/{handle}" },
 },
 {
 id: "strava",
 name: "Strava",
 domain: "strava.com",
 color: "#fc4c02",
 category: "social",
 limitation: "Athlete profiles use a numeric ID, so they cannot be checked directly by handle.",
 },
 {
 id: "linkedin",
 name: "LinkedIn",
 domain: "linkedin.com",
 color: "#0a66c2",
 category: "professional",
 profile: "https://www.linkedin.com/in/{handle}",
 limitation: "Automatic verification is not available because of the login wall and bot protection.",
 },
 {
 id: "telegram",
 name: "Telegram",
 domain: "t.me",
 color: "#26a5e4",
 category: "messaging",
 profile: "https://t.me/{handle}",
 // t.me returns 200 for every handle, but only existing public accounts
 // render the tgme_page_title block. Missing handles return the generic
 // contact shell without it.
 check: {
 kind: "marker",
 url: "https://t.me/{handle}",
 foundMarkers: ["tgme_page_title"],
 foundMarkerRequired: true,
 unknownOutcome: "not_found",
 confidence: 84,
 },
 },
 {
 id: "discord",
 name: "Discord",
 domain: "discord.com",
 color: "#5865f2",
 category: "messaging",
 limitation: "There is no public profile URL; only a search-provider mention is possible.",
 },

 // ── Blog / creative ───────────────────────────────────────────────────────
 {
 id: "medium",
 name: "Medium",
 domain: "medium.com",
 color: "#000000",
 category: "blog",
 profile: "https://medium.com/@{handle}",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "substack",
 name: "Substack",
 domain: "substack.com",
 color: "#ff6719",
 category: "blog",
 recommendedRank: 13,
 profile: "https://{handle}.substack.com",
 check: { kind: "status", url: "https://{handle}.substack.com" },
 },
 {
 id: "wordpress",
 name: "WordPress.com",
 domain: "wordpress.com",
 color: "#21759b",
 category: "blog",
 profile: "https://{handle}.wordpress.com",
 limitation: "Automatic verification is disabled because of subdomain redirects.",
 },
 {
 id: "blogger",
 name: "Blogger",
 domain: "blogspot.com",
 color: "#ff5722",
 category: "blog",
 profile: "https://{handle}.blogspot.com",
 check: { kind: "status", url: "https://{handle}.blogspot.com" },
 },
 {
 id: "livejournal",
 name: "LiveJournal",
 domain: "livejournal.com",
 color: "#113140",
 category: "blog",
 profile: "https://{handle}.livejournal.com",
 check: { kind: "status", url: "https://{handle}.livejournal.com" },
 },
 {
 id: "tumblr",
 name: "Tumblr",
 domain: "tumblr.com",
 color: "#36465d",
 category: "blog",
 profile: "https://{handle}.tumblr.com",
 limitation: "Automatic verification is disabled because subdomain responses are unreliable.",
 },
 {
 id: "deviantart",
 name: "DeviantArt",
 domain: "deviantart.com",
 color: "#05cc47",
 category: "photos",
 profile: "https://www.deviantart.com/{handle}",
 check: { kind: "status", url: "https://www.deviantart.com/{handle}" },
 },
 {
 id: "behance",
 name: "Behance",
 domain: "behance.net",
 color: "#1769ff",
 category: "professional",
 recommendedRank: 7,
 profile: "https://www.behance.net/{handle}",
 check: { kind: "status", url: "https://www.behance.net/{handle}" },
 },
 {
 id: "dribbble",
 name: "Dribbble",
 domain: "dribbble.com",
 color: "#ea4c89",
 category: "professional",
 recommendedRank: 8,
 profile: "https://dribbble.com/{handle}",
 check: { kind: "status", url: "https://dribbble.com/{handle}" },
 },
 {
 id: "artstation",
 name: "ArtStation",
 domain: "artstation.com",
 color: "#13aff0",
 category: "professional",
 profile: "https://www.artstation.com/{handle}",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "aboutme",
 name: "About.me",
 domain: "about.me",
 color: "#00a8ff",
 category: "other",
 profile: "https://about.me/{handle}",
 check: { kind: "status", url: "https://about.me/{handle}" },
 },
 {
 id: "linktree",
 name: "Linktree",
 domain: "linktr.ee",
 color: "#43e660",
 category: "other",
 recommendedRank: 16,
 profile: "https://linktr.ee/{handle}",
 check: { kind: "status", url: "https://linktr.ee/{handle}" },
 },
 {
 id: "patreon",
 name: "Patreon",
 domain: "patreon.com",
 color: "#ff424d",
 category: "other",
 recommendedRank: 14,
 profile: "https://www.patreon.com/{handle}",
 check: { kind: "status", url: "https://www.patreon.com/{handle}" },
 },
 {
 id: "kofi",
 name: "Ko-fi",
 domain: "ko-fi.com",
 color: "#ff5e5b",
 category: "other",
 profile: "https://ko-fi.com/{handle}",
 limitation: "Automatic verification is not available due to Cloudflare bot protection.",
 },
 {
 id: "buymeacoffee",
 name: "Buy Me a Coffee",
 domain: "buymeacoffee.com",
 color: "#ffdd00",
 category: "other",
 profile: "https://www.buymeacoffee.com/{handle}",
 limitation: "Automatic verification is disabled because of redirects.",
 },

 // ── Video / streaming ─────────────────────────────────────────────────────
 {
 id: "youtube",
 name: "YouTube",
 domain: "youtube.com",
 color: "#ff0000",
 category: "video",
 recommendedRank: 2,
 profile: "https://www.youtube.com/@{handle}",
 check: { kind: "status", url: "https://www.youtube.com/@{handle}" },
 },
 {
 id: "vimeo",
 name: "Vimeo",
 domain: "vimeo.com",
 color: "#1ab7ea",
 category: "video",
 recommendedRank: 5,
 profile: "https://vimeo.com/{handle}",
 check: { kind: "status", url: "https://vimeo.com/{handle}" },
 },
 {
 id: "dailymotion",
 name: "Dailymotion",
 domain: "dailymotion.com",
 color: "#0066dc",
 category: "video",
 profile: "https://www.dailymotion.com/{handle}",
 check: {
 kind: "status",
 url: "https://api.dailymotion.com/user/{handle}",
 },
 },
 {
 id: "twitch",
 name: "Twitch",
 domain: "twitch.tv",
 color: "#9146ff",
 category: "video",
 profile: "https://www.twitch.tv/{handle}",
 limitation: "The profile is a single-page app; the HTTP status does not indicate whether the account exists.",
 },
 {
 id: "kick",
 name: "Kick",
 domain: "kick.com",
 color: "#53fc18",
 category: "video",
 profile: "https://kick.com/{handle}",
 check: { kind: "status", url: "https://kick.com/{handle}" },
 },
 {
 id: "rumble",
 name: "Rumble",
 domain: "rumble.com",
 color: "#85c742",
 category: "video",
 profile: "https://rumble.com/user/{handle}",
 check: { kind: "status", url: "https://rumble.com/user/{handle}" },
 },
 {
 id: "odysee",
 name: "Odysee",
 domain: "odysee.com",
 color: "#ef1970",
 category: "video",
 profile: "https://odysee.com/@{handle}",
 limitation: "Automatic verification is disabled because it is a single-page app.",
 },
 {
 id: "bilibili",
 name: "Bilibili",
 domain: "bilibili.com",
 color: "#00a1d6",
 category: "video",
 limitation: "The profile URL requires a numeric UID, so it cannot be checked directly by handle.",
 },
 {
 id: "netflix",
 name: "Netflix",
 domain: "netflix.com",
 color: "#e50914",
 category: "streaming",
 limitation: "There is no public member profile; only email/name mentions can be found through search.",
 },
 {
 id: "crunchyroll",
 name: "Crunchyroll",
 domain: "crunchyroll.com",
 color: "#f47521",
 category: "streaming",
 limitation: "Automatic verification is not available; only provider mentions.",
 },

 // ── Reading / photos ──────────────────────────────────────────────────────
 {
 id: "goodreads",
 name: "Goodreads",
 domain: "goodreads.com",
 color: "#372213",
 category: "reading",
 recommendedRank: 17,
 profile: "https://www.goodreads.com/{handle}",
 check: { kind: "status", url: "https://www.goodreads.com/{handle}" },
 },
 {
 id: "letterboxd",
 name: "Letterboxd",
 domain: "letterboxd.com",
 color: "#00e054",
 category: "reading",
 profile: "https://letterboxd.com/{handle}/",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "myanimelist",
 name: "MyAnimeList",
 domain: "myanimelist.net",
 color: "#2e51a2",
 category: "reading",
 profile: "https://myanimelist.net/profile/{handle}",
 check: { kind: "status", url: "https://myanimelist.net/profile/{handle}" },
 },
 {
 id: "anilist",
 name: "AniList",
 domain: "anilist.co",
 color: "#02a9ff",
 category: "reading",
 profile: "https://anilist.co/user/{handle}/",
 limitation: "Automatic verification is disabled because it is a single-page app.",
 },
 {
 id: "trakt",
 name: "Trakt",
 domain: "trakt.tv",
 color: "#ed1c24",
 category: "reading",
 profile: "https://trakt.tv/users/{handle}",
 limitation: "Automatic verification is disabled because of redirects.",
 },
 {
 id: "imdb",
 name: "IMDb",
 domain: "imdb.com",
 color: "#f5c518",
 category: "reading",
 limitation: "The profile URL requires a numeric user ID.",
 },
 {
 id: "flickr",
 name: "Flickr",
 domain: "flickr.com",
 color: "#ff0084",
 category: "photos",
 recommendedRank: 18,
 profile: "https://www.flickr.com/people/{handle}/",
 check: { kind: "status", url: "https://www.flickr.com/people/{handle}/" },
 },
 {
 id: "500px",
 name: "500px",
 domain: "500px.com",
 color: "#0099e5",
 category: "photos",
 profile: "https://500px.com/p/{handle}",
 limitation: "Automatic verification is disabled because it is a single-page app.",
 },
 {
 id: "vsco",
 name: "VSCO",
 domain: "vsco.co",
 color: "#000000",
 category: "photos",
 profile: "https://vsco.co/{handle}/gallery",
 limitation: "Automatic verification is not available due to bot protection.",
 },

 // ── Gaming ────────────────────────────────────────────────────────────────
 {
 id: "steam",
 name: "Steam",
 domain: "steamcommunity.com",
 color: "#1b2838",
 category: "gaming",
 recommendedRank: 3,
 profile: "https://steamcommunity.com/id/{handle}",
 // The HTML error title is localised, so the old English marker produced
 // false positives. Steam's XML endpoint is
 // stable: <steamID64> for an existing vanity URL, <error> otherwise.
 check: {
 kind: "marker",
 url: "https://steamcommunity.com/id/{handle}/?xml=1",
 foundMarkers: ["<steamID64>"],
 notFoundMarkers: ["<error>"],
 foundMarkerRequired: true,
 unknownOutcome: "blocked",
 confidence: 94,
 },
 },
 {
 id: "roblox",
 name: "Roblox",
 domain: "roblox.com",
 color: "#e2231a",
 category: "gaming",
 profile: "https://www.roblox.com/users/profile?username={handle}",
 limitation: "The official API key/request format has not been verified; automatic checks are disabled.",
 },
 {
 id: "lichess",
 name: "Lichess",
 domain: "lichess.org",
 color: "#000000",
 category: "gaming",
 recommendedRank: 20,
 profile: "https://lichess.org/@/{handle}",
 check: { kind: "status", url: "https://lichess.org/api/user/{handle}" },
 },
 {
 id: "chesscom",
 name: "Chess.com",
 domain: "chess.com",
 color: "#7fa650",
 category: "gaming",
 recommendedRank: 19,
 profile: "https://www.chess.com/member/{handle}",
 check: { kind: "status", url: "https://api.chess.com/pub/player/{handle}" },
 },
 {
 id: "craftrise",
 name: "CraftRise",
 domain: "craftrise.com.tr",
 color: "#1f8f4e",
 category: "gaming",
 recommendedRank: 4,
 profile: "https://www.craftrise.com.tr/oyuncu/{handle}",
 check: {
 kind: "marker",
 url: "https://www.craftrise.com.tr/oyuncu/{handle}",
 foundMarkers: ["profileTitle-gene", "get-head.php"],
 foundMarkerRequired: true,
 },
 },
 {
 id: "xbox",
 name: "Xbox",
 domain: "xbox.com",
 color: "#107c10",
 category: "gaming",
 limitation: "A public player profile requires a separate API.",
 },
 {
 id: "playstation",
 name: "PlayStation Network",
 domain: "playstation.com",
 color: "#003791",
 category: "gaming",
 limitation: "A public PSN profile requires a separate API.",
 },
 {
 id: "epicgames",
 name: "Epic Games",
 domain: "epicgames.com",
 color: "#313131",
 category: "gaming",
 profile: "https://www.epicgames.com/id/{handle}",
 limitation: "Automatic verification is not available; only provider mentions.",
 },
 {
 id: "itchio",
 name: "itch.io",
 domain: "itch.io",
 color: "#fa5c5c",
 category: "gaming",
 profile: "https://{handle}.itch.io",
 limitation: "Automatic verification is disabled because subdomain responses are unreliable.",
 },

 // ── Music ─────────────────────────────────────────────────────────────────
 {
 id: "spotify",
 name: "Spotify",
 domain: "open.spotify.com",
 color: "#1db954",
 category: "music",
 profile: "https://open.spotify.com/user/{handle}",
 limitation: "An API key is required for user profiles.",
 },
 {
 id: "soundcloud",
 name: "SoundCloud",
 domain: "soundcloud.com",
 color: "#ff5500",
 category: "music",
 recommendedRank: 6,
 profile: "https://soundcloud.com/{handle}",
 check: { kind: "status", url: "https://soundcloud.com/{handle}" },
 },
 {
 id: "bandcamp",
 name: "Bandcamp",
 domain: "bandcamp.com",
 color: "#629aa9",
 category: "music",
 profile: "https://{handle}.bandcamp.com",
 limitation: "Automatic verification is disabled because subdomain responses are unreliable.",
 },
 {
 id: "lastfm",
 name: "Last.fm",
 domain: "last.fm",
 color: "#d51007",
 category: "music",
 recommendedRank: 15,
 profile: "https://www.last.fm/user/{handle}",
 check: { kind: "status", url: "https://www.last.fm/user/{handle}" },
 },
 {
 id: "mixcloud",
 name: "Mixcloud",
 domain: "mixcloud.com",
 color: "#5000ff",
 category: "music",
 profile: "https://www.mixcloud.com/{handle}/",
 check: { kind: "status", url: "https://www.mixcloud.com/{handle}/" },
 },
 {
 id: "discogs",
 name: "Discogs",
 domain: "discogs.com",
 color: "#333333",
 category: "music",
 profile: "https://www.discogs.com/user/{handle}",
 limitation: "Automatic verification is not available; only provider mentions.",
 },
 {
 id: "deezer",
 name: "Deezer",
 domain: "deezer.com",
 color: "#a238ff",
 category: "music",
 profile: "https://www.deezer.com/profile/{handle}",
 limitation: "Automatic verification is not available; only provider mentions.",
 },

 // ── Commerce / education ──────────────────────────────────────────────────
 {
 id: "etsy",
 name: "Etsy",
 domain: "etsy.com",
 color: "#f16521",
 category: "commerce",
 profile: "https://www.etsy.com/people/{handle}",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "ebay",
 name: "eBay",
 domain: "ebay.com",
 color: "#e53238",
 category: "commerce",
 profile: "https://www.ebay.com/usr/{handle}",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "trendyol",
 name: "Trendyol",
 domain: "trendyol.com",
 color: "#f27a1a",
 category: "commerce",
 limitation: "There is no public user profile; only store/product mentions.",
 },
 {
 id: "sahibinden",
 name: "Sahibinden",
 domain: "sahibinden.com",
 color: "#ffe800",
 category: "commerce",
 limitation: "There is no public user profile; only listing mentions.",
 },
 {
 id: "udemy",
 name: "Udemy",
 domain: "udemy.com",
 color: "#a435f0",
 category: "education",
 profile: "https://www.udemy.com/user/{handle}/",
 limitation: "Automatic verification is not available due to bot protection.",
 },
 {
 id: "duolingo",
 name: "Duolingo",
 domain: "duolingo.com",
 color: "#58cc02",
 category: "education",
 profile: "https://www.duolingo.com/profile/{handle}",
 limitation: "Automatic verification is disabled because it is a single-page app.",
 },
 {
 id: "khanacademy",
 name: "Khan Academy",
 domain: "khanacademy.org",
 color: "#14bf96",
 category: "education",
 profile: "https://www.khanacademy.org/profile/{handle}",
 limitation: "Automatic verification is disabled because it is a single-page app.",
 },
 {
 id: "coursera",
 name: "Coursera",
 domain: "coursera.org",
 color: "#0056d2",
 category: "education",
 limitation: "The public profile URL requires a numeric ID.",
 },
];

function toDirectCheck(seed: PlatformSeed): DirectCheck | undefined {
 const check = seed.check;
 if (!check) return undefined;
 const profileUrl = (handle: string) => fill(check.url, handle);
 const base: CheckBase = {
 ...(check.userAgent ? { userAgent: check.userAgent } : {}),
 ...(check.caseInsensitive ? { caseInsensitive: true } : {}),
 ...(check.verification ? { verification: check.verification } : {}),
 ...(check.confidence ? { confidence: check.confidence } : {}),
 ...(check.unknownOutcome ? { unknownOutcome: check.unknownOutcome } : {}),
 };

 if (check.kind === "status") {
 return {
 ...base,
 kind: "status",
 profileUrl,
 okStatus: check.okStatus ?? [200],
 notFoundStatus: check.notFoundStatus ?? [404],
 };
 }
 if (check.kind === "marker") {
 return {
 ...base,
 kind: "marker",
 profileUrl,
 ...(check.foundMarkers ? { foundMarkers: check.foundMarkers } : {}),
 ...(check.notFoundMarkers ? { notFoundMarkers: check.notFoundMarkers } : {}),
 ...(check.foundMarkerRequired ? { foundMarkerRequired: true } : {}),
 };
 }
 if (!check.usernameField) {
 throw new Error(`${seed.id} requires a usernameField`);
 }
 return {
 ...base,
 kind: "json_array",
 profileUrl,
 usernameField: check.usernameField,
 };
}

/**
 * Default scan order. These are the platforms a normal person is most likely
 * to be asked about, so the free plan's eight slots are not spent on niche
 * developer sites. Platforms without a direct adapter are still listed; the
 * service either uses the configured search provider or returns a manual link.
 */
const RECOMMENDED_RANKS: Record<string, number> = {
 instagram: 1,
 tiktok: 2,
 facebook: 3,
 youtube: 4,
 telegram: 5,
 steam: 6,
 x: 7,
 github: 8,
 reddit: 9,
 epicgames: 10,
 craftrise: 11,
 vimeo: 12,
 soundcloud: 13,
 behance: 14,
 dribbble: 15,
 gitlab: 16,
 codeberg: 17,
 huggingface: 18,
 kaggle: 19,
 substack: 20,
 patreon: 21,
 lastfm: 22,
 linktree: 23,
 goodreads: 24,
 flickr: 25,
 chesscom: 26,
 lichess: 27,
};

export const PLATFORMS: PlatformDefinition[] = SEEDS.map((seed) => {
 const check = toDirectCheck(seed);
 const publicProfile = seed.profile ?? seed.check?.url;
 const mode: PlatformMode = check ? "direct" : publicProfile ? "provider" : "manual";
 const rank = RECOMMENDED_RANKS[seed.id] ?? seed.recommendedRank;
 return {
 id: seed.id,
 name: seed.name,
 domain: seed.domain,
 icon: `/brand/platforms/${seed.id}.svg`,
 color: seed.color,
 category: seed.category,
 mode,
 ...(check ? { check } : {}),
 ...(publicProfile ? { profileUrl: (handle: string) => fill(publicProfile, handle) } : {}),
 ...(rank ? { recommended: true, recommendedRank: rank } : {}),
 ...(seed.limitation
 ? { limitation: seed.limitation }
 : !check
 ? {
 limitation:
 mode === "provider"
 ? "Cannot be verified directly; if a search provider is configured, a mention is returned, otherwise a manual profile link."
 : "There is no public profile address; only a search-provider mention or manual verification.",
 }
 : {}),
 };
});

export const PLATFORM_BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatform(id: string): PlatformDefinition | undefined {
 return PLATFORM_BY_ID.get(id);
}

export const DIRECT_PLATFORMS = PLATFORMS.filter((p) => Boolean(p.check));

/** Trim and drop a leading @. Platform handle rules are enforced by each service;
 * Social Cleaner itself does not reject a handle for length or character set. */
export function normalizeHandle(raw: string): string {
 return raw.trim().replace(/^@+/, "");
}

/** Client-facing catalogue without functions. */
export type PublicPlatform = {
 id: string;
 name: string;
 domain: string;
 icon: string;
 color: string;
 category: PlatformCategory;
 checkable: boolean;
 mode: PlatformMode;
 recommended: boolean;
 recommendedRank?: number;
};

export function publicPlatforms(): PublicPlatform[] {
 return PLATFORMS.map((p) => ({
 id: p.id,
 name: p.name,
 domain: p.domain,
 icon: p.icon,
 color: p.color,
 category: p.category,
 checkable: Boolean(p.check),
 mode: p.mode,
 recommended: Boolean(p.recommended),
 ...(p.recommendedRank ? { recommendedRank: p.recommendedRank } : {}),
 }));
}
