import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankRows } from '../lib/ranking'

test('점수 내림차순으로 순위를 매긴다', () => {
  const rows = rankRows([
    { userId: 'a', nickname: 'A', points: 10, visitCount: 1 },
    { userId: 'b', nickname: 'B', points: 30, visitCount: 3 },
    { userId: 'c', nickname: 'C', points: 20, visitCount: 2 },
  ])
  assert.deepEqual(rows.map((r) => r.nickname), ['B', 'C', 'A'])
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3])
})

test('동점은 공동 순위이며 다음 순위를 건너뛴다', () => {
  const rows = rankRows([
    { userId: 'a', nickname: 'A', points: 30, visitCount: 3 },
    { userId: 'b', nickname: 'B', points: 30, visitCount: 3 },
    { userId: 'c', nickname: 'C', points: 10, visitCount: 1 },
  ])
  assert.deepEqual(rows.map((r) => r.rank), [1, 1, 3])
})

test('0점인 사람도 목록에 남는다', () => {
  const rows = rankRows([{ userId: 'a', nickname: 'A', points: 0, visitCount: 0 }])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].rank, 1)
})

test('빈 목록은 빈 배열', () => {
  assert.deepEqual(rankRows([]), [])
})
