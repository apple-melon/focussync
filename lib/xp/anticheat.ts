interface SessionValidationInput {
  focusMinutes: number
  startedAt: string
  endedAt: string
  sessionCount: number
  reportedXP: number
}

interface ValidationResult {
  valid: boolean
  reason?: string
}

const MAX_FOCUS_MINUTES = 90
const MIN_FOCUS_MINUTES = 1
const MAX_SESSION_COUNT_PER_DAY = 20
const MAX_XP_PER_SESSION = 500
const CLOCK_SKEW_TOLERANCE_SECONDS = 60

export function validateSession(input: SessionValidationInput): ValidationResult {
  const { focusMinutes, startedAt, endedAt, sessionCount, reportedXP } = input

  if (focusMinutes < MIN_FOCUS_MINUTES) {
    return { valid: false, reason: 'Session too short' }
  }

  if (focusMinutes > MAX_FOCUS_MINUTES) {
    return { valid: false, reason: 'Session exceeds maximum duration' }
  }

  const start = new Date(startedAt).getTime()
  const end = new Date(endedAt).getTime()

  if (isNaN(start) || isNaN(end)) {
    return { valid: false, reason: 'Invalid timestamps' }
  }

  const actualMinutes = (end - start) / 60000

  if (actualMinutes < focusMinutes - CLOCK_SKEW_TOLERANCE_SECONDS / 60) {
    return { valid: false, reason: 'Reported focus time exceeds actual elapsed time' }
  }

  if (sessionCount > MAX_SESSION_COUNT_PER_DAY) {
    return { valid: false, reason: 'Too many sessions in one day' }
  }

  if (reportedXP > MAX_XP_PER_SESSION) {
    return { valid: false, reason: 'XP claim exceeds maximum per session' }
  }

  const now = Date.now()
  if (end > now + CLOCK_SKEW_TOLERANCE_SECONDS * 1000) {
    return { valid: false, reason: 'Session end time is in the future' }
  }

  if (start > end) {
    return { valid: false, reason: 'Start time after end time' }
  }

  return { valid: true }
}
