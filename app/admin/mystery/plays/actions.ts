'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireHost } from '@/lib/auth/guard'
import { mysteryPlayEditSchema } from '@/lib/validation'
import { deletePlay, updatePlay } from '@/lib/mystery'

export type PlayFormState = { error?: string; saved?: string }

function revalidate(gameId: string) {
  revalidatePath('/mystery')
  revalidatePath(`/mystery/${gameId}`)
  revalidatePath('/admin/mystery')
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
