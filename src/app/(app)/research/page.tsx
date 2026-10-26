import { redirect } from "next/navigation";

/** The Phase 2A search workspace replaced the old roadmap-only page. */
export default function ResearchPage() {
 redirect("/search");
}
