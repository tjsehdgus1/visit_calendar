import { test } from 'node:test'
import assert from 'node:assert/strict'
import { earnedBadgeCodes, seasonKeyFor, type BadgeContext } from '../lib/scoring/badges'
import type { ScorableVisit } from '../lib/scoring/points'

function visit(over: Partial<ScorableVisit> = {}): ScorableVisit {
  return {
    visitDate: '2026-08-26',
    timeSlot: 'DAY',
    hasMemo: false,
    photoCount: 0,
    attendeeCount: 1,
    ...over,
  }
}

function ctx(over: Partial<BadgeContext> = {}): BadgeContext {
  return {
    visits: [],
    visitTagSlugs: [],
    activeTagSlugs: ['meal', 'drink'],
    uploadedPhotoCount: 0,
    authoredMemoCount: 0,
    ...over,
  }
}

test('방문이 없으면 아무 뱃지도 없다', () => {
  assert.deepEqual(earnedBadgeCodes(ctx()), [])
})

test('첫 방문에 FIRST_VISIT', () => {
  const got = earnedBadgeCodes(ctx({ visits: [visit()], visitTagSlugs: [[]] }))
  assert.ok(got.includes('FIRST_VISIT'))
})

test('10회·50회 문턱', () => {
  const nine = ctx({ visits: Array.from({ length: 9 }, () => visit()) })
  assert.ok(!earnedBadgeCodes(nine).includes('VISIT_10'))

  const ten = ctx({ visits: Array.from({ length: 10 }, () => visit()) })
  assert.ok(earnedBadgeCodes(ten).includes('VISIT_10'))
  assert.ok(!earnedBadgeCodes(ten).includes('VISIT_50'))

  const fifty = ctx({ visits: Array.from({ length: 50 }, () => visit()) })
  assert.ok(earnedBadgeCodes(fifty).includes('VISIT_50'))
})

test('밤샘 3회에 OVERNIGHT_3', () => {
  const two = ctx({ visits: [visit({ timeSlot: 'OVERNIGHT' }), visit({ timeSlot: 'OVERNIGHT' })] })
  assert.ok(!earnedBadgeCodes(two).includes('OVERNIGHT_3'))

  const three = ctx({ visits: Array.from({ length: 3 }, () => visit({ timeSlot: 'OVERNIGHT' })) })
  assert.ok(earnedBadgeCodes(three).includes('OVERNIGHT_3'))
})

test('4주 연속에 STREAK_4W', () => {
  const dates = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']
  const c = ctx({ visits: dates.map((d) => visit({ visitDate: d })) })
  assert.ok(earnedBadgeCodes(c).includes('STREAK_4W'))
})

test('활성 태그를 모두 경험해야 ALL_TAGS', () => {
  const partial = ctx({ visits: [visit()], visitTagSlugs: [['meal']] })
  assert.ok(!earnedBadgeCodes(partial).includes('ALL_TAGS'))

  const full = ctx({ visits: [visit(), visit()], visitTagSlugs: [['meal'], ['drink']] })
  assert.ok(earnedBadgeCodes(full).includes('ALL_TAGS'))
})

test('비활성 태그는 ALL_TAGS 조건에 포함되지 않는다', () => {
  const c = ctx({
    visits: [visit()],
    visitTagSlugs: [['meal', 'drink']],
    activeTagSlugs: ['meal', 'drink'],
  })
  assert.ok(earnedBadgeCodes(c).includes('ALL_TAGS'))
})

test('사진 30장에 PHOTO_30, 메모 20건에 MEMO_20', () => {
  const c = ctx({ visits: [visit()], uploadedPhotoCount: 30, authoredMemoCount: 20 })
  const got = earnedBadgeCodes(c)
  assert.ok(got.includes('PHOTO_30'))
  assert.ok(got.includes('MEMO_20'))
})

test('혼자 5회에 SOLO_5, 4명 이상 5회에 CROWD_5', () => {
  const solo = ctx({ visits: Array.from({ length: 5 }, () => visit({ attendeeCount: 1 })) })
  assert.ok(earnedBadgeCodes(solo).includes('SOLO_5'))

  const crowd = ctx({ visits: Array.from({ length: 5 }, () => visit({ attendeeCount: 4 })) })
  assert.ok(earnedBadgeCodes(crowd).includes('CROWD_5'))
  assert.ok(!earnedBadgeCodes(crowd).includes('SOLO_5'))
})

test('시즌 뱃지는 여기서 판정하지 않는다', () => {
  const many = ctx({ visits: Array.from({ length: 50 }, () => visit()) })
  const got = earnedBadgeCodes(many)
  assert.ok(!got.includes('SEASON_CHAMPION'))
  assert.ok(!got.includes('TAG_KING'))
})

test('seasonKeyFor: 비시즌 뱃지는 "-", 시즌 뱃지는 규칙대로', () => {
  assert.equal(seasonKeyFor('VISIT_10'), '-')
  assert.equal(seasonKeyFor('SEASON_CHAMPION', 'season1'), 'season1')
  assert.equal(seasonKeyFor('TAG_KING', 'season1', 'meal'), 'season1:meal')
})

test('seasonKeyFor: TAG_KING은 부문마다 다른 키를 만든다', () => {
  // 한 시즌에 여러 부문을 석권해도 유니크 제약에 막히지 않아야 한다
  assert.notEqual(
    seasonKeyFor('TAG_KING', 'season1', 'meal'),
    seasonKeyFor('TAG_KING', 'season1', 'drink'),
  )
})

test('seasonKeyFor: 시즌 뱃지에 seasonId가 없으면 예외', () => {
  assert.throws(() => seasonKeyFor('SEASON_CHAMPION'))
  assert.throws(() => seasonKeyFor('TAG_KING', 'season1'))
})
