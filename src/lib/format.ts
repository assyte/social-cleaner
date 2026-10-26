export function formatDateTime(value: number | string | Date): string {
 const date = value instanceof Date ? value : new Date(value);
 return new Intl.DateTimeFormat("en-GB", {
 dateStyle: "medium",
 timeStyle: "short",
 timeZone: "Europe/Istanbul",
 }).format(date);
}

export function formatDate(value: number | string | Date): string {
 const date = value instanceof Date ? value : new Date(value);
 return new Intl.DateTimeFormat("en-GB", {
 dateStyle: "medium",
 timeZone: "Europe/Istanbul",
 }).format(date);
}

/** Compact English timestamp used by the dashboard activity table. */
export function formatScanDateTime(value: number | string | Date): string {
 const date = value instanceof Date ? value : new Date(value);
 const day = new Intl.DateTimeFormat("en-GB", {
 day: "2-digit",
 month: "short",
 timeZone: "Europe/Istanbul",
 }).format(date);
 const time = new Intl.DateTimeFormat("en-GB", {
 hour: "2-digit",
 minute: "2-digit",
 hour12: false,
 timeZone: "Europe/Istanbul",
 }).format(date);
 return `${day}, ${time}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
 return `${count} ${count === 1 ? singular : plural}`;
}
