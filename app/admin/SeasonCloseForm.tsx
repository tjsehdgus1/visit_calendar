'use client'

import { useActionState } from 'react'
import { closeSeasonAction, type SeasonState } from './season-actions'

export default function SeasonCloseForm({ seasonId, seasonName }: { seasonId: string; seasonName: string }) {
  const [state, action, pending] = useActionState<SeasonState, FormData>(closeSeasonAction, {})

  return (
    <form action={action} className="rounded-xl border p-3">
      <input type="hidden" name="seasonId" value={seasonId} />
      <p className="text-sm">{seasonName} 진행 중</p>
      <button disabled={pending} className="mt-2 w-full rounded-lg border border-red-600 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">
        {pending ? '마감 중…' : '시즌 마감하기'}
      </button>
      <p className="mt-1 text-xs text-neutral-500">마감하면 순위가 박제되고 되돌릴 수 없습니다.</p>
      {state.message && <p className="mt-2 text-sm font-semibold text-green-700">{state.message}</p>}
      {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
