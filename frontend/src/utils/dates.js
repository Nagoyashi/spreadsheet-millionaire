// Calendar-date helpers. The ONE place "today" is turned into a YYYY-MM-DD
// string on the client.
//
// Why not `new Date().toISOString().slice(0, 10)`: toISOString() is UTC, so for
// anyone east of UTC an evening snapshot was stamped with *yesterday's* date
// (#285 — a 01:00 CEST snapshot showed up as the previous day on the Net Worth
// trend). Calendar dates are a user-local concept; the client owns them and
// sends them explicitly. The server's CURRENT_DATE default is only a fallback
// for API callers that omit the date.

export function localIsoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
