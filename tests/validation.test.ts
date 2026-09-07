import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PASSWORD_MIN, signupSchema, createUserSchema } from '../lib/validation'

test('비밀번호 최소 길이는 4자 (숫자 4자리 허용)', () => {
  assert.equal(PASSWORD_MIN, 4)
  const ok = createUserSchema.safeParse({ loginId: 'minsu', nickname: '민수', password: '2430' })
  assert.ok(ok.success)
  const short = createUserSchema.safeParse({ loginId: 'minsu', nickname: '민수', password: '243' })
  assert.ok(!short.success)
  assert.match(short.success ? '' : short.error.issues[0].message, /4자 이상/)
})

test('가입 스키마도 같은 비밀번호 규칙을 쓴다', () => {
  const r = signupSchema.safeParse({ inviteCode: 'ABCD2345', loginId: 'minsu', nickname: '민수', password: '2430' })
  assert.ok(r.success)
})

test('회원 추가: 아이디 규칙·닉네임 필수', () => {
  const badId = createUserSchema.safeParse({ loginId: '민수', nickname: '민수', password: '2430' })
  assert.ok(!badId.success)
  const noNick = createUserSchema.safeParse({ loginId: 'minsu', nickname: '  ', password: '2430' })
  assert.ok(!noNick.success)
  const trimmed = createUserSchema.safeParse({ loginId: ' minsu ', nickname: ' 민수 ', password: '2430' })
  assert.ok(trimmed.success && trimmed.data.loginId === 'minsu' && trimmed.data.nickname === '민수')
})
