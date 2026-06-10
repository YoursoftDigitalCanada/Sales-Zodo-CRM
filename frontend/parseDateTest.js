function parseDate(value) {
  if (!value) return new Date().toISOString();
  const raw = String(value).trim();

  // Handle MM/DD/YY or MM/DD/YYYY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    // Convert 2-digit year: 00-49 → 2000s, 50-99 → 1900s
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // Fallback to native parser
  const date = new Date(raw);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

console.log(parseDate("24/05/2025"));
