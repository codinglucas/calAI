// Time zone helpers built on Intl, so meals are grouped into days by the
// user's profile time zone (not UTC, and not the server's zone).
//
// Terms:
// - "day":        a calendar date in the user's zone, "YYYY-MM-DD"
// - "local time": a wall-clock time in the user's zone, "YYYY-MM-DDTHH:mm"
//                 (the format of <input type="datetime-local">)

type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsInZone(date: Date, timeZone: string): Parts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

/** Milliseconds the zone is ahead of UTC at `date` (negative west of UTC). */
function zoneOffsetMs(date: Date, timeZone: string) {
  const p = partsInZone(date, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a wall-clock time in `timeZone` to a UTC Date (DST-aware). */
function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Guess with the offset at that instant, then correct once in case the
  // guess landed on the other side of a DST change.
  const firstGuess = asIfUtc - zoneOffsetMs(new Date(asIfUtc), timeZone);
  return new Date(asIfUtc - zoneOffsetMs(new Date(firstGuess), timeZone));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in `timeZone`, e.g. "2026-10-27". */
export function todayInZone(timeZone: string, now = new Date()) {
  const p = partsInZone(now, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** UTC bounds [start, end) of a calendar day in `timeZone`, as ISO strings. */
export function dayRangeUtc(day: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number);
  const start = zonedToUtc(year, month, date, 0, 0, timeZone);
  // Date.UTC normalizes day overflow (e.g. Oct 32 → Nov 1).
  const next = new Date(Date.UTC(year, month - 1, date + 1));
  const end = zonedToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    timeZone,
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

/** "YYYY-MM-DDTHH:mm" in `timeZone` → UTC ISO string. */
export function localTimeToUtc(localTime: string, timeZone: string) {
  const [datePart, timePart] = localTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return zonedToUtc(year, month, day, hour, minute, timeZone).toISOString();
}

/** UTC instant → "YYYY-MM-DDTHH:mm" in `timeZone`, for datetime-local inputs. */
export function utcToLocalTime(iso: string | Date, timeZone: string) {
  const p = partsInZone(new Date(iso), timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Local hour (0–23) of an instant in `timeZone`. */
export function hourInZone(date: Date, timeZone: string) {
  return partsInZone(date, timeZone).hour;
}

/** e.g. "8:05 AM" */
export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

/** e.g. "Tuesday, Oct 27" for a "YYYY-MM-DD" day. */
export function formatDay(day: string) {
  // Noon UTC keeps the date stable when formatted in UTC.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

/** e.g. "Tue, Oct 27" for a "YYYY-MM-DD" day. */
export function formatShortDay(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

/** The day an instant falls on in `timeZone`. */
export function dayInZone(iso: string | Date, timeZone: string) {
  return utcToLocalTime(iso, timeZone).slice(0, 10);
}

/** `day` moved by `days` calendar days (negative goes back). */
export function addDays(day: string, days: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

/** True for a real calendar date in "YYYY-MM-DD" form (rejects "2026-02-30"). */
export function isDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

/** Valid IANA time zone name, e.g. "America/New_York". */
export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
