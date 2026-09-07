import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signupSchema, createUserSchema } from '../lib/validation'

test('비밀번호는 숫자 4자리만 허용', () => {
  assert.ok(createUserSchema.safeParse({ loginId: '민수', password: '2430' }).success)
  for (const bad of ['243', '24301', 'abcd', '24a0', ' 2430']) {
    const r = createUserSchema.safeParse({ loginId: '민수', password: bad })
    assert.ok(!r.success, `허용되면 안 됨: ${bad}`)
    assert.match(r.success ? '' : r.error.issues[0].message, /숫자 4자리/)
  }
})

test('이름은 한글·영문·숫자 2~20자, 앞뒤 공백 제거', () => {
  assert.ok(createUserSchema.safeParse({ loginId: '노성소', password: '2430' }).success)
  assert.ok(createUserSchema.safeParse({ loginId: 'minsu', password: '2430' }).success)
  const trimmed = createUserSchema.safeParse({ loginId: ' 선동현 ', password: '2430' })
  assert.ok(trimmed.success && trimmed.data.loginId === '선동현')
  for (const bad of ['김', '김 민수', '민수!', 'a'.repeat(21)]) {
    assert.ok(!createUserSchema.safeParse({ loginId: bad, password: '2430' }).success, `허용되면 안 됨: ${bad}`)
  }
})

test('초대코드 가입도 같은 이름·비밀번호 규칙을 쓴다 (닉네임 칸 없음)', () => {
  const ok = signupSchema.safeParse({ inviteCode: 'ABCD2345', loginId: '민수', password: '2430' })
  assert.ok(ok.success)
  assert.ok(!signupSchema.safeParse({ inviteCode: 'ABCD2345', loginId: '민수', password: '12345' }).success)
  assert.ok(!signupSchema.safeParse({ inviteCode: '', loginId: '민수', password: '2430' }).success)
})
