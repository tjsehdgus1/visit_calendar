'use client'

import { useActionState, useState } from 'react'
import { createPlayAction, updatePlayAction, type PlayFormState } from './actions'

type PickerGame = { id: string; title: string; players: number; played: boolean }

type Props = {
  /** 고칠 기록. 없으면 방문 기록 없이 새로 남기는 플레이 (2026-09-27) */
  play?: { id: string; rating: number; review: string | null; playedOn: string; playersText: string | null; visitId: string | null }
  /** 새 기록일 때 고를 게임 (활성 게임, 안 한 게임 먼저) */
  games?: PickerGame[]
  defaultGameId?: string
  today: string
}

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand'

/**
 * 플레이 기록 폼 (호스트) — 새 기록과 수정을 함께 쓴다.
 * 방문에 붙은 기록은 날짜·함께한 사람이 방문을 따르므로 별점·후기만 고친다
 */
export default function PlayForm({ play, games = [], defaultGameId, today }: Props) {
  const [state, action, pending] = useActionState<PlayFormState, FormData>(play ? updatePlayAction : createPlayAction, {})
  const [rating, setRating] = useState(play?.rating ?? 0)
  const linked = Boolean(play?.visitId)
  const fresh = games.filter((g) => !g.played)
  const played = games.filter((g) => g.played)

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-3 shadow-warm">
      {play ? (
        <input type="hidden" name="id" value={play.id} />
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-soft">어떤 게임?</span>
          <select
            name="gameId"
            required
            defaultValue={games.some((g) => g.id === defaultGameId) ? defaultGameId : ''}
            className={inputClass}
          >
            <option value="" disabled>
              게임을 골라 주세요
            </option>
            {fresh.length > 0 && (
              <optgroup label="아직 안 한 게임">
                {fresh.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.players}인)
                  </option>
                ))}
              </optgroup>
            )}
            {played.length > 0 && (
              <optgroup label="해 본 게임">
                {played.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.players}인)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}

      {linked ? (
        <p className="text-xs text-ink-soft">
          방문 기록에 붙은 플레이입니다. 날짜와 함께한 사람은 방문 기록을 따릅니다 ({play?.playedOn}).
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">플레이 날짜</span>
            <input type="date" name="playedOn" defaultValue={play?.playedOn ?? today} max={today} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-soft">함께한 사람 (쉼표로 구분)</span>
            <input
              name="playersText"
              defaultValue={play?.playersText ?? ''}
              maxLength={200}
              placeholder="예: 동현, 성소, 혜민"
              className={inputClass}
            />
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
                required
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
        <input name="review" defaultValue={play?.review ?? ''} maxLength={200} placeholder="반전이 미쳤다" className={inputClass} />
      </label>

      <button
        disabled={pending}
        className="h-11 rounded-xl bg-cta text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? '저장 중…' : play ? '저장' : '기록 남기기'}
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
