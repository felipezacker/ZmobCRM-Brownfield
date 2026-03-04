/**
 * Format seconds into MM:SS display string
 */
export function formatDuration(seconds: number): string {
  const totalSecs = Math.floor(seconds)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
