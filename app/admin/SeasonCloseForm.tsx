'use client'

import { useActionState } from 'react'
import { closeSeasonAction, type SeasonState } from './season-actions'

export default function SeasonCloseForm({ seasonId, seasonName }: { seasonId: string; seasonName: string }) {
  const [state, action, pending] = useActionState<SeasonState, FormData>(closeSeasonAction, {})

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-3 shadow-warm">
      <input type="hidden" name="seasonId" value={seasonId} />
      <p className="text-sm text-ink">{seasonName} 진행 중</p>
      <button disabled={pending} className="mt-2 h-11 w-full rounded-xl border border-danger text-sm font-semibold text-danger transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none disabled:opacity-50">
        {pending ? '마감 중…' : '시즌 마감하기'}
      </button>
      <p className="mt-1 text-xs text-ink-soft">마감하면 순위가 박제되고 되돌릴 수 없습니다.</p>
      {state.message && <p className="mt-2 text-sm font-semibold text-ok">{state.message}</p>}
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  )
}
