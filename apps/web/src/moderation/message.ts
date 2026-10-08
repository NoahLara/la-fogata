import type { Messages } from "@/i18n/messages";
import type { ContentIssue } from "./content";

/** What to tell someone whose text was not taken. It never says which word, so it is no guide to getting around it. */
export function rejectionMessage(reason: ContentIssue, t: Messages["moderation"]): string {
  return reason === "offensive" ? t.offensive : t.unreadable;
}
