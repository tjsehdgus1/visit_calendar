'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireHost } from '@/lib/auth/guard'
import { todayKst } from '@/lib/date'
import { mysteryPlayEditSchema, mysteryStandalonePlaySchema } from '@/lib/validation'
import { createStandalonePlay, deletePlay, updatePlay } from '@/lib/mystery'

export type PlayFormState = { error?: string; saved?: string }

function revalidate(gameId: string) {
  revalidatePath('/mystery')
  revalidatePath(`/mystery/${gameId}`)
  revalidatePath('/admin/mystery')
  revalidatePath('/visits/new') // 기록 폼의 "아직 안 한 게임" 묶음이 바뀐다
}

/** 방문 기록 없이 플레이만 남긴다 (호스트, 2026-09-27) */
export async function createPlayAction(_prev: PlayFormState, formData: FormData): Promise<PlayFormState> {
  const user = await requireHost()
  const parsed = mysteryStandalonePlaySchema.safeParse({
    gameId: formData.get('gameId') || '',
    rating: formData.get('rating') || 0,
    review: formData.get('review') || undefined,
    playedOn: formData.get('playedOn') || '',
    playersText: formData.get('playersText') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.playedOn > todayKst()) return { error: '아직 오지 않은 날짜로는 기록할 수 없습니다.' }

  let gameId: string
  try {
    const r = await createStandalonePlay(parsed.data, user.id)
    if (!r) return { error: '선택한 게임을 찾을 수 없습니다.' }
    gameId = r.gameId
  } catch {
    return { error: '저장 중 문제가 발생했습니다.' }
  }
  revalidate(gameId)
  redirect(`/mystery/${gameId}`)
}

export async function updatePlayAction(_prev: PlayFormState, formData: FormData): Promise<PlayFormState> {
  await requireHost()
  const id = String(formData.get('id') ?? '')
  const parsed = mysteryPlayEditSchema.safeParse({
    rating: formData.get('rating') || 0,
    review: formData.get('review') || undefined,
    playedOn: formData.get('playedOn') || undefined,
    playersText: formData.get('playersText') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (parsed.data.playedOn && parsed.data.playedOn > todayKst()) return { error: '아직 오지 않은 날짜로는 기록할 수 없습니다.' }
  try {
    const r = await updatePlay(id, parsed.data)
    if (!r) return { error: '기록을 찾을 수 없습니다.' }
    revalidate(r.gameId)
  } catch {
    return { error: '저장 중 문제가 발생했습니다.' }
  }
  return { saved: '저장됨' }
}

export async function deletePlayAction(formData: FormData) {
  await requireHost()
  const id = String(formData.get('id') ?? '')
  const r = await deletePlay(id)
  revalidate(r.gameId)
  redirect(`/mystery/${r.gameId}`)
}
