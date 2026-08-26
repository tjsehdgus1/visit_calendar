import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLockout, MAX_FAILURES, LOCK_MS } from '../lib/auth/lockout'

test('4회 실패까지는 잠기지 않는다', () => {
  const t = 0
  const lockout = createLockout(() => t)
  for (let i = 0; i < MAX_FAILURES - 1; i++) lockout.recordFailure('silver')
  assert.equal(lockout.isLocked('silver'), false)
})

test('5회 실패하면 잠긴다', () => {
  const t = 0
  const lockout = createLockout(() => t)
  for (let i = 0; i < MAX_FAILURES; i++) lockout.recordFailure('silver')
  assert.equal(lockout.isLocked('silver'), true)
})

test('잠긴 후 10분이 지나면 해제된다', () => {
  let t = 0
  const lockout = createLockout(() => t)
  for (let i = 0; i < MAX_FAILURES; i++) lockout.recordFailure('silver')
  assert.equal(lockout.isLocked('silver'), true)
  t += LOCK_MS + 1
  assert.equal(lockout.isLocked('silver'), false)
})

test('실패 1~4회 상태에서 10분이 지나면 카운터가 리셋된다', () => {
  let t = 0
  const lockout = createLockout(() => t)
  lockout.recordFailure('silver')
  lockout.recordFailure('silver')
  t += LOCK_MS + 1
  assert.equal(lockout.isLocked('silver'), false)
  // 리셋됐으므로 여기서부터 다시 MAX_FAILURES - 1번 실패해도 잠기지 않아야 한다
  for (let i = 0; i < MAX_FAILURES - 1; i++) lockout.recordFailure('silver')
  assert.equal(lockout.isLocked('silver'), false)
})

test('clear를 호출하면 즉시 해제된다', () => {
  const t = 0
  const lockout = createLockout(() => t)
  for (let i = 0; i < MAX_FAILURES; i++) lockout.recordFailure('silver')
  assert.equal(lockout.isLocked('silver'), true)
  lockout.clear('silver')
  assert.equal(lockout.isLocked('silver'), false)
})

test('키가 다르면 서로 영향을 주지 않는다', () => {
  const t = 0
  const lockout = createLockout(() => t)
  for (let i = 0; i < MAX_FAILURES; i++) lockout.recordFailure('silver')
  assert.equal(lockout.isLocked('silver'), true)
  assert.equal(lockout.isLocked('other'), false)
})
