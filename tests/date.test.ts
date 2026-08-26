import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toDateOnly, fromDateOnly, isoWeekKey, consecutiveWeekRuns, daysUntil } from '../lib/date'

test('toDateOnly는 UTC 자정 Date를 만든다', () => {
  const d = toDateOnly('2026-08-26')
  assert.equal(d.toISOString(), '2026-08-26T00:00:00.000Z')
})

test('fromDateOnly는 toDateOnly의 역함수다', () => {
  assert.equal(fromDateOnly(toDateOnly('2026-01-01')), '2026-01-01')
  assert.equal(fromDateOnly(toDateOnly('2026-12-31')), '2026-12-31')
})

test('isoWeekKey는 ISO 주차를 반환한다', () => {
  // 2026-08-26은 수요일, ISO 35주차
  assert.equal(isoWeekKey('2026-08-26'), '2026-W35')
  // ISO 주는 월요일 시작 — 일요일은 직전 주에 속한다
  assert.equal(isoWeekKey('2026-08-30'), '2026-W35') // 일요일
  assert.equal(isoWeekKey('2026-08-31'), '2026-W36') // 월요일
})

test('isoWeekKey는 연말연시 경계에서 ISO 규칙을 따른다', () => {
  // 2027-01-01은 금요일 → 2026-W53에 속한다
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53')
})

test('consecutiveWeekRuns는 연속 구간 길이를 반환한다', () => {
  assert.deepEqual(consecutiveWeekRuns(['2026-W01', '2026-W02', '2026-W03']), [3])
  assert.deepEqual(consecutiveWeekRuns(['2026-W01', '2026-W03']), [1, 1])
  assert.deepEqual(consecutiveWeekRuns([]), [])
})

test('consecutiveWeekRuns는 중복을 제거하고 정렬한다', () => {
  assert.deepEqual(consecutiveWeekRuns(['2026-W02', '2026-W01', '2026-W02']), [2])
})

test('consecutiveWeekRuns는 연도 경계를 넘어 이어진다', () => {
  // 2026년은 ISO 53주까지 있다
  assert.deepEqual(consecutiveWeekRuns(['2026-W52', '2026-W53', '2027-W01']), [3])
})

test('daysUntil은 목표 시각까지 남은 일수를 올림해 반환한다', () => {
  const target = new Date(Date.now() + 3 * 86_400_000 + 1000) // 3일 하고 1초 뒤
  assert.equal(daysUntil(target), 4)
})

test('daysUntil은 이미 지난 시각이면 음수를 반환한다', () => {
  const target = new Date(Date.now() - 86_400_000)
  assert.equal(daysUntil(target), -1)
})
