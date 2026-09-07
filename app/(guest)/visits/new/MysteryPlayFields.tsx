'use client'

import { useState } from 'react'

export type PickerGame = { id: string; title: string; players: number; played: boolean }

const inputClass = 'h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand'

/** 머더미스터리 태그를 켰을 때 열리는 게임·별점·후기 입력 (설계서 §2) */
export default function MysteryPlayFields({ games }: { games: PickerGame[] }) {
  const [rating, setRating] = useState(0)
  const fresh = games.filter((g) => !g.played)
  const played = games.filter((g) => g.played)

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-brand-soft bg-brand-soft/40 p-3">
      <legend className="px-1 text-sm font-semibold text-brand-deep">🔍 머더미스터리</legend>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">어떤 게임?</span>
        <select name="mysteryGameId" required defaultValue="" className={inputClass}>
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
        {games.length === 0 && (
          <span className="text-xs text-danger">서재에 게임이 없습니다. 호스트가 먼저 등록해야 합니다.</span>
        )}
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">별점</span>
        <div className="flex gap-1" role="radiogroup" aria-label="별점">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="flex-1">
              <input
                type="radio"
                name="mysteryRating"
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
        <input name="mysteryReview" maxLength={200} placeholder="반전이 미쳤다" className={inputClass} />
      </label>
    </fieldset>
  )
}
