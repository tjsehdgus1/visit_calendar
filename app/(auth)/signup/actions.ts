'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { redeemInviteCode, InviteError } from '@/lib/invite'
import { signupSchema } from '@/lib/validation'

export type SignupState = { error?: string }

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    inviteCode: formData.get('inviteCode'),
    loginId: formData.get('loginId'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { inviteCode, loginId, password } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const exists = await tx.user.findUnique({ where: { loginId } })
      if (exists) throw new InviteError('이미 등록된 이름입니다. 동명이인이면 뒤에 숫자를 붙여 주세요.')

      const inviteId = await redeemInviteCode(tx, inviteCode)
      await tx.user.create({
        data: {
          loginId,
          passwordHash: await bcrypt.hash(password, 12),
          nickname: loginId, // 로그인 이름이 곧 표시 이름
          role: 'GUEST',
          invitedByCodeId: inviteId,
        },
      })
    })
  } catch (e) {
    if (e instanceof InviteError) return { error: e.message }
    return { error: '가입 처리 중 문제가 발생했습니다.' }
  }

  redirect('/login?signup=1')
}
