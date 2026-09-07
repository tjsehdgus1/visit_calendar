import { prisma } from '@/lib/db'
import { fromDateOnly, toDateOnly } from '@/lib/date'
import { averageRating, isEffectivePlay, sortGames, type PlayLike } from '@/lib/mystery/logic'

export type GameCard = {
  id: string
  title: string
  players: number
  playTime: string | null
  secretTalk: boolean
  owner: string | null
  active: boolean
  playCount: number
  avgRating: number | null
  lastPlayedOn: string | null
}

const playSelect = {
  id: true,
  rating: true,
  review: true,
  playedOn: true,
  playersText: true,
  visit: {
    select: {
      id: true,
      status: true,
      submittedBy: { select: { nickname: true } },
      attendees: { select: { user: { select: { nickname: true } } } },
    },
  },
} as const

type RawPlay = {
  id: string
  rating: number
  review: string | null
  playedOn: Date
  playersText: string | null
  visit: {
    id: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    submittedBy: { nickname: string }
    attendees: { user: { nickname: string } }[]
  } | null
}

function toPlayLike(p: RawPlay): PlayLike {
  return { rating: p.rating, playedOn: fromDateOnly(p.playedOn), visitStatus: p.visit?.status ?? null }
}

/** 서재 목록: 유효한 플레이(방문 없음 또는 승인됨)만 통계에 센다 */
export async function listGames(opts: { includeInactive?: boolean } = {}): Promise<GameCard[]> {
  const games = await prisma.mysteryGame.findMany({
    where: opts.includeInactive ? {} : { active: true },
    select: {
      id: true, title: true, players: true, playTime: true, secretTalk: true, owner: true, active: true,
      plays: { select: playSelect },
    },
  })
  const cards = games.map((g) => {
    const eff = g.plays.map(toPlayLike).filter(isEffectivePlay)
    const last = eff.map((p) => p.playedOn).sort().at(-1) ?? null
    return {
      id: g.id, title: g.title, players: g.players, playTime: g.playTime, secretTalk: g.secretTalk,
      owner: g.owner, active: g.active,
      playCount: eff.length, avgRating: averageRating(eff), lastPlayedOn: last,
    }
  })
  return sortGames(cards)
}

export type PlayRow = {
  id: string
  playedOn: string
  rating: number
  review: string | null
  /** 함께한 사람: 방문이 있으면 참석자 + 제출자, 없으면 이관 텍스트 */
  players: string
  visitId: string | null
  effective: boolean
}

export async function getGame(id: string) {
  const g = await prisma.mysteryGame.findUnique({
    where: { id },
    select: {
      id: true, title: true, players: true, playTime: true, secretTalk: true, owner: true,
      description: true, active: true,
      plays: { select: playSelect, orderBy: { playedOn: 'desc' } },
    },
  })
  if (!g) return null
  const plays: PlayRow[] = g.plays.map((p) => ({
    id: p.id,
    playedOn: fromDateOnly(p.playedOn),
    rating: p.rating,
    review: p.review,
    players: p.visit
      ? [...new Set([...p.visit.attendees.map((a) => a.user.nickname), p.visit.submittedBy.nickname])].join(', ')
      : (p.playersText ?? ''),
    visitId: p.visit?.id ?? null,
    effective: isEffectivePlay(toPlayLike(p)),
  }))
  const eff = g.plays.map(toPlayLike).filter(isEffectivePlay)
  return { ...g, plays, playCount: eff.length, avgRating: averageRating(eff) }
}

/** 기록 폼용: 활성 게임을 안 한 게임 먼저 보여준다 */
export async function listGamesForPicker(): Promise<{ id: string; title: string; players: number; played: boolean }[]> {
  const cards = await listGames()
  return cards.map((c) => ({ id: c.id, title: c.title, players: c.players, played: c.playCount > 0 }))
}

export type GameInput = {
  title: string
  players: number
  playTime?: string
  secretTalk: boolean
  owner?: string
  description?: string
}

export async function createGame(input: GameInput) {
  return prisma.mysteryGame.create({
    data: {
      title: input.title,
      players: input.players,
      playTime: input.playTime || null,
      secretTalk: input.secretTalk,
      owner: input.owner || null,
      description: input.description || null,
    },
    select: { id: true },
  })
}

export async function updateGame(id: string, input: GameInput) {
  return prisma.mysteryGame.update({
    where: { id },
    data: {
      title: input.title,
      players: input.players,
      playTime: input.playTime || null,
      secretTalk: input.secretTalk,
      owner: input.owner || null,
      description: input.description || null,
    },
    select: { id: true },
  })
}

export async function setGameActive(id: string, active: boolean) {
  return prisma.mysteryGame.update({ where: { id }, data: { active }, select: { id: true } })
}

/** 방문에 붙은 플레이 (방문 상세 표시용) */
export async function playsForVisit(visitId: string) {
  const plays = await prisma.mysteryPlay.findMany({
    where: { visitId },
    select: { id: true, rating: true, review: true, game: { select: { id: true, title: true } } },
  })
  return plays
}

export { toDateOnly }
