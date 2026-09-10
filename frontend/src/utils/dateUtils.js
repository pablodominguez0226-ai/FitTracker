/**
 * Timezone-safe Date Utilities for FitTracker
 * Ensures local device time is respected and eliminates UTC day-shift bugs.
 */

/**
 * Returns the current (or given) date formatted as 'YYYY-MM-DD'
 * based strictly on the device's LOCAL timezone.
 * @param {Date|string|number} d 
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateString(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses any date or date string into a Date object without timezone shifting.
 * For 'YYYY-MM-DD' strings, anchors at local noon (12:00:00) so daylight savings
 * or UTC conversions never cross midnight to yesterday or tomorrow.
 * @param {string|Date} val 
 * @returns {Date|null}
 */
export function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    // Check for YYYY-MM-DD at the beginning
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      // Anchor at local noon
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date string or Date object in Spanish (e.g. 'lun, 7 sept 2026')
 * without off-by-one day bugs.
 * @param {string|Date} val 
 * @param {Intl.DateTimeFormatOptions} options 
 * @returns {string}
 */
export function formatDateSafe(val, options = {}) {
  const d = parseDateSafe(val);
  if (!d) return val ? String(val) : "--";

  const defaultOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };

  try {
    return new Intl.DateTimeFormat("es-ES", defaultOptions).format(d);
  } catch {
    return String(val);
  }
}

/**
 * Formats a date string or Date object in full Spanish
 * (e.g. 'Lunes, 7 de septiembre de 2026') with capitalized first letter.
 * @param {string|Date} val 
 * @returns {string}
 */
export function formatDateLong(val) {
  const d = parseDateSafe(val);
  if (!d) return val ? String(val) : "--";

  try {
    const formatted = new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return String(val);
  }
}
