'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { approveVisit, rejectVisit } from '@/lib/visits'

export type ApproveState = { messages?: string[]; error?: string }

/**
 * useActionState 계약(_prev, formData)에 맞춘다.
 * 승인 시 획득한 뱃지를 화면에 표시하려면 newBadges를 버리지 않고 클라이언트로 돌려줘야 한다.
 */
export async function approve(_prev: ApproveState, formData: FormData): Promise<ApproveState> {
  const host = await requireHost()
  const visitId = String(formData.get('visitId') ?? '')
  const { newBadges } = await approveVisit(visitId, host.id)

  revalidatePath('/admin/approvals')
  revalidatePath('/')
  revalidatePath('/ranking')

  const codes = [...new Set(Object.values(newBadges).flat())]
  if (codes.length === 0) return { messages: [] }

  const badges = await prisma.badge.findMany({
    where: { code: { in: codes } },
    select: { code: true, label: true },
  })
  const labelByCode = new Map(badges.map((b) => [b.code, b.label]))

  const messages = Object.entries(newBadges).map(
    ([nickname, badgeCodes]) =>
      `🎉 ${nickname}: ${badgeCodes.map((c) => labelByCode.get(c) ?? c).join(', ')} 획득!`,
  )
  return { messages }
}

export async function reject(formData: FormData) {
  const host = await requireHost()
  await rejectVisit(
    String(formData.get('visitId') ?? ''),
    host.id,
    String(formData.get('reason') ?? ''),
  )
  revalidatePath('/admin/approvals')
}
