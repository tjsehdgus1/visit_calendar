import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visitPoints, streakBonus, totalPoints, type ScorableVisit } from '../lib/scoring/points'

const base: ScorableVisit = {
  visitDate: '2026-08-26',
  timeSlot: 'DAY',
  hasMemo: false,
  photoCount: 0,
  attendeeCount: 1,
}

test('낮에 혼자 와서 아무 기록도 안 남기면 10점', () => {
  assert.equal(visitPoints(base), 10)
})

test('시간대 가산: 낮 +0, 저녁 +3, 밤새 +7', () => {
  assert.equal(visitPoints({ ...base, timeSlot: 'DAY' }), 10)
  assert.equal(visitPoints({ ...base, timeSlot: 'EVENING' }), 13)
  assert.equal(visitPoints({ ...base, timeSlot: 'OVERNIGHT' }), 17)
})

test('메모 +3, 사진 +5 (장수와 무관하게 1회)', () => {
  assert.equal(visitPoints({ ...base, hasMemo: true }), 13)
  assert.equal(visitPoints({ ...base, photoCount: 1 }), 15)
  assert.equal(visitPoints({ ...base, photoCount: 9 }), 15)
})

test('동반자 가산은 (참석자수-1)이며 최대 3점', () => {
  assert.equal(visitPoints({ ...base, attendeeCount: 1 }), 10)
  assert.equal(visitPoints({ ...base, attendeeCount: 2 }), 11)
  assert.equal(visitPoints({ ...base, attendeeCount: 4 }), 13)
  assert.equal(visitPoints({ ...base, attendeeCount: 9 }), 13) // 상한
})

test('밤새 + 메모 + 사진 + 4명이면 28점', () => {
  assert.equal(
    visitPoints({ ...base, timeSlot: 'OVERNIGHT', hasMemo: true, photoCount: 2, attendeeCount: 4 }),
    28,
  )
})

test('연속 보너스는 4주 묶음마다 15점', () => {
  const weeks = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      visitDate: addDays('2026-01-05', i * 7), // 2026-01-05는 월요일
    }))

  assert.equal(streakBonus(weeks(3)), 0)
  assert.equal(streakBonus(weeks(4)), 15)
  assert.equal(streakBonus(weeks(8)), 30)
  assert.equal(streakBonus(weeks(9)), 30)
})

test('같은 주에 여러 번 와도 한 주로 센다', () => {
  const sameWeek = [
    { visitDate: '2026-01-05' },
    { visitDate: '2026-01-06' },
    { visitDate: '2026-01-07' },
    { visitDate: '2026-01-08' },
  ]
  assert.equal(streakBonus(sameWeek), 0)
})

test('연속이 끊기면 구간별로 따로 센다', () => {
  const run1 = [0, 1, 2, 3].map((i) => ({ visitDate: addDays('2026-01-05', i * 7) }))
  const run2 = [0, 1, 2, 3].map((i) => ({ visitDate: addDays('2026-04-06', i * 7) }))
  assert.equal(streakBonus([...run1, ...run2]), 30)
})

test('totalPoints는 첫 방문 보너스 20점을 통산에만 더한다', () => {
  const one = [base]
  assert.equal(totalPoints(one, { includeFirstVisitBonus: true }), 30)
  assert.equal(totalPoints(one, { includeFirstVisitBonus: false }), 10)
})

test('방문이 없으면 첫 방문 보너스도 없다', () => {
  assert.equal(totalPoints([], { includeFirstVisitBonus: true }), 0)
})

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`)
  return new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}
