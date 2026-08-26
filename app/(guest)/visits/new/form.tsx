'use client'

import { useActionState } from 'react'
import { submitVisit, type NewVisitState } from './actions'

type Props = {
  tags: { id: string; label: string; emoji: string }[]
  members: { id: string; nickname: string }[]
  today: string
}

const SLOTS = [
  { value: 'DAY', label: '낮' },
  { value: 'EVENING', label: '저녁' },
  { value: 'OVERNIGHT', label: '밤새' },
]

export default function NewVisitForm({ tags, members, today }: Props) {
  const [state, action, pending] = useActionState<NewVisitState, FormData>(submitVisit, {})

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">놀러온 날 기록하기</h1>

      <form action={action} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">언제</span>
          <input type="date" name="visitDate" defaultValue={today} max={today} required className="rounded-lg border px-3 py-3" />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">얼마나 있었나</legend>
          <div className="flex gap-2">
            {SLOTS.map((s, i) => (
              <label key={s.value} className="flex-1">
                <input type="radio" name="timeSlot" value={s.value} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block cursor-pointer rounded-lg border py-3 text-center peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">뭐 했나</legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id}>
                <input type="checkbox" name="tagIds" value={t.id} className="peer sr-only" />
                <span className="block cursor-pointer rounded-full border px-4 py-2 text-sm peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {t.emoji} {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">
            같이 온 사람 <span className="font-normal text-neutral-500">(혼자면 비워두세요)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label key={m.id}>
                <input type="checkbox" name="attendeeIds" value={m.id} className="peer sr-only" />
                <span className="block cursor-pointer rounded-full border px-4 py-2 text-sm peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {m.nickname}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">한 줄 메모</span>
          <input name="memo" maxLength={200} placeholder="라면 3개 끓임" className="rounded-lg border px-3 py-3" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">사진 (최대 10장)</span>
          <input type="file" name="photos" accept="image/*" multiple className="text-sm" />
        </label>

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="rounded-lg bg-neutral-900 py-4 font-semibold text-white disabled:opacity-50">
          {pending ? '올리는 중…' : '기록 올리기'}
        </button>
      </form>
    </main>
  )
}
