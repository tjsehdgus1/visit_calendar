'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { visitSchema, mysteryPlaySchema } from '@/lib/validation'
import { createVisit, grantBadgesForVisit } from '@/lib/visits'
import { savePhoto } from '@/lib/storage'

const MAX_PHOTOS = 10
const MAX_BYTES = 10 * 1024 * 1024

export type NewVisitState = { error?: string }

export async function submitVisit(
  _prev: NewVisitState,
  formData: FormData,
): Promise<NewVisitState> {
  const user = await requireUser()

  const parsed = visitSchema.safeParse({
    visitDate: formData.get('visitDate'),
    timeSlot: formData.get('timeSlot'),
    memo: formData.get('memo') || undefined,
    tagIds: formData.getAll('tagIds').map(String),
    attendeeIds: formData.getAll('attendeeIds').map(String),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // 손님은 본인이 항상 참석자에 포함된다.
  // 호스트(집주인)는 참석자·점수 대상이 아니다 — 온 사람만 골라 기록한다 (2026-08-26 사용자 확정)
  const attendeeIds =
    user.role === 'HOST'
      ? [...new Set(parsed.data.attendeeIds)]
      : [...new Set([user.id, ...parsed.data.attendeeIds])]
  if (attendeeIds.length === 0) return { error: '누가 왔는지 한 명 이상 선택해 주세요.' }

  // 머더미스터리 태그를 켰으면 게임·별점이 필수. 태그가 꺼져 있으면 플레이 입력은 무시한다 (설계서 §2)
  const murderTag = await prisma.tag.findUnique({ where: { slug: 'murder' }, select: { id: true } })
  let mysteryPlay: { gameId: string; rating: number; review?: string } | undefined
  if (murderTag && parsed.data.tagIds.includes(murderTag.id)) {
    const play = mysteryPlaySchema.safeParse({
      gameId: formData.get('mysteryGameId') || '',
      rating: formData.get('mysteryRating') || 0,
      review: formData.get('mysteryReview') || undefined,
    })
    if (!play.success) return { error: play.error.issues[0].message }
    const game = await prisma.mysteryGame.findFirst({ where: { id: play.data.gameId, active: true }, select: { id: true } })
    if (!game) return { error: '선택한 게임을 찾을 수 없습니다.' }
    mysteryPlay = play.data
  }

  const photos = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (photos.length > MAX_PHOTOS) return { error: `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있습니다.` }
  if (photos.some((f) => f.size > MAX_BYTES)) return { error: '사진 한 장은 10MB 이하여야 합니다.' }

  let visitId: string
  try {
    visitId = await createVisit({ ...parsed.data, attendeeIds, mysteryPlay }, user)
  } catch {
    return { error: '기록 저장 중 문제가 발생했습니다.' }
  }

  let savedPhotoCount = 0
  for (const file of photos) {
    try {
      const saved = await savePhoto(Buffer.from(await file.arrayBuffer()))
      await prisma.visitPhoto.create({
        data: { visitId, uploadedById: user.id, ...saved },
      })
      savedPhotoCount++
    } catch (e) {
      // 사진 한 장이 실패해도 기록 자체는 남긴다
      console.error('[사진 저장 실패]', e)
    }
  }

  // 호스트 제출은 즉시 승인되므로, 사진 저장이 끝난 뒤에 뱃지를 판정해야
  // PHOTO_30처럼 사진 수에 걸린 뱃지를 그 순간에 놓치지 않는다.
  if (user.role === 'HOST') await grantBadgesForVisit(visitId)

  revalidatePath('/')
  revalidatePath('/admin/approvals')
  revalidatePath('/mystery')
  const photosAllFailed = photos.length > 0 && savedPhotoCount === 0
  redirect(photosAllFailed ? '/?submitted=1&photos=failed' : '/?submitted=1')
}
