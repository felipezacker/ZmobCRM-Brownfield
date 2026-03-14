/**
 * Central configuration for prospecting feature (CP-3.5)
 * All magic numbers centralized here.
 */

export const PROSPECTING_CONFIG = {
  /** Max contacts in prospecting queue */
  QUEUE_MAX_CONTACTS: 100,
  /** Min calls required for heatmap cell to show data (reduced from 50) */
  HEATMAP_MIN_CALLS: 10,
  /** Max retry attempts before marking contact as exhausted */
  MAX_RETRY_COUNT: 3,
  /** Default days between retry attempts (legacy — kept for backwards compat) */
  DEFAULT_RETRY_INTERVAL_DAYS: 3,
  /** Shift-based retry: morning shift starts at this hour */
  RETRY_SHIFT_MORNING_HOUR: 9,
  /** Shift-based retry: afternoon shift starts at this hour */
  RETRY_SHIFT_AFTERNOON_HOUR: 14,
  /** Shift-based retry: cutoff hour — before this = morning, after = afternoon */
  RETRY_SHIFT_CUTOFF_HOUR: 13,
  /** Max sessions shown in session history */
  SESSION_HISTORY_LIMIT: 20,
  /** Legacy: max records for client-side fallback query */
  METRICS_MAX_RECORDS: 5000,
  /** Max records for heatmap raw data query (prevents unbounded fetch) */
  HEATMAP_MAX_RECORDS: 10000,
  /** Days after which exhausted items are cleaned up */
  EXHAUSTED_CLEANUP_DAYS: 30,
  /** Heatmap time slot labels */
  HEATMAP_TIME_SLOTS: ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20'],
} as const
