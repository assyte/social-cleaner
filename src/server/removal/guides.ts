import {
  PLATFORMS,
  PLATFORM_CATEGORY_LABELS,
  type PlatformCategory,
} from "@/server/search/platforms";
import {
  DELETION_DATA,
  type DeletionDifficulty,
  type DeletionMethod,
} from "./deletion-data";

export type RemovalGuide = {
  id: string;
  name: string;
  domain: string;
  icon: string;
  category: PlatformCategory;
  categoryLabel: string;
  link: string;
  difficulty: DeletionDifficulty;
  method: DeletionMethod;
  steps: string[];
  note?: string;
};

export type RemovalGuideCounts = {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  limited: number;
  selfServe: number;
  support: number;
};

const CATEGORY_PATHS: Record<PlatformCategory, string> = {
  social: "Profile → Settings → Account",
  forum: "Profile → Account settings",
  blog: "Settings → Account",
  dev: "Settings → Account",
  video: "Account → Settings",
  gaming: "Account management → Security",
  music: "Account → Settings",
  messaging: "Settings → Privacy and security",
  streaming: "Account → Membership",
  professional: "Settings → Account",
  education: "Account settings",
  commerce: "My account → User information",
  photos: "Settings → Account",
  reading: "Settings → Account",
  other: "Settings → Account",
};

const STEP_OVERRIDES: Record<string, string[]> = {
  instagram: [
    "Open Settings → Meta Accounts Center → Personal information → Account ownership and control.",
    "Choose Deactivate or delete account.",
    "Choose Delete account, enter your password, and confirm.",
    "Do not sign in for 30 days; signing in during that period cancels the deletion request.",
  ],
  facebook: [
    "Open Settings & privacy → Settings → Your Facebook information.",
    "Choose Deactivation and deletion.",
    "Choose Delete account, enter your password, and confirm.",
    "Signing in within 30 days cancels the deletion request.",
  ],
  x: [
    "Open Settings and privacy → Your account → Deactivate your account.",
    "Enter your password to confirm deactivation.",
    "Do not sign in for 30 days; the account is permanently deleted after that.",
    "Signing in during the 30 days reactivates the account.",
  ],
  tiktok: [
    "Open Profile → Menu → Settings and privacy → Account.",
    "Choose Delete account.",
    "Select a reason and continue.",
    "Complete phone or email verification; do not sign in for 30 days.",
  ],
  youtube: [
    "Open your Google Account → Data & privacy → Download or delete your data.",
    "Choose Delete a Google service or Delete your Google Account.",
    "Check the scope: deleting YouTube can affect your Google Account.",
    "Enter your password and confirm.",
  ],
  telegram: [
    "Open Settings → Privacy and Security.",
    "Open Delete my account.",
    "Enter your phone number and verification code.",
    "Confirm Delete my account; this cannot be undone.",
  ],
  steam: [
    "Open Steam Support → My account → Account deletion wizard.",
    "Verify account ownership.",
    "Complete Steam Guard and email verification.",
    "Confirm the deletion request; community content may remain anonymized.",
  ],
  github: [
    "Open Settings → Account.",
    "Open the Delete account section at the bottom of the page.",
    "Read the warnings, then enter your username and password.",
    "Confirm; some public content may remain anonymized.",
  ],
  reddit: [
    "Open Preferences → Delete account.",
    "Enter your username and password.",
    "Choose a reason and confirm.",
    "Reddit deletion is permanent; posts may be anonymized.",
  ],
  epicgames: [
    "Sign in to Epic Games → Account → General information.",
    "Open the Delete Account section at the bottom of the page.",
    "Complete email and password verification.",
    "Open the link in the confirmation email.",
  ],
  linkedin: [
    "Open Settings & Privacy → Account preferences → Account management.",
    "Choose Close account.",
    "Select a reason and close the account.",
    "If you do not sign in within 20 days, the account is permanently deleted.",
  ],
  discord: [
    "Open User Settings → My Account.",
    "Open the Delete Account section at the bottom.",
    "Enter your password and two-factor code.",
    "Confirm; this cannot be undone.",
  ],
  spotify: [
    "Sign in to Spotify → Account → Cancel subscription.",
    "Open the Close account form on Spotify's support site.",
    "Complete and submit the form.",
    "The account closes within 7 days; cancel Premium separately.",
  ],
  twitch: [
    "Open Settings → Account.",
    "Open the Delete Account section.",
    "Enter your password and confirm.",
    "Cancel any subscriptions first.",
  ],
  netflix: [
    "Open Account → Cancel membership.",
    "Confirm the cancellation.",
    "Contact Netflix support to close the account immediately.",
    "Netflix closes the account within 10 months after cancellation.",
  ],
  roblox: [
    "Open Settings → Privacy → Account data.",
    "Open Deactivate and delete account.",
    "Read the warnings and confirm.",
    "Do not sign in for 30 days.",
  ],
  pinterest: [
    "Open Settings → Account settings.",
    "Choose Delete account.",
    "Choose a reason and confirm.",
    "This cannot be undone; your boards are removed.",
  ],
  snapchat: [
    "Open the Snapchat accounts portal.",
    "Choose Delete account.",
    "Enter your username and password.",
    "Do not sign in for 30 days.",
  ],
  mastodon: [
    "Sign in to your own Mastodon server.",
    "Open Settings → Account → Delete account.",
    "Enter your password and confirm.",
    "The server administrator decides how much data is removed.",
  ],
  bluesky: [
    "Open Settings → Account.",
    "Choose Delete account.",
    "Enter your password and confirm.",
    "Your account and data are permanently deleted.",
  ],
  threads: [
    "Open Profile → Menu → Meta Account → Manage account.",
    "Tap Manage next to the profile you want to delete.",
    "Choose Delete or deactivate profile.",
    "Your Instagram account is not affected; only the Threads profile is deleted.",
  ],
  truthsocial: [
    "Open Settings.",
    "Open Delete Account at the bottom of the page.",
    "Enter your password.",
    "Press the red Delete button.",
  ],
  untappd: [
    "Open Settings → Account & Security.",
    "Open Delete Account.",
    "Read the warnings and check all four confirmation boxes.",
    "Enter your password to confirm deletion.",
  ],
  artstation: [
    "Open Account Settings.",
    "Open the Cancel your account link at the bottom.",
    "Enter your password.",
    "Confirm; your portfolio and data are removed.",
  ],
  hashnode: [
    "Open Settings → Account.",
    "Open the Danger zone / Delete account section.",
    "Type the confirmation text.",
    "Confirm the deletion.",
  ],
  indiehackers: [
    "Open Settings.",
    "Open Delete account in the Account section.",
    "Confirm.",
    "Your profile and posts are removed.",
  ],
  exercism: [
    "Open Settings.",
    "Open the delete option in the Account section.",
    "Confirm.",
    "Your solutions and profile data are deleted.",
  ],
  blogger: [
    "A Blogger account is tied to a Google Account.",
    "Open your Google Account → Data & privacy → Delete your Google Account.",
    "Check that Blogger data will be deleted.",
    "Enter your password and confirm.",
  ],
  eksisozluk: [
    "Sign in to the Ekşi Sözlük mobile app.",
    "Open Privacy and Security → Delete Account.",
    "Complete the confirmation steps.",
    "There is no self-serve deletion on the web; use the app.",
  ],
  uludagsozluk: [
    "Sign in to your Uludağ Sözlük account.",
    "Check account and profile settings for a deletion option.",
    "If none exists, contact the administrators and send a written deletion request.",
    "Confirm that your request was processed.",
  ],
  donanimhaber: [
    "Sign in to DonanımHaber.",
    "Open the support form.",
    "Send a message requesting account deletion.",
    "Keep the reply and ticket number.",
  ],
  technopat: [
    "Sign in to Technopat Sosyal.",
    "Open the account details page.",
    "Write to the administrators to request account deletion.",
    "Do not sign in until you receive confirmation.",
  ],
  shiftdelete: [
    "Sign in to the ShiftDelete Forum.",
    "Open account settings.",
    "If there is no self-serve deletion, deactivate the account.",
    "Write to the administrators for permanent deletion.",
  ],
  r10: [
    "Sign in to R10.",
    "Open the profile and settings section.",
    "If there is no account closure option, write to the administrators.",
    "Confirm that your request was processed.",
  ],
  blackhatworld: [
    "Sign in to BlackHatWorld.",
    "Open the How do I close my account? article in the support system.",
    "Choose a ban or permanent deletion request.",
    "Submit the support ticket.",
  ],
  warriorforum: [
    "Sign in to Warrior Forum.",
    "Create an account-deletion request in the help forum.",
    "Ask the administrators for a ban or anonymization.",
    "Keep the reply.",
  ],
  craftrise: [
    "Open the CraftRise support page.",
    "Send a deletion request from your registered email address.",
    "Verify your account details.",
    "Wait for a response.",
  ],
  trendyol: [
    "Open My Account → User Information.",
    "Open the account deletion / membership cancellation section.",
    "Check for open orders and subscriptions.",
    "Confirm the request.",
  ],
  vk: [
    "Open Settings → Account.",
    "Choose Deactivate account.",
    "Choose a reason and confirm.",
    "VK does not offer permanent deletion; remove your content separately.",
  ],
  quora: [
    "Open Settings → Privacy.",
    "Choose Delete account.",
    "Choose a reason and confirm.",
    "Your account and profile are removed.",
  ],
  goodreads: [
    "Open Account settings.",
    "Open the account-deletion link at the bottom of the page.",
    "Confirm.",
    "Your reviews and shelf data are removed.",
  ],
};

function defaultSteps(category: PlatformCategory, difficulty: DeletionDifficulty): string[] {
  const path = CATEGORY_PATHS[category];
  if (difficulty === "hard") {
    return [
      `Sign in and open ${path}.`,
      "If self-serve deletion is unavailable, use the support or contact form.",
      "Request deletion of your account and data from your registered email address.",
      "Keep the ticket number; follow up if you do not hear back within 30 days.",
    ];
  }
  if (difficulty === "limited") {
    return [
      `Sign in and open ${path}.`,
      "A permanent deletion option may not exist; check deactivation or anonymization.",
      "Still send a written deletion request under GDPR or applicable privacy law.",
      "If the profile remains visible, remove the content you shared one item at a time.",
    ];
  }
  return [
    `Sign in and open ${path}.`,
    "Find Delete account, Deactivate, or Close account.",
    "Enter your password or verification code to confirm.",
    "If email confirmation is required, open the link and check that the account is closed.",
  ];
}

function methodFor(difficulty: DeletionDifficulty, method?: DeletionMethod): DeletionMethod {
  if (method) return method;
  if (difficulty === "limited") return "limited";
  if (difficulty === "hard") return "support";
  return "self-serve";
}

export const REMOVAL_GUIDES: RemovalGuide[] = PLATFORMS.map((platform) => {
  const record = DELETION_DATA[platform.id];
  if (!record) {
    throw new Error(`Missing deletion record for platform: ${platform.id}`);
  }
  return {
    id: platform.id,
    name: platform.name,
    domain: platform.domain,
    icon: platform.icon,
    category: platform.category,
    categoryLabel: PLATFORM_CATEGORY_LABELS[platform.category],
    link: record.link,
    difficulty: record.difficulty,
    method: methodFor(record.difficulty, record.method),
    steps: STEP_OVERRIDES[platform.id] ?? defaultSteps(platform.category, record.difficulty),
    ...(record.note ? { note: record.note } : {}),
  };
}).sort((left, right) => left.name.localeCompare(right.name, "en"));

export const REMOVAL_GUIDE_COUNTS: RemovalGuideCounts = REMOVAL_GUIDES.reduce(
  (counts, guide) => {
    counts.total += 1;
    counts[guide.difficulty] += 1;
    if (guide.method === "self-serve") {
      counts.selfServe += 1;
    } else {
      counts.support += 1;
    }
    return counts;
  },
  { total: 0, easy: 0, medium: 0, hard: 0, limited: 0, selfServe: 0, support: 0 },
);
