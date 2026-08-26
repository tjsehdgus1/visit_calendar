'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { visitSchema } from '@/lib/validation'
import { createVisit } from '@/lib/visits'
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

  // 제출자는 항상 참석자에 포함된다
  const attendeeIds = [...new Set([user.id, ...parsed.data.attendeeIds])]

  const photos = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (photos.length > MAX_PHOTOS) return { error: `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있습니다.` }
  if (photos.some((f) => f.size > MAX_BYTES)) return { error: '사진 한 장은 10MB 이하여야 합니다.' }

  let visitId: string
  try {
    visitId = await createVisit({ ...parsed.data, attendeeIds }, user)
  } catch {
    return { error: '기록 저장 중 문제가 발생했습니다.' }
  }

  for (const file of photos) {
    try {
      const saved = await savePhoto(Buffer.from(await file.arrayBuffer()))
      await prisma.visitPhoto.create({
        data: { visitId, uploadedById: user.id, ...saved },
      })
    } catch {
      // 사진 한 장이 실패해도 기록 자체는 남긴다
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/approvals')
  redirect('/?submitted=1')
}
