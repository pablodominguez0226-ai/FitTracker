/**
 * Timezone-safe Date Utilities for FitTracker
 * Ensures local device time is respected and eliminates UTC day-shift bugs.
 */

/**
 * Returns the current (or given Date object) formatted as 'YYYY-MM-DD'
 * based strictly on the device's LOCAL timezone, OR formats a date string
 * into human-readable Spanish ('es-AR') if a string/value is passed.
 * @param {Date|string|number} [dateInput]
 * @returns {string}
 */
export const getLocalDateString = function (dateInput) {
  // Called as getLocalDateString() or getLocalDateString(new Date()) -> YYYY-MM-DD local
  if (arguments.length === 0 || dateInput instanceof Date) {
    const date = dateInput instanceof Date && !isNaN(dateInput.getTime()) ? dateInput : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (!dateInput) return "Fecha no disponible";
  try {
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      const [y, m, day] = dateInput.trim().split("-").map(Number);
      const localDate = new Date(y, m - 1, day, 12, 0, 0);
      if (!isNaN(localDate.getTime())) {
        return localDate.toLocaleDateString("es-AR", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }

    // Si viene como string ISO o con hora ("2026-10-13T15:30:00" o "2026-10-13 15:30:00")
    const cleaned = String(dateInput).replace(" ", "T");
    const d = new Date(cleaned);

    if (isNaN(d.getTime())) {
      // Fallback si viene en formato YYYY-MM-DD simple
      if (typeof dateInput === "string" && dateInput.includes("-")) {
        const [y, m, day] = dateInput.split("T")[0].split("-");
        return `${day}/${m}/${y}`;
      }
      return String(dateInput);
    }

    return d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (err) {
    return String(dateInput);
  }
};

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
    if (!trimmed) return null;

    // 1. Si viene en formato ISO (YYYY-MM-DD...)
    const matchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
      const year = parseInt(matchIso[1], 10);
      const month = parseInt(matchIso[2], 10) - 1;
      const day = parseInt(matchIso[3], 10);
      // Anchor at local noon
      const d = new Date(year, month, day, 12, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }

    // 2. Si viene en formato tradicional DD/MM/YYYY o DD/MM/YY
    if (trimmed.includes("/")) {
      const parts = trimmed.split(" ")[0].split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day, 12, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
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

/**
 * Formats a session date as "Vie, 30 Oct 2026" in Spanish without timezone shift.
 * @param {string|Date} val
 * @param {string} [preformatted]
 * @returns {string}
 */
export function formatSessionHistoryDate(val, preformatted = null) {
  const d = parseDateSafe(val);
  if (!d) return preformatted || (val ? String(val) : "--");
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formats a session date as short day + month "30 Oct" for confirmation dialogs.
 * @param {string|Date} val
 * @returns {string}
 */
export function formatSessionShortDayMonth(val) {
  const d = parseDateSafe(val);
  if (!d) return val ? String(val) : "";
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Formats a lab study entry_date in Spanish along with its petition number.
 * Example: '23 de Ene, 2026 (Petición #60612242)'
 * @param {Object} study
 * @returns {string}
 */
export function formatLabStudyLabel(study) {
  if (!study) return "--";
  const dateVal = study.entry_date || study.test_date;
  const d = parseDateSafe(dateVal);
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  let datePart = "--";
  if (d) {
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    datePart = `${day} de ${month}, ${year}`;
  }

  const petition = study.petition_number || study.data_json?.patient?.petition_number;
  if (petition) {
    return `${datePart} (Petición #${petition})`;
  }
  return datePart;
}
