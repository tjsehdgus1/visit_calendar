'use server'

import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { generateInviteCode } from '@/lib/invite'
import { createUserSchema } from '@/lib/validation'

export type CreateUserState = { error?: string; created?: string }

/** 호스트가 회원을 직접 추가한다 (초대코드 없이). 이름 + 숫자 4자리 비밀번호. 비밀번호는 호스트가 본인에게 알려준다 */
export async function createUser(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  await requireHost()
  const parsed = createUserSchema.safeParse({
    loginId: formData.get('loginId'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { loginId, password } = parsed.data

  const exists = await prisma.user.findUnique({ where: { loginId }, select: { id: true } })
  if (exists) return { error: '이미 등록된 이름입니다. 동명이인이면 뒤에 숫자를 붙여 주세요.' }

  // 로그인 이름이 곧 표시 이름
  await prisma.user.create({
    data: { loginId, nickname: loginId, passwordHash: await bcrypt.hash(password, 12), role: 'GUEST' },
  })
  revalidatePath('/admin')
  return { created: `${loginId} 추가됨` }
}

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

export type ResetPasswordState = { tempPassword?: string; error?: string }

/**
 * 비밀번호 분실 대응 — 메일 서버가 없으므로 호스트가 임시 비번을 발급한다.
 * NAS에서는 호스트가 컨테이너 로그를 볼 수 없어, 임시 비번을 관리자 화면에 한 번만 표시한다 (새로고침 시 사라짐).
 */
export async function resetPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  await requireHost()
  const userId = String(formData.get('userId') ?? '')
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return { error: '회원을 찾을 수 없습니다.' }
  const temp = String(randomInt(0, 10000)).padStart(4, '0') // 숫자 4자리 규칙에 맞춘 임시 비번
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(temp, 12) } })
  revalidatePath('/admin')
  return { tempPassword: temp }
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
