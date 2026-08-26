import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titleFor } from '../lib/scoring/titles'

test('구간별 칭호를 반환한다', () => {
  assert.equal(titleFor(0).label, '잠깐손님')
  assert.equal(titleFor(49).label, '잠깐손님')
  assert.equal(titleFor(50).label, '눈도장')
  assert.equal(titleFor(150).label, '단골')
  assert.equal(titleFor(350).label, '터줏대감')
  assert.equal(titleFor(700).label, '이집사람')
  assert.equal(titleFor(1500).label, '세대주')
  assert.equal(titleFor(99999).label, '세대주')
})

test('다음 칭호와 그 문턱을 알려준다', () => {
  assert.deepEqual(titleFor(10).next, { label: '눈도장', min: 50 })
})

test('최고 칭호에서는 next가 null이다', () => {
  assert.equal(titleFor(2000).next, null)
})
