import { describe, expect, it } from "vitest";
import { ringScaleFor, SEATS } from "./seatTable";

describe("the seat layout", () => {
  it("has seven seats at the agreed angles", () => {
    expect(SEATS.map((seat) => seat.degrees)).toEqual([65, 115, 165, 15, 225, 255, 300]);
  });

  it("sees the near seats from behind, the flanks in profile and the far seats head-on", () => {
    const view = (degrees: number) => SEATS.find((seat) => seat.degrees === degrees)?.view;
    expect([view(65), view(115)]).toEqual(["back", "back"]);
    expect([view(165), view(15)]).toEqual(["side", "side"]);
    expect([view(225), view(255), view(300)]).toEqual(["front", "front", "front"]);
  });

  it("puts logs at 115, 225 and 300 degrees only", () => {
    const withLog = SEATS.filter((seat) => seat.log).map((seat) => seat.degrees);
    expect(withLog.sort((a, b) => a - b)).toEqual([115, 225, 300]);
  });

  it("leaves nobody directly behind the flames", () => {
    // Straight behind the fire is 270 degrees, straight in front 90.
    for (const seat of SEATS) expect(Math.abs(seat.degrees - 270)).toBeGreaterThanOrEqual(15);
  });

  it("squeezes every seat but the back-view ones to 80% sideways", () => {
    for (const seat of SEATS) expect(ringScaleFor(seat)).toBe(seat.view === "back" ? 1 : 0.8);
  });
});
