'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { generateInviteCode } from '@/lib/invite'

export async function createInvite(formData: FormData) {
  const host = await requireHost()
  const memo = String(formData.get('memo') ?? '').trim() || null
  const maxUses = Math.max(1, Number(formData.get('maxUses')) || 1)
  const days = Number(formData.get('expiresInDays')) || 0

  await prisma.inviteCode.create({
    data: {
      code: generateInviteCode(),
      memo,
      maxUses,
      expiresAt: days > 0 ? new Date(Date.now() + days * 86_400_000) : null,
      createdById: host.id,
    },
  })
  revalidatePath('/admin')
}

export async function revokeInvite(formData: FormData) {
  await requireHost()
  await prisma.inviteCode.update({
    where: { id: String(formData.get('inviteId') ?? '') },
    data: { revokedAt: new Date() },
  })
  revalidatePath('/admin')
}

/** 비밀번호 분실 대응 — 메일 서버가 없으므로 호스트가 임시 비번을 발급한다 */
export async function resetPassword(formData: FormData) {
  await requireHost()
  const userId = String(formData.get('userId') ?? '')
  const temp = generateInviteCode(10)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(temp, 12) },
    select: { loginId: true },
  })
  // 화면에 띄우면 어깨너머로 노출된다. 호스트가 컨테이너 로그에서 확인해 본인에게 전달한다.
  console.log(`[임시 비밀번호] ${user.loginId} → ${temp}`)
  revalidatePath('/admin')
}

export async function toggleUserStatus(formData: FormData) {
  const host = await requireHost()
  const userId = String(formData.get('userId') ?? '')
  if (userId === host.id) return // 자기 자신은 정지할 수 없다

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
  })
  revalidatePath('/admin')
}

export async function toggleTag(formData: FormData) {
  await requireHost()
  const tagId = String(formData.get('tagId') ?? '')
  const tag = await prisma.tag.findUniqueOrThrow({ where: { id: tagId } })
  await prisma.tag.update({ where: { id: tagId }, data: { active: !tag.active } })
  revalidatePath('/admin')
}

export async function addTag(formData: FormData) {
  await requireHost()
  const label = String(formData.get('label') ?? '').trim()
  const emoji = String(formData.get('emoji') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase()
  if (!label || !emoji || !/^[a-z0-9_]+$/.test(slug)) return

  const max = await prisma.tag.aggregate({ _max: { sortOrder: true } })
  await prisma.tag.create({
    data: { slug, label, emoji, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  revalidatePath('/admin')
}
