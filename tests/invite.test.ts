import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateInviteCode, INVITE_ALPHABET } from '../lib/invite'

test('초대코드는 8자다', () => {
  assert.equal(generateInviteCode().length, 8)
})

test('초대코드에 혼동 문자(0 O 1 I L)가 없다', () => {
  for (let i = 0; i < 200; i++) {
    assert.ok(!/[0O1IL]/.test(generateInviteCode()))
  }
})

test('알파벳은 허용 문자만 담는다', () => {
  assert.ok(!/[0O1IL]/.test(INVITE_ALPHABET))
  assert.ok(INVITE_ALPHABET.length >= 20)
})

test('연속 생성 시 사실상 중복되지 않는다', () => {
  const set = new Set(Array.from({ length: 500 }, () => generateInviteCode()))
  assert.equal(set.size, 500)
})
