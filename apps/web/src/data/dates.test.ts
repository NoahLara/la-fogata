import { describe, expect, it } from "vitest";
import { dateKey, formatLetterDate } from "./dates";

describe("dateKey", () => {
  it("is the calendar day of the visitor, zero padded", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe("2026-01-05");
    expect(dateKey(new Date(2026, 9, 15, 0, 1).getTime())).toBe("2026-10-15");
  });
});

describe("formatLetterDate", () => {
  it("heads a letter in the language of the visitor", () => {
    expect(formatLetterDate("2026-10-05", "es")).toBe("5 de octubre de 2026");
    expect(formatLetterDate("2026-10-05", "en")).toBe("October 5, 2026");
  });

  it("does not move a day with the time zone", () => {
    expect(formatLetterDate("2026-01-01", "en")).toBe("January 1, 2026");
    expect(formatLetterDate("2026-12-31", "en")).toBe("December 31, 2026");
  });

  it("gives back what it cannot read", () => {
    expect(formatLetterDate("not a date", "en")).toBe("not a date");
  });
});
