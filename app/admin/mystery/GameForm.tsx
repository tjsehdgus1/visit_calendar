'use client'

import { useActionState } from 'react'
import { createGameAction, updateGameAction, type GameFormState } from './actions'

export type GameFormValues = {
  id?: string
  title?: string
  players?: number
  playTime?: string | null
  secretTalk?: boolean
  owner?: string | null
  description?: string | null
}

const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand'

/** 게임 추가·수정 폼 (호스트). id가 있으면 수정 */
export default function GameForm({ values = {} }: { values?: GameFormValues }) {
  const editing = Boolean(values.id)
  const [state, action, pending] = useActionState<GameFormState, FormData>(
    editing ? updateGameAction : createGameAction,
    {},
  )

  return (
    <form action={action} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 shadow-warm">
      {editing && <input type="hidden" name="id" value={values.id} />}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">게임명</span>
        <input name="title" defaultValue={values.title ?? ''} required maxLength={60} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <label className="flex w-24 shrink-0 flex-col gap-1">
          <span className="text-xs text-ink-soft">인원</span>
          <input
            name="players"
            type="number"
            inputMode="numeric"
            min={2}
            max={12}
            defaultValue={values.players ?? 5}
            required
            className={inputClass}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-ink-soft">예상 시간</span>
          <input name="playTime" defaultValue={values.playTime ?? ''} maxLength={30} placeholder="3시간" className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">소유자</span>
        <input name="owner" defaultValue={values.owner ?? ''} maxLength={20} placeholder="선동현" className={inputClass} />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="secretTalk" defaultChecked={values.secretTalk ?? false} className="h-5 w-5 accent-brand" />
        밀담 있음
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">소개·메모</span>
        <textarea
          name="description"
          defaultValue={values.description ?? ''}
          maxLength={2000}
          rows={4}
          className="rounded-xl border border-line bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </label>
      <button
        disabled={pending}
        className="h-11 rounded-xl bg-cta text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? '저장 중…' : editing ? '저장' : '게임 추가'}
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
