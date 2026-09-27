import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeDay } from '../lib/calendar'

test('같은 날 모임이 두 번이어도 같은 사람 이름은 한 번만', () => {
  const s = summarizeDay([
    { emojis: ['🍚'], nicknames: ['박웃기'] },
    { emojis: ['🍚', '🍺'], nicknames: ['박웃기'] },
  ])
  assert.deepEqual(s.lines, ['박웃기'])
  assert.deepEqual(s.emojis, ['🍚', '🍺'])
})

test('두 명까지는 한 줄에 한 명씩', () => {
  assert.deepEqual(summarizeDay([{ emojis: [], nicknames: ['민수', '지영'] }]).lines, ['민수', '지영'])
})

test('세 명 이상이면 둘째 줄은 외 N명, 전체 이름은 names에 남는다', () => {
  const s = summarizeDay([
    { emojis: ['🍺'], nicknames: ['민수', '지영'] },
    { emojis: ['🎲'], nicknames: ['철수', '민수'] },
  ])
  assert.deepEqual(s.lines, ['민수', '외 2명'])
  assert.deepEqual(s.names, ['민수', '지영', '철수'])
})

test('이모지는 중복 없이 최대 두 개', () => {
  const s = summarizeDay([{ emojis: ['🍚', '🍺', '🎲'], nicknames: ['민수'] }, { emojis: ['🍚'], nicknames: [] }])
  assert.deepEqual(s.emojis, ['🍚', '🍺'])
})
