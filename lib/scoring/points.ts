import { isoWeekKey, consecutiveWeekRuns } from '../date'

export type TimeSlot = 'DAY' | 'EVENING' | 'OVERNIGHT'

export type ScorableVisit = {
  visitDate: string
  timeSlot: TimeSlot
  hasMemo: boolean
  photoCount: number
  attendeeCount: number
}

/** 스펙 §4.1 — 배점은 여기가 유일한 원본 */
export const POINTS = {
  VISIT: 10,
  SLOT: { DAY: 0, EVENING: 3, OVERNIGHT: 7 } as Record<TimeSlot, number>,
  MEMO: 3,
  PHOTO: 5,
  COMPANION_PER_HEAD: 1,
  COMPANION_CAP: 3,
  FIRST_VISIT: 20,
  STREAK_WEEKS: 4,
  STREAK_REWARD: 15,
} as const

/** 모임 단건 점수 (참석자 각자에게 동일하게 부여) */
export function visitPoints(v: ScorableVisit): number {
  const companions = Math.min(
    Math.max(v.attendeeCount - 1, 0) * POINTS.COMPANION_PER_HEAD,
    POINTS.COMPANION_CAP,
  )
  return (
    POINTS.VISIT +
    POINTS.SLOT[v.timeSlot] +
    (v.hasMemo ? POINTS.MEMO : 0) +
    (v.photoCount > 0 ? POINTS.PHOTO : 0) +
    companions
  )
}

/** 연속 방문 보너스: 각 연속 구간의 (주 수 ÷ 4) 몫 × 15점 */
export function streakBonus(visits: { visitDate: string }[]): number {
  const runs = consecutiveWeekRuns(visits.map((v) => isoWeekKey(v.visitDate)))
  return runs.reduce(
    (sum, run) => sum + Math.floor(run / POINTS.STREAK_WEEKS) * POINTS.STREAK_REWARD,
    0,
  )
}

export function totalPoints(
  visits: ScorableVisit[],
  opts: { includeFirstVisitBonus: boolean },
): number {
  const base = visits.reduce((sum, v) => sum + visitPoints(v), 0)
  const first = opts.includeFirstVisitBonus && visits.length > 0 ? POINTS.FIRST_VISIT : 0
  return base + first + streakBonus(visits)
}
