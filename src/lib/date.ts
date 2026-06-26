const DAY_MS = 24 * 60 * 60 * 1000

export function parseDeadlineISO(deadlineISO: string | null | undefined): number | null {
  if (!deadlineISO || !/^\d{4}-\d{2}-\d{2}$/.test(deadlineISO)) return null
  const [year, month, day] = deadlineISO.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
}

export function formatDeadlineISO(deadline: number | null | undefined): string {
  if (!deadline) return 'no hard deadline'
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return 'no hard deadline'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysBetween(start: number, end: number): number {
  return Math.floor((end - start) / DAY_MS)
}
