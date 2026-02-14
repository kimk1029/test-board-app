const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Returns the start of week in KST (Monday 00:00) as UTC Date.
 * Use this for "weekly reset" style aggregations without deleting data.
 */
export function getKSTWeekStart(now: Date = new Date()): Date {
  const kstNowMs = now.getTime() + KST_OFFSET_MS
  const kstNow = new Date(kstNowMs)
  const day = kstNow.getUTCDay() // 0 Sun ... 6 Sat
  const diffToMonday = day === 0 ? 6 : day - 1
  const kstMidnightMs =
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) -
    diffToMonday * DAY_MS

  // Convert KST Monday 00:00 back to UTC Date
  return new Date(kstMidnightMs - KST_OFFSET_MS)
}

export function getWeeklyRange(now: Date = new Date()) {
  const start = getKSTWeekStart(now)
  const end = now
  return { start, end }
}

