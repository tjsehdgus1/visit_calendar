'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { requireHost } from '@/lib/auth/guard'
import { mysteryGameSchema } from '@/lib/validation'
import { createGame, setGameActive, updateGame, type GameInput } from '@/lib/mystery'

export type GameFormState = { error?: string; saved?: string }

function parseGame(formData: FormData): { ok: true; data: GameInput } | { ok: false; error: string } {
  const parsed = mysteryGameSchema.safeParse({
    title: formData.get('title'),
    players: formData.get('players'),
    playTime: formData.get('playTime') || undefined,
    secretTalk: formData.get('secretTalk') === 'on',
    owner: formData.get('owner') || undefined,
    description: formData.get('description') || undefined,
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  return { ok: true, data: parsed.data }
}

function revalidate() {
  revalidatePath('/mystery')
  revalidatePath('/admin/mystery')
  revalidatePath('/visits/new')
}

export async function createGameAction(_prev: GameFormState, formData: FormData): Promise<GameFormState> {
  await requireHost()
  const r = parseGame(formData)
  if (!r.ok) return { error: r.error }
  try {
    await createGame(r.data)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { error: '같은 이름의 게임이 이미 있습니다.' }
    return { error: '저장 중 문제가 발생했습니다.' }
  }
  revalidate()
  return { saved: `${r.data.title} 추가됨` }
}

export async function updateGameAction(_prev: GameFormState, formData: FormData): Promise<GameFormState> {
  await requireHost()
  const id = String(formData.get('id') ?? '')
  const r = parseGame(formData)
  if (!r.ok) return { error: r.error }
  try {
    await updateGame(id, r.data)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { error: '같은 이름의 게임이 이미 있습니다.' }
    return { error: '저장 중 문제가 발생했습니다.' }
  }
  revalidate()
  revalidatePath(`/mystery/${id}`)
  return { saved: '저장됨' }
}

/** 삭제 대신 숨김/복구 (과거 플레이 기록을 지키기 위해) */
export async function toggleGameActive(formData: FormData) {
  await requireHost()
  const id = String(formData.get('id') ?? '')
  const active = formData.get('active') === 'true'
  await setGameActive(id, active)
  revalidate()
  revalidatePath(`/mystery/${id}`)
  redirect('/admin/mystery')
}
