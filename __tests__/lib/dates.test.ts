import { describe, expect, it } from "vitest";
import {
  addDays,
  dayInZone,
  dayRangeUtc,
  formatDay,
  formatTime,
  hourInZone,
  isDay,
  isTimeZone,
  localTimeToUtc,
  todayInZone,
  utcToLocalTime,
} from "@/lib/dates";

const NEW_YORK = "America/New_York";
const TOKYO = "Asia/Tokyo";

describe("todayInZone", () => {
  it("gives different days for the same instant in different zones", () => {
    const instant = new Date("2026-11-02T02:00:00Z");
    expect(todayInZone(NEW_YORK, instant)).toBe("2026-11-01");
    expect(todayInZone(TOKYO, instant)).toBe("2026-11-02");
  });
});

describe("dayRangeUtc", () => {
  it("covers 24 hours on a normal day", () => {
    expect(dayRangeUtc("2026-10-27", NEW_YORK)).toEqual({
      start: "2026-10-27T04:00:00.000Z",
      end: "2026-10-28T04:00:00.000Z",
    });
  });

  it("covers 23 hours when clocks spring forward", () => {
    expect(dayRangeUtc("2026-03-08", NEW_YORK)).toEqual({
      start: "2026-03-08T05:00:00.000Z",
      end: "2026-03-09T04:00:00.000Z",
    });
  });

  it("covers 25 hours when clocks fall back", () => {
    expect(dayRangeUtc("2026-11-01", NEW_YORK)).toEqual({
      start: "2026-11-01T04:00:00.000Z",
      end: "2026-11-02T05:00:00.000Z",
    });
  });

  it("rolls over the end of a month", () => {
    expect(dayRangeUtc("2026-10-31", TOKYO).end).toBe("2026-10-31T15:00:00.000Z");
  });
});

describe("local time conversion", () => {
  it("converts wall-clock time to UTC", () => {
    expect(localTimeToUtc("2026-10-27T08:30", NEW_YORK)).toBe("2026-10-27T12:30:00.000Z");
  });

  // The first offset guess lands before the clock change, so this needs the correction.
  it("handles a time just after clocks spring forward", () => {
    expect(localTimeToUtc("2026-03-08T03:30", NEW_YORK)).toBe("2026-03-08T07:30:00.000Z");
  });

  it("round-trips", () => {
    const local = "2026-07-15T19:45";
    expect(utcToLocalTime(localTimeToUtc(local, TOKYO), TOKYO)).toBe(local);
  });
});

describe("dayInZone", () => {
  it("puts a late-night meal on the local day, not the UTC day", () => {
    expect(dayInZone("2026-10-28T02:00:00Z", NEW_YORK)).toBe("2026-10-27");
  });
});

describe("hourInZone", () => {
  it("reads the local hour, with midnight as 0", () => {
    expect(hourInZone(new Date("2026-10-27T04:00:00Z"), NEW_YORK)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats times in the zone", () => {
    expect(formatTime("2026-10-27T12:05:00Z", NEW_YORK).replace(/\s/g, " ")).toBe("8:05 AM");
  });

  it("formats a day without shifting it", () => {
    expect(formatDay("2026-10-27")).toBe("Tuesday, Oct 27");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries in both directions", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isDay", () => {
  it.each(["2026-10-27", "2028-02-29"])("accepts %s", (value) => {
    expect(isDay(value)).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01", "2026-2-3", "today", ""])("rejects %j", (value) => {
    expect(isDay(value)).toBe(false);
  });
});

describe("isTimeZone", () => {
  it("accepts real zones and rejects others", () => {
    expect(isTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
  });
});
