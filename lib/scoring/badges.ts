import { isoWeekKey, consecutiveWeekRuns } from '../date'
import type { ScorableVisit } from './points'

export type BadgeContext = {
  /** 승인된 방문 전체 */
  visits: ScorableVisit[]
  /** visits와 같은 순서·같은 길이. 각 모임의 태그 slug 목록 */
  visitTagSlugs: string[][]
  /** 현재 활성 태그 slug 목록 (ALL_TAGS 판정 기준) */
  activeTagSlugs: string[]
  /** 이 사용자가 업로드한 사진 총 수 */
  uploadedPhotoCount: number
  /** 이 사용자가 제출자로서 메모를 남긴 승인 모임 수 */
  authoredMemoCount: number
}

const STREAK_WEEKS = 4

/**
 * 비시즌 뱃지 10종을 판정한다.
 * SEASON_CHAMPION / TAG_KING은 시즌 마감 로직에서 따로 부여한다.
 */
export function earnedBadgeCodes(ctx: BadgeContext): string[] {
  const { visits, visitTagSlugs, activeTagSlugs, uploadedPhotoCount, authoredMemoCount } = ctx
  const codes: string[] = []
  const count = visits.length
  if (count === 0) return codes

  codes.push('FIRST_VISIT')
  if (count >= 10) codes.push('VISIT_10')
  if (count >= 50) codes.push('VISIT_50')

  if (visits.filter((v) => v.timeSlot === 'OVERNIGHT').length >= 3) codes.push('OVERNIGHT_3')

  const runs = consecutiveWeekRuns(visits.map((v) => isoWeekKey(v.visitDate)))
  if (runs.some((r) => r >= STREAK_WEEKS)) codes.push('STREAK_4W')

  const experienced = new Set(visitTagSlugs.flat())
  if (activeTagSlugs.length > 0 && activeTagSlugs.every((slug) => experienced.has(slug))) {
    codes.push('ALL_TAGS')
  }

  if (uploadedPhotoCount >= 30) codes.push('PHOTO_30')
  if (authoredMemoCount >= 20) codes.push('MEMO_20')

  if (visits.filter((v) => v.attendeeCount === 1).length >= 5) codes.push('SOLO_5')
  if (visits.filter((v) => v.attendeeCount >= 4).length >= 5) codes.push('CROWD_5')

  return codes
}

/**
 * UserBadge.seasonKey 값을 만든다.
 * NULL을 쓰면 Postgres가 NULL을 서로 다른 값으로 취급해 @@unique가 무력화된다.
 */
export function seasonKeyFor(code: string, seasonId?: string, tagSlug?: string): string {
  if (code === 'SEASON_CHAMPION') {
    if (!seasonId) throw new Error('SEASON_CHAMPION에는 seasonId가 필요합니다')
    return seasonId
  }
  if (code === 'TAG_KING') {
    if (!seasonId || !tagSlug) throw new Error('TAG_KING에는 seasonId와 tagSlug가 필요합니다')
    return `${seasonId}:${tagSlug}`
  }
  return '-'
}
