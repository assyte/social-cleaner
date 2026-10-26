/**
 * Official account-deletion entry points, keyed by platform id.
 *
 * Each link points at the platform's own settings, help centre or support
 * flow. The long tail was cross-checked against the JustDeleteMe dataset
 * (MIT); product copy always sends the user to the platform's own page.
 */

export type DeletionDifficulty = "easy" | "medium" | "hard" | "limited";
export type DeletionMethod = "self-serve" | "support" | "limited";

export type DeletionRecord = {
  link: string;
  difficulty: DeletionDifficulty;
  /** Defaults to self-serve for easy/medium, support for hard, limited for limited. */
  method?: DeletionMethod;
  note?: string;
};

export const DELETION_DATA: Record<string, DeletionRecord> = {
  github: {
    link: "https://github.com/settings/admin",
    difficulty: "easy",
    note: "Deleting your account removes your profile and repositories. Some public contributions may remain attributed to a deleted user.",
  },
  gitlab: {
    link: "https://gitlab.com/-/profile/account",
    difficulty: "easy",
    note: "Some issues, merge requests, and comments may remain anonymized after deletion.",
  },
  codeberg: {
    link: "https://codeberg.org/user/settings/account",
    difficulty: "easy",
    note: "Open account settings and confirm deletion. Some public activity may remain anonymized.",
  },
  bitbucket: {
    link: "https://id.atlassian.com/manage/close-account",
    difficulty: "medium",
    note: "Bitbucket accounts are closed through Atlassian account management.",
  },
  sourceforge: {
    link: "https://sourceforge.net/auth/disable/",
    difficulty: "medium",
    note: "User-generated posts and support tickets can remain attributed to your deleted account. Your username will not be reusable.",
  },
  dockerhub: {
    link: "https://hub.docker.com/settings/deactivate",
    difficulty: "easy",
    note: "Use the deactivate-account page in Docker Hub settings.",
  },
  huggingface: {
    link: "https://huggingface.co/settings/account",
    difficulty: "easy",
    note: "Use the account settings page and confirm deletion.",
  },
  kaggle: {
    link: "https://www.kaggle.com/account/delete",
    difficulty: "easy",
    note: "Use the account deletion page and confirm the request.",
  },
  replit: {
    link: "https://replit.com/account",
    difficulty: "easy",
    note: "Use the Delete account section at the bottom of Account settings.",
  },
  jsfiddle: {
    link: "https://jsfiddle.net/user/settings/remove_account/",
    difficulty: "easy",
    note: "Use the remove-account page in user settings.",
  },
  lobsters: {
    link: "https://lobste.rs/settings",
    difficulty: "easy",
    note: "Account deletion is available in settings.",
  },
  keybase: {
    link: "https://keybase.io/account/delete_me",
    difficulty: "easy",
    note: "The account is deleted immediately, but the username may be retained to prevent impersonation.",
  },
  npm: {
    link: "https://www.npmjs.com/support",
    difficulty: "hard",
    method: "support",
    note: "npm accounts are not self-serve. Open a support request to delete yours.",
  },
  pypi: {
    link: "https://pypi.org/manage/account/",
    difficulty: "hard",
    method: "support",
    note: "PyPI has no self-serve account deletion. Open a support request from account management.",
  },
  devto: {
    link: "https://dev.to/settings/account",
    difficulty: "easy",
    note: "Open Settings → Account. You can remove OAuth connections or request account deletion by email.",
  },
  hackernews: {
    link: "https://news.ycombinator.com/newsfaq.html",
    difficulty: "hard",
    method: "support",
    note: "Hacker News accounts cannot be deleted by users. Email the site operator to request removal.",
  },
  stackoverflow: {
    link: "https://stackoverflow.com/help/deleting-account",
    difficulty: "hard",
    method: "support",
    note: "Stack Overflow handles account deletion through a support request.",
  },
  hashnode: {
    link: "https://hashnode.com/settings",
    difficulty: "easy",
    note: "Settings → Account → Delete account. Deletion is permanent.",
  },
  producthunt: {
    link: "https://www.producthunt.com/my/settings/edit",
    difficulty: "easy",
    note: "Open account settings, choose Delete my account, then continue through the confirmation flow.",
  },
  indiehackers: {
    link: "https://www.indiehackers.com/",
    difficulty: "medium",
    note: "Profile menu → Settings → Account → Delete account.",
  },
  codepen: {
    link: "https://blog.codepen.io/faq/delete-account/",
    difficulty: "easy",
    note: "Follow the account-deletion FAQ, then confirm the request.",
  },
  exercism: {
    link: "https://exercism.org/settings",
    difficulty: "easy",
    note: "Use the delete option in Settings → Account.",
  },
  freecodecamp: {
    link: "https://www.freecodecamp.org/settings",
    difficulty: "easy",
    note: "The delete option is in Account Settings, under the Danger Zone.",
  },
  codewars: {
    link: "https://www.codewars.com/users/edit",
    difficulty: "easy",
    note: "Open Account Settings and scroll to Delete Account.",
  },
  hackerrank: {
    link: "https://www.hackerrank.com/settings/account",
    difficulty: "easy",
    note: "Open profile settings and use the Delete Account button.",
  },
  leetcode: {
    link: "https://leetcode.com/delete-account/",
    difficulty: "easy",
    note: "Use the delete-account page and confirm.",
  },
  facebook: {
    link: "https://www.facebook.com/help/delete_account?rdrhc",
    difficulty: "medium",
    note: "Some data, including messages, may remain after deletion as described in Meta's privacy policy.",
  },
  instagram: {
    link: "https://accountscenter.instagram.com/personal_info/account_ownership_and_control/deletion_and_deactivation",
    difficulty: "easy",
    note: "Instagram deletion is handled through Meta Accounts Center. Logging in within 30 days cancels the request.",
  },
  x: {
    link: "https://x.com/settings/deactivate",
    difficulty: "easy",
    note: "Your account is deactivated first. It is permanently deleted after 30 days; logging in during that period reactivates it.",
  },
  tiktok: {
    link: "https://support.tiktok.com/en/account-and-privacy/account-information/deleting-an-account",
    difficulty: "medium",
    note: "Deletion starts in Settings and privacy → Account. Verify your phone or email; logging in within 30 days cancels the request.",
  },
  threads: {
    link: "https://help.instagram.com/313703828012423",
    difficulty: "medium",
    note: "Deleting your Threads profile does not delete your Instagram account.",
  },
  bluesky: {
    link: "https://bsky.app/settings",
    difficulty: "medium",
    note: "Use Settings → Account → Delete account. Your account and data are permanently removed.",
  },
  mastodon: {
    link: "https://mastodon.social/settings/delete",
    difficulty: "easy",
    note: "Every Mastodon server is different. Use your own server's Settings → Account → Delete account flow.",
  },
  snapchat: {
    link: "https://accounts.snapchat.com/accounts/delete_account",
    difficulty: "easy",
    note: "Enter your username and password, then confirm deletion. Logging in within 30 days cancels it.",
  },
  pinterest: {
    link: "https://pinterest.com/settings/account-settings/",
    difficulty: "medium",
    note: "Open Account settings, choose Delete account, select a reason, and confirm via the email Pinterest sends.",
  },
  reddit: {
    link: "https://www.reddit.com/prefs/delete/",
    difficulty: "easy",
    note: "Enter your username and password, choose a reason, and confirm. Deletion is permanent; posts may be anonymized.",
  },
  vk: {
    link: "https://vk.com/settings?act=deactivate",
    difficulty: "limited",
    method: "limited",
    note: "VK does not offer permanent self-serve deletion. Deactivate the account and remove content separately.",
  },
  okru: {
    link: "https://ok.ru/settings",
    difficulty: "medium",
    note: "Check account settings for deactivation and deletion options.",
  },
  weibo: {
    link: "https://kefu.weibo.com/faqdetail?id=20690",
    difficulty: "easy",
    note: "Use the official account-cancellation help page.",
  },
  truthsocial: {
    link: "https://help.truthsocial.com/truth-social-common-terminology/glossary-delete-account",
    difficulty: "easy",
    note: "Open Settings, choose Delete Account, enter your password, and confirm.",
  },
  minds: {
    link: "https://www.minds.com/settings/other/delete-account",
    difficulty: "easy",
    note: "Use Settings → Other → Delete account.",
  },
  quora: {
    link: "https://help.quora.com/hc/en-us/articles/115004250866-How-do-I-delete-my-Quora-account",
    difficulty: "easy",
    note: "Go to Settings → Privacy → Delete account.",
  },
  zhihu: {
    link: "https://www.zhihu.com/unregister",
    difficulty: "easy",
    note: "Use the official unregister page.",
  },
  eksisozluk: {
    link: "https://eksisozluk.com/",
    difficulty: "medium",
    note: "Deletion is available in the mobile app under Privacy and Security → Delete account. There is no self-serve web flow.",
  },
  uludagsozluk: {
    link: "https://www.uludagsozluk.com/",
    difficulty: "hard",
    method: "support",
    note: "Contact the administrators to delete your account. A fee may be requested in some cases.",
  },
  donanimhaber: {
    link: "https://forum.donanimhaber.com/support_create.asp",
    difficulty: "hard",
    method: "support",
    note: "Open a deletion request through the support form.",
  },
  technopat: {
    link: "https://www.technopat.net/sosyal/account/",
    difficulty: "hard",
    method: "support",
    note: "Request deletion from account details; administrator approval is required.",
  },
  shiftdelete: {
    link: "https://forum.shiftdelete.net/account/",
    difficulty: "hard",
    method: "support",
    note: "There is no self-serve deletion. Deactivate the account or contact the administrators.",
  },
  r10: {
    link: "https://www.r10.net/",
    difficulty: "hard",
    method: "support",
    note: "If there is no close option in profile settings, contact the administrators.",
  },
  blackhatworld: {
    link: "https://support.blackhatworld.com/support/solutions/articles/48000717702-how-do-i-close-my-account-",
    difficulty: "hard",
    method: "support",
    note: "Open a support ticket and choose a ban or permanent deletion request.",
  },
  warriorforum: {
    link: "https://www.warriorforum.com/warrior-forum-help/",
    difficulty: "hard",
    method: "support",
    note: "Forum accounts are not deleted; you can request a ban or anonymization from staff.",
  },
  untappd: {
    link: "https://help.untappd.com/hc/en-us/articles/360034503471-How-can-I-delete-my-Untappd-account",
    difficulty: "easy",
    note: "Open Delete Account in Account & Security, confirm the four checkboxes, and enter your password.",
  },
  foursquare: {
    link: "https://foursquare.com/delete_me",
    difficulty: "easy",
    note: "Use the delete-me page and confirm.",
  },
  strava: {
    link: "https://www.strava.com/athlete/delete_your_account",
    difficulty: "medium",
    note: "Deletion is permanent. Your account and data are removed from clubs, heatmaps, challenges, and leaderboards.",
  },
  linkedin: {
    link: "https://www.linkedin.com/help/linkedin/answer/63",
    difficulty: "medium",
    note: "LinkedIn may continue emailing people whose accounts are closed. You may need to contact support to fully delete the account.",
  },
  telegram: {
    link: "https://telegram.org/faq#q-how-do-i-delete-my-account",
    difficulty: "easy",
    note: "Open Settings → Privacy and Security → Delete my account, enter your phone number and code, and confirm. This cannot be undone.",
  },
  discord: {
    link: "https://support.discord.com/hc/en-us/articles/212226920-How-do-I-delete-my-account",
    difficulty: "easy",
    note: "Open My Account in user settings, choose Delete Account, and confirm with your password and 2FA code.",
  },
  medium: {
    link: "https://medium.com/me/settings",
    difficulty: "easy",
    note: "Use Settings → Account to delete your Medium account.",
  },
  substack: {
    link: "https://substack.com/settings",
    difficulty: "easy",
    note: "Use Settings → Account to delete your Substack account.",
  },
  wordpress: {
    link: "https://wordpress.com/me/account",
    difficulty: "medium",
    note: "Use Me → Account to close your WordPress.com account.",
  },
  blogger: {
    link: "https://support.google.com/accounts/answer/32046",
    difficulty: "medium",
    note: "Blogger is tied to a Google Account. Deleting the Google Account also removes the blog.",
  },
  livejournal: {
    link: "https://www.livejournal.com/accountstatus.bml",
    difficulty: "medium",
    note: "You have 30 days to restore a deleted journal. After that it is permanently removed.",
  },
  tumblr: {
    link: "https://www.tumblr.com/account/delete",
    difficulty: "easy",
    note: "Use the account deletion page and confirm.",
  },
  deviantart: {
    link: "https://www.deviantart.com/settings/deactivation",
    difficulty: "medium",
    note: "Most data is deleted immediately, but comments can remain. You can reactivate within 30 days; after that it is permanent.",
  },
  behance: {
    link: "https://help.behance.net/hc/en-us/articles/204484854-How-do-I-delete-cancel-my-account-",
    difficulty: "easy",
    note: "Open Account Settings from your profile menu and use the Delete Account option.",
  },
  dribbble: {
    link: "https://dribbble.com/account",
    difficulty: "easy",
    note: "Use the account settings page to delete your account.",
  },
  artstation: {
    link: "https://help.artstation.com/en/articles/16155193-how-do-i-delete-my-account",
    difficulty: "easy",
    note: "Use the account cancellation link at the bottom of Account Settings.",
  },
  aboutme: {
    link: "https://about.me/account",
    difficulty: "easy",
    note: "Delete the account from the account settings page.",
  },
  linktree: {
    link: "https://linktr.ee/admin/account",
    difficulty: "easy",
    note: "Use Admin → Account to delete your Linktree account.",
  },
  patreon: {
    link: "https://www.patreon.com/settings",
    difficulty: "medium",
    note: "Deletion is delayed for 14 days. Deletion-related data is shared with Transcend Inc.",
  },
  kofi: {
    link: "https://ko-fi.com/Manage/DeleteAccount/",
    difficulty: "medium",
    note: "Use the account deletion flow in Manage → Delete Account.",
  },
  buymeacoffee: {
    link: "https://www.buymeacoffee.com/",
    difficulty: "hard",
    method: "support",
    note: "If self-serve deletion is unavailable, send a deletion request to support.",
  },
  youtube: {
    link: "https://myaccount.google.com/deleteservices",
    difficulty: "medium",
    note: "You can download a copy of your data before deleting the YouTube channel or Google Account.",
  },
  vimeo: {
    link: "https://vimeo.com/settings/goodbye/forever",
    difficulty: "easy",
    note: "Use the permanent-deletion page and confirm.",
  },
  dailymotion: {
    link: "https://www.dailymotion.com/settings/delete-account",
    difficulty: "easy",
    note: "Enter your password and confirm with Delete Account.",
  },
  twitch: {
    link: "https://www.twitch.tv/user/delete-account",
    difficulty: "easy",
    note: "Open Settings → Account and use the Delete Account section. Cancel any subscriptions first.",
  },
  kick: {
    link: "https://help.kick.com/en/articles/7229237-contact-us",
    difficulty: "hard",
    method: "support",
    note: "Send a deletion request to Kick support.",
  },
  rumble: {
    link: "https://rumble.com/account/profile",
    difficulty: "easy",
    note: "Delete the account from your profile settings.",
  },
  odysee: {
    link: "https://odysee.com/$/settings",
    difficulty: "medium",
    note: "Use the account settings page and confirm.",
  },
  bilibili: {
    link: "https://www.bilibili.com/",
    difficulty: "medium",
    note: "In the mobile app, go to Me → Settings → Privacy Center → Account cancellation.",
  },
  netflix: {
    link: "https://www.netflix.com/cancelplan",
    difficulty: "medium",
    method: "support",
    note: "Cancelling membership closes the account within 10 months. Contact support if you need immediate deletion.",
  },
  crunchyroll: {
    link: "https://privacyportal.onetrust.com/webform/d19e506f-1a64-463d-94e4-914dd635817d/35fb5149-8905-48f3-9cbf-8b651c427d0e",
    difficulty: "medium",
    note: "Use the official privacy request form to delete your account.",
  },
  goodreads: {
    link: "https://www.goodreads.com/user/destroy",
    difficulty: "easy",
    note: "Open the account-deletion link at the bottom of Account Settings. Reviews and shelf data are removed.",
  },
  letterboxd: {
    link: "https://letterboxd.com/user/disableaccount/",
    difficulty: "easy",
    note: "Use the disable-account page and confirm the deletion.",
  },
  myanimelist: {
    link: "https://myanimelist.net/account_deletion",
    difficulty: "medium",
    note: "Enter your registered email and confirm. Then open the confirmation email to finish the request.",
  },
  anilist: {
    link: "https://anilist.co/settings/account",
    difficulty: "medium",
    note: "Choose Delete User Account and enter your password. Wait 24 hours, then repeat the step.",
  },
  trakt: {
    link: "https://trakt.tv/settings/advanced",
    difficulty: "easy",
    note: "Use Settings → Advanced to delete your account.",
  },
  imdb: {
    link: "https://www.imdb.com/registration/delete",
    difficulty: "easy",
    note: "Use the registration deletion page and confirm.",
  },
  flickr: {
    link: "https://www.flickr.com/profile_delete.gne",
    difficulty: "easy",
    note: "Use the account-deletion page and confirm.",
  },
  "500px": {
    link: "https://500px.com/settings/deletion",
    difficulty: "easy",
    note: "Open Settings → Deletion and confirm.",
  },
  vsco: {
    link: "https://support.vsco.co/hc/en-us/articles/360004196352-How-do-I-delete-my-VSCO-Account-",
    difficulty: "easy",
    note: "Deleting your account does not cancel an active membership.",
  },
  steam: {
    link: "https://help.steampowered.com/en/wizard/HelpDeleteAccount",
    difficulty: "hard",
    method: "support",
    note: "Verify ownership first. Steam Support will confirm your identity; the account is locked and then deleted within 30 days.",
  },
  roblox: {
    link: "https://www.roblox.com/my/account#!/privacy/AccountDataDeactivationAndDeletion",
    difficulty: "easy",
    note: "Open Settings → Privacy → Account data, read the warning, and confirm. Do not sign in for 30 days.",
  },
  lichess: {
    link: "https://lichess.org/account/close",
    difficulty: "easy",
    note: "Use the close-account page and confirm.",
  },
  chesscom: {
    link: "https://www.chess.com/my-data",
    difficulty: "medium",
    note: "Deletion controls are in My Data.",
  },
  craftrise: {
    link: "https://www.craftrise.com.tr/destek",
    difficulty: "hard",
    method: "support",
    note: "Send a deletion request from your registered email address to support.",
  },
  xbox: {
    link: "https://account.live.com/closeaccount.aspx",
    difficulty: "easy",
    note: "Use the Microsoft account closure page. This closes the Microsoft account linked to Xbox.",
  },
  playstation: {
    link: "https://www.playstation.com/en-us/support/account/close-account-for-psn/",
    difficulty: "hard",
    method: "support",
    note: "Account closure is handled by PlayStation Support.",
  },
  epicgames: {
    link: "https://www.epicgames.com/help/en-US/epic-accounts-c74/general-support-c79/how-do-i-delete-my-epic-games-account-a3636",
    difficulty: "medium",
    note: "Sign in, open General Information, scroll to Delete Account, and follow the prompts.",
  },
  itchio: {
    link: "https://itch.io/user/settings/delete-account",
    difficulty: "easy",
    note: "Use the delete-account page in user settings.",
  },
  spotify: {
    link: "https://support.spotify.com/close-account",
    difficulty: "medium",
    method: "support",
    note: "Cancel Premium first. Public playlists may be anonymized; delete any playlists you want removed. Then submit the account-closure form.",
  },
  soundcloud: {
    link: "https://soundcloud.com/settings/account#delete-user",
    difficulty: "medium",
    note: "Deletion is available in Settings → Account.",
  },
  bandcamp: {
    link: "https://bandcamp.com/settings?pane=fan",
    difficulty: "easy",
    note: "To remove an artist account, open the artist profile from Artists and use the link provided there.",
  },
  lastfm: {
    link: "https://www.last.fm/settings/account",
    difficulty: "easy",
    note: "Scroll to the bottom of the page and choose Delete User Account. Enter your password; deletion completes after 14 days.",
  },
  mixcloud: {
    link: "https://www.mixcloud.com/settings/delete-account/",
    difficulty: "easy",
    note: "Choose Just delete my account.",
  },
  discogs: {
    link: "https://www.discogs.com/users/delete",
    difficulty: "easy",
    note: "Use the user deletion page and confirm.",
  },
  deezer: {
    link: "https://www.deezer.com/account",
    difficulty: "medium",
    note: "If you signed up with Google or Facebook, create a Deezer password first, then confirm via the email link.",
  },
  etsy: {
    link: "https://www.etsy.com/your/account/privacy",
    difficulty: "medium",
    note: "Choose Request deletion of your data, then Yes, I'm sure. Finish by opening the email link.",
  },
  ebay: {
    link: "https://accountsettings.ebay.com/uas",
    difficulty: "medium",
    note: "You will be asked a few survey questions before the account is deleted.",
  },
  trendyol: {
    link: "https://www.trendyol.com/Hesabim/KullaniciBilgileri",
    difficulty: "medium",
    note: "Open My Account → User Information and follow the membership cancellation flow.",
  },
  sahibinden: {
    link: "https://banaozel.sahibinden.com/bilgilerim/uyelik-iptali",
    difficulty: "easy",
    note: "Use the membership cancellation page under My Account.",
  },
  udemy: {
    link: "https://www.udemy.com/user/close-account/",
    difficulty: "easy",
    note: "Choose Close account and confirm with the 6-digit code sent to your email.",
  },
  duolingo: {
    link: "https://drive-thru.duolingo.com/",
    difficulty: "easy",
    note: "Use the Duolingo account-deletion page and confirm the request.",
  },
  khanacademy: {
    link: "https://www.khanacademy.org/settings",
    difficulty: "easy",
    note: "Account deletion is available in Settings.",
  },
  coursera: {
    link: "https://www.coursera.org/account-settings",
    difficulty: "easy",
    note: "The delete-account control is at the bottom of Account Settings.",
  },
};
