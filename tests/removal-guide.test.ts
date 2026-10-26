import { describe, expect, it } from "vitest";
import { PLATFORMS } from "@/server/search/platforms";
import { REMOVAL_GUIDES, REMOVAL_GUIDE_COUNTS } from "@/server/removal/guides";

describe("remove guide", () => {
  it("covers every catalogue platform with a real link and steps", () => {
    expect(REMOVAL_GUIDES).toHaveLength(PLATFORMS.length);
    expect(new Set(REMOVAL_GUIDES.map((guide) => guide.id)).size).toBe(PLATFORMS.length);

    for (const guide of REMOVAL_GUIDES) {
      expect(guide.name.length).toBeGreaterThan(0);
      expect(guide.link).toMatch(/^https:\/\//);
      expect(guide.steps.length).toBeGreaterThanOrEqual(4);
      expect(guide.steps.every((step) => step.trim().length > 0)).toBe(true);
    }
  });

  it("reports stable totals for the page header", () => {
    const counts = REMOVAL_GUIDE_COUNTS;
    expect(counts.total).toBe(PLATFORMS.length);
    expect(counts.easy + counts.medium + counts.hard + counts.limited).toBe(counts.total);
    expect(counts.selfServe + counts.support).toBe(counts.total);
  });
});
