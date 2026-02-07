export const CLINIC_TIME_ZONE = "Africa/Algiers";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type WeekdayKey =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

function parseDateParts(dateStr: string): DateParts {
  if (!DATE_ONLY_REGEX.test(dateStr)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid date value.");
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    throw new Error("Invalid date value.");
  }
  return { year, month, day };
}

function formatDateParts(parts: DateParts): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function addDaysToDateString(dateStr: string, days: number): string {
  const { year, month, day } = parseDateParts(dateStr);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return formatDateParts({
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
  });
}

export function isValidDateString(dateStr: string): boolean {
  try {
    parseDateParts(dateStr);
    return true;
  } catch {
    return false;
  }
}

function getTimeZoneOffset(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const minute = Number(values.minute);
  const second = Number(values.second);
  let hour = Number(values.hour);
  if (hour === 24) {
    // Some locales return 24:00 for midnight; treat it as 00:00 of the same day
    hour = 0;
  }

  const asUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );

  return asUtc - date.getTime();
}

export function normalizeDateToClinicMidnight(dateStr: string): Date {
  const { year, month, day } = parseDateParts(dateStr);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  let offset = getTimeZoneOffset(utcMidnight, CLINIC_TIME_ZONE);
  let zonedDate = new Date(utcMidnight.getTime() - offset);

  const revisedOffset = getTimeZoneOffset(zonedDate, CLINIC_TIME_ZONE);
  if (revisedOffset !== offset) {
    offset = revisedOffset;
    zonedDate = new Date(utcMidnight.getTime() - offset);
  }

  return zonedDate;
}

export function getClinicDayRange(dateStr: string): { start: Date; end: Date } {
  const start = normalizeDateToClinicMidnight(dateStr);
  const nextDateStr = addDaysToDateString(dateStr, 1);
  const end = normalizeDateToClinicMidnight(nextDateStr);
  return { start, end };
}

export function getClinicWeekday(date: Date): WeekdayKey {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIME_ZONE,
    weekday: "short",
  })
    .format(date)
    .toLowerCase();

  const key = weekday.slice(0, 3) as WeekdayKey;
  return key;
}

export function getClinicDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDateInPast(dateStr: string): boolean {
  const target = normalizeDateToClinicMidnight(dateStr).getTime();
  const today = normalizeDateToClinicMidnight(getClinicDateString()).getTime();
  return target < today;
}
