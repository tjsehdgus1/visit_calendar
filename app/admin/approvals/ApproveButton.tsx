'use client'

import { useActionState } from 'react'
import { approve, type ApproveState } from './actions'

export default function ApproveButton({ visitId }: { visitId: string }) {
  const [state, action, pending] = useActionState<ApproveState, FormData>(approve, {})

  return (
    <div className="flex-1">
      <form action={action}>
        <input type="hidden" name="visitId" value={visitId} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {pending ? '승인 중…' : '승인'}
        </button>
      </form>
      {state.messages && state.messages.length > 0 && (
        <p className="mt-2 text-sm text-emerald-600">{state.messages.join(' ')}</p>
      )}
      {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  )
}
