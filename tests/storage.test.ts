import { test } from 'node:test'
import assert from 'node:assert/strict'
import { photoRelPath, assertSafeRelPath } from '../lib/storage'

test('사진 경로는 연/월 폴더로 나뉜다', () => {
  assert.equal(photoRelPath(new Date('2026-08-26T00:00:00Z'), 'abc123'), '2026/08/abc123.webp')
  assert.equal(photoRelPath(new Date('2026-01-05T00:00:00Z'), 'x'), '2026/01/x.webp')
})

test('상위 경로 탈출을 막는다', () => {
  assert.throws(() => assertSafeRelPath('../../etc/passwd'))
  assert.throws(() => assertSafeRelPath('/etc/passwd'))
  assert.throws(() => assertSafeRelPath('2026/../../secret.webp'))
  assert.doesNotThrow(() => assertSafeRelPath('2026/08/abc.webp'))
})
