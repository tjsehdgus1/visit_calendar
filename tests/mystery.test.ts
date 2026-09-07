import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isEffectivePlay, averageRating, sortGames, ratingLabel, type PlayLike, type GameStats } from '../lib/mystery/logic'

const play = (over: Partial<PlayLike> = {}): PlayLike => ({ rating: 4, playedOn: '2026-09-01', visitStatus: null, ...over })

test('유효한 플레이: 방문이 없거나(이관분) 방문이 APPROVED', () => {
  assert.equal(isEffectivePlay(play({ visitStatus: null })), true)
  assert.equal(isEffectivePlay(play({ visitStatus: 'APPROVED' })), true)
  assert.equal(isEffectivePlay(play({ visitStatus: 'PENDING' })), false)
  assert.equal(isEffectivePlay(play({ visitStatus: 'REJECTED' })), false)
})

test('평균 별점은 유효한 플레이만, 소수 첫째 자리, 없으면 null', () => {
  assert.equal(averageRating([]), null)
  assert.equal(averageRating([play({ rating: 5 }), play({ rating: 4 })]), 4.5)
  assert.equal(averageRating([play({ rating: 5 }), play({ rating: 4, visitStatus: 'PENDING' })]), 5)
  assert.equal(averageRating([play({ rating: 3 }), play({ rating: 4 }), play({ rating: 4 })]), 3.7)
})

test('정렬: 안 한 게임 먼저(가나다), 그 다음 최근 플레이 순', () => {
  const g = (title: string, lastPlayedOn: string | null, playCount: number): GameStats => ({ title, lastPlayedOn, playCount })
  const sorted = sortGames([
    g('유각관의 살인', '2026-08-01', 1),
    g('개화', null, 0),
    g('레드×리그렛', '2026-09-01', 2),
    g('이 어둠을 당신과', null, 0),
  ]).map((x) => x.title)
  assert.deepEqual(sorted, ['개화', '이 어둠을 당신과', '레드×리그렛', '유각관의 살인'])
})

test('별점 표시', () => {
  assert.equal(ratingLabel(null), '아직 안 함')
  assert.equal(ratingLabel(4.5), '⭐ 4.5')
})
