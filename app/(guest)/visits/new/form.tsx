'use client'

import { useActionState, useState } from 'react'
import { submitVisit, type NewVisitState } from './actions'
import MysteryPlayFields, { type PickerGame } from './MysteryPlayFields'

type Props = {
  tags: { id: string; label: string; emoji: string }[]
  members: { id: string; nickname: string }[]
  today: string
  /** 캘린더에서 날짜를 눌러 진입한 경우 그 날짜 (없으면 오늘) */
  defaultDate: string
  isHost: boolean
  /** 머더미스터리 태그 id (없으면 플레이 입력 칸을 보이지 않음) */
  murderTagId: string | null
  games: PickerGame[]
}

const SLOTS = [
  { value: 'DAY', label: '낮' },
  { value: 'EVENING', label: '저녁' },
  { value: 'OVERNIGHT', label: '밤새' },
]

export default function NewVisitForm({ tags, members, today, defaultDate, isHost, murderTagId, games }: Props) {
  const [state, action, pending] = useActionState<NewVisitState, FormData>(submitVisit, {})
  const [murderOn, setMurderOn] = useState(false)

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 font-display text-2xl text-ink">놀러온 날 기록하기</h1>

      <form action={action} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink">언제</span>
          <input
            type="date"
            name="visitDate"
            defaultValue={defaultDate}
            max={today}
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">얼마나 있었나</legend>
          <div className="flex gap-2">
            {SLOTS.map((s, i) => (
              <label key={s.value} className="flex-1">
                <input type="radio" name="timeSlot" value={s.value} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block h-11 cursor-pointer rounded-xl border border-line bg-card text-center leading-[2.75rem] transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none peer-checked:border-cta peer-checked:bg-cta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">뭐 했나</legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id}>
                <input
                  type="checkbox"
                  name="tagIds"
                  value={t.id}
                  className="peer sr-only"
                  onChange={t.id === murderTagId ? (e) => setMurderOn(e.target.checked) : undefined}
                />
                <span className="block min-h-11 cursor-pointer rounded-full border border-line bg-card px-4 py-2 text-sm transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none peer-checked:border-cta peer-checked:bg-cta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                  {t.emoji} {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {murderOn && murderTagId && <MysteryPlayFields games={games} />}

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">
            {isHost ? (
              <>온 사람 <span className="font-normal text-ink-soft">(누가 왔는지 선택하세요)</span></>
            ) : (
              <>같이 온 사람 <span className="font-normal text-ink-soft">(혼자면 비워두세요)</span></>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label key={m.id}>
                <input type="checkbox" name="attendeeIds" value={m.id} className="peer sr-only" />
                <span className="block min-h-11 cursor-pointer rounded-full border border-line bg-card px-4 py-2 text-sm transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none peer-checked:border-cta peer-checked:bg-cta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                  {m.nickname}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink">한 줄 메모</span>
          <input
            name="memo"
            maxLength={200}
            placeholder="라면 3개 끓임"
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink">사진 (최대 10장)</span>
          <input type="file" name="photos" accept="image/*" multiple className="text-sm text-ink-soft" />
        </label>

        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-xl bg-cta font-bold text-white transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none disabled:opacity-50"
        >
          {pending ? '올리는 중…' : '기록 올리기'}
        </button>
      </form>
    </main>
  )
}
