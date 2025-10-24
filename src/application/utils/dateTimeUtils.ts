import { zonedTimeToUtc, utcToZonedTime, format } from "date-fns-tz";
import { addMinutes, parseISO, startOfDay, endOfDay } from "date-fns";

export const SLOT_MINUTES = 15;
export const RESERVATION_DURATION_MINUTES = 90;

/**
 * Parse time string in HH:mm format to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to HH:mm format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Generate all 15-minute slots for a given date in the restaurant's timezone.
 * If shifts are defined, only include slots within shift windows.
 * Otherwise, return full day (00:00 - 23:45).
 */
export function generateDaySlots(
  date: string,
  timezone: string,
  shifts?: Array<{ start: string; end: string }>
): Date[] {
  const slots: Date[] = [];
  const dateObj = parseISO(date);
  const zonedStart = utcToZonedTime(startOfDay(dateObj), timezone);

  if (!shifts || shifts.length === 0) {
    // Full day: 00:00 to 23:45 (96 slots)
    for (let i = 0; i < 96; i++) {
      const slotTime = addMinutes(zonedStart, i * SLOT_MINUTES);
      slots.push(zonedTimeToUtc(slotTime, timezone));
    }
  } else {
    // Generate slots only within shift windows
    for (const shift of shifts) {
      const shiftStartMinutes = parseTimeToMinutes(shift.start);
      const shiftEndMinutes = parseTimeToMinutes(shift.end);

      for (
        let minutes = shiftStartMinutes;
        minutes < shiftEndMinutes;
        minutes += SLOT_MINUTES
      ) {
        const slotTime = addMinutes(zonedStart, minutes);
        slots.push(zonedTimeToUtc(slotTime, timezone));
      }
    }
  }

  return slots;
}

/**
 * Check if a time falls within service shifts.
 * If no shifts defined, always returns true.
 */
export function isWithinShifts(
  startDateTimeISO: string,
  endDateTimeISO: string,
  timezone: string,
  shifts?: Array<{ start: string; end: string }>
): boolean {
  if (!shifts || shifts.length === 0) {
    return true;
  }

  const start = utcToZonedTime(parseISO(startDateTimeISO), timezone);
  const end = utcToZonedTime(parseISO(endDateTimeISO), timezone);

  const startTime = format(start, "HH:mm", { timeZone: timezone });
  const endTime = format(end, "HH:mm", { timeZone: timezone });

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  // Check if the reservation falls within any shift
  return shifts.some((shift) => {
    const shiftStartMinutes = parseTimeToMinutes(shift.start);
    const shiftEndMinutes = parseTimeToMinutes(shift.end);

    return startMinutes >= shiftStartMinutes && endMinutes <= shiftEndMinutes;
  });
}

/**
 * Calculate end time for a reservation given start time and duration.
 */
export function calculateEndTime(
  startDateTimeISO: string,
  durationMinutes: number
): string {
  const start = parseISO(startDateTimeISO);
  const end = addMinutes(start, durationMinutes);
  return end.toISOString();
}

/**
 * Validate ISO DateTime format
 */
export function isValidISODateTime(dateTime: string): boolean {
  try {
    const parsed = parseISO(dateTime);
    return !isNaN(parsed.getTime());
  } catch {
    return false;
  }
}
