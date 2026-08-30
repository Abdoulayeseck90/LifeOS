// RFC 5545 iCalendar generation for the one-way LifeOS -> Apple Calendar
// feed. Deliberately minimal: no VTIMEZONE block, no RRULE. Appointments'
// date_time is already a precise UTC instant (Postgres timestamptz), so
// emitting it with a Z suffix needs no timezone conversion at all —
// every calendar client (including Apple Calendar) converts a UTC
// instant to the viewer's local time automatically. Monitoring items'
// next_due_at is a plain calendar date with no time component, so it
// becomes an all-day VEVENT (DTSTART;VALUE=DATE) — also inherently
// timezone-free, and matches how the in-app Calendar page already
// treats it (CalendarEntry.dateTime: null for monitoring).
export interface CalendarFeedEvent {
  source: "appointment" | "monitoring";
  id: string;
  title: string;
  description: string | null;
  startsAt: string | null; // ISO instant (appointments)
  dueDate: string | null; // "YYYY-MM-DD" (monitoring)
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

const CRLF = "\r\n";
// RFC 5545 §3.1: lines must be folded at 75 octets, continuation lines
// start with a single space. Short-circuits for the common case (most
// SUMMARY/LOCATION values are well under this) rather than always
// re-joining.
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const limit = first ? 75 : 74; // continuation lines lose 1 char to the leading space
    chunks.push((first ? "" : " ") + rest.slice(0, limit));
    rest = rest.slice(limit);
    first = false;
  }
  return chunks.join(CRLF);
}

// Escapes exactly the characters RFC 5545 §3.3.11 requires for TEXT
// values — backslash first, so it doesn't double-escape the others.
function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsLine(name: string, value: string): string {
  return foldIcsLine(`${name}:${escapeIcsText(value)}`);
}

function formatDateTimeUtc(iso: string): string {
  // "2026-06-15T14:00:00.000Z" -> "20260615T140000Z"
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatDateOnly(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

function buildVEvent(event: CalendarFeedEvent, now: string): string {
  const uid = `lifeos-${event.source}-${event.id}@lifeos.local`;
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(formatIcsLine("UID", uid));
  lines.push(`DTSTAMP:${formatDateTimeUtc(now)}`);

  if (event.startsAt) {
    lines.push(`DTSTART:${formatDateTimeUtc(event.startsAt)}`);
  } else if (event.dueDate) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.dueDate)}`);
  }

  lines.push(formatIcsLine("SUMMARY", event.title));
  if (event.description) lines.push(formatIcsLine("DESCRIPTION", event.description));
  if (event.location) lines.push(formatIcsLine("LOCATION", event.location));
  lines.push(`CREATED:${formatDateTimeUtc(event.createdAt)}`);
  lines.push(`LAST-MODIFIED:${formatDateTimeUtc(event.updatedAt)}`);
  lines.push("STATUS:CONFIRMED");
  lines.push("END:VEVENT");
  return lines.join(CRLF);
}

export function buildIcsFeed(events: CalendarFeedEvent[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifeOS//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    formatIcsLine("X-WR-CALNAME", "LifeOS"),
    ...events.map((event) => buildVEvent(event, now)),
    "END:VCALENDAR",
  ];
  return lines.join(CRLF) + CRLF;
}
