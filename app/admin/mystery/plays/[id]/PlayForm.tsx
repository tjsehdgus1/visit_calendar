'use client'

import { useActionState, useState } from 'react'
import { updatePlayAction, type PlayFormState } from '../actions'

type Props = {
  play: { id: string; rating: number; review: string | null; playedOn: string; playersText: string | null; visitId: string | null }
  today: string
}

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand'

/** 플레이 기록 수정 (호스트). 방문에 붙은 기록은 날짜·함께한 사람이 방문을 따르므로 별점·후기만 고친다 */
export default function PlayForm({ play, today }: Props) {
  const [state, action, pending] = useActionState<PlayFormState, FormData>(updatePlayAction, {})
  const [rating, setRating] = useState(play.rating)
  const linked = Boolean(play.visitId)

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 shadow-warm">
      <input type="hidden" name="id" value={play.id} />

      {linked ? (
        <p className="text-xs text-ink-soft">
          방문 기록에 붙은 플레이입니다. 날짜와 함께한 사람은 방문 기록을 따릅니다 ({play.playedOn}).
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">플레이 날짜</span>
            <input type="date" name="playedOn" defaultValue={play.playedOn} max={today} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">함께한 사람 (쉼표로 구분)</span>
            <input name="playersText" defaultValue={play.playersText ?? ''} maxLength={200} className={inputClass} />
          </label>
        </>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">별점</span>
        <div className="flex gap-1" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex-1">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span
                aria-label={`${n}점`}
                className={`block h-11 cursor-pointer rounded-xl border border-line bg-card text-center text-xl leading-[2.75rem] transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${
                  n <= rating ? 'opacity-100' : 'opacity-30'
                }`}
              >
                ⭐
              </span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">한줄 후기</span>
        <input name="review" defaultValue={play.review ?? ''} maxLength={200} className={inputClass} />
      </label>

      <button
        disabled={pending}
        className="h-11 rounded-xl bg-cta text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? '저장 중…' : '저장'}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-sm text-brand-deep">
          {state.saved}
        </p>
      )}
    </form>
  )
}
