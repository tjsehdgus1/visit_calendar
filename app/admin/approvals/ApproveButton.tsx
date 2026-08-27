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
          className="h-12 w-full rounded-xl bg-cta font-semibold text-white transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none disabled:opacity-50"
        >
          {pending ? '승인 중…' : '승인'}
        </button>
      </form>
      {state.messages && state.messages.length > 0 && (
        <p className="mt-2 rounded-xl bg-gold-soft px-3 py-2 text-sm font-semibold text-amber-900">{state.messages.join(' ')}</p>
      )}
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
    </div>
  )
}
