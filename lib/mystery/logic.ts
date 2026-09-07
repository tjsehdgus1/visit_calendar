// Prisma를 import 하지 않는 순수 함수 (설계서 §7)

export type VisitStatusLike = 'PENDING' | 'APPROVED' | 'REJECTED' | null

export type PlayLike = {
  rating: number
  playedOn: string
  /** 방문에 붙지 않은 플레이(노션 이관분)는 null */
  visitStatus: VisitStatusLike
}

/** 서재 통계에 반영되는 플레이: 방문이 없거나 방문이 승인된 것 */
export function isEffectivePlay(p: PlayLike): boolean {
  return p.visitStatus === null || p.visitStatus === 'APPROVED'
}

/** 유효한 플레이의 평균 별점 (소수 첫째 자리). 없으면 null */
export function averageRating(plays: PlayLike[]): number | null {
  const eff = plays.filter(isEffectivePlay)
  if (eff.length === 0) return null
  const sum = eff.reduce((a, p) => a + p.rating, 0)
  return Math.round((sum / eff.length) * 10) / 10
}

export type GameStats = { title: string; lastPlayedOn: string | null; playCount: number }

/** 안 한 게임 먼저(가나다순), 그 다음 최근 플레이 순 */
export function sortGames<T extends GameStats>(games: T[]): T[] {
  return [...games].sort((a, b) => {
    const aNew = a.playCount === 0
    const bNew = b.playCount === 0
    if (aNew !== bNew) return aNew ? -1 : 1
    if (aNew) return a.title.localeCompare(b.title, 'ko')
    return (b.lastPlayedOn ?? '').localeCompare(a.lastPlayedOn ?? '')
  })
}

export function ratingLabel(avg: number | null): string {
  return avg === null ? '아직 안 함' : `⭐ ${avg.toFixed(1)}`
}
