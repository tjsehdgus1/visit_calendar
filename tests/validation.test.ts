import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signupSchema, createUserSchema, mysteryPlayEditSchema, mysteryStandalonePlaySchema } from '../lib/validation'

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

test('플레이 기록 수정: 날짜는 YYYY-MM-DD (검사식 오타로 모든 날짜가 거절되던 문제 회귀 방지)', () => {
  assert.ok(mysteryPlayEditSchema.safeParse({ rating: 4, playedOn: '2026-09-04' }).success)
  assert.ok(mysteryPlayEditSchema.safeParse({ rating: 4 }).success) // 방문에 붙은 기록은 날짜 칸이 없다
  for (const bad of ['2026/09/04', '20260904', 'dddd-dd-dd']) {
    assert.ok(!mysteryPlayEditSchema.safeParse({ rating: 4, playedOn: bad }).success, `허용되면 안 됨: ${bad}`)
  }
})

test('단독 플레이 기록: 게임·날짜·별점 필수, 함께한 사람·후기는 선택', () => {
  const ok = mysteryStandalonePlaySchema.safeParse({ gameId: 'g1', rating: '5', playedOn: '2026-09-27', playersText: ' 동현, 성소 ' })
  assert.ok(ok.success && ok.data.rating === 5 && ok.data.playersText === '동현, 성소')
  assert.ok(mysteryStandalonePlaySchema.safeParse({ gameId: 'g1', rating: 3, playedOn: '2026-09-27' }).success)
  assert.ok(!mysteryStandalonePlaySchema.safeParse({ gameId: '', rating: 3, playedOn: '2026-09-27' }).success)
  assert.ok(!mysteryStandalonePlaySchema.safeParse({ gameId: 'g1', rating: 0, playedOn: '2026-09-27' }).success)
  assert.ok(!mysteryStandalonePlaySchema.safeParse({ gameId: 'g1', rating: 3, playedOn: '' }).success)
})
