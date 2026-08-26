import { randomInt } from 'node:crypto'
import type { Prisma } from '@prisma/client'

/** 0/O, 1/I/L 처럼 눈으로 헷갈리는 글자를 뺀다 (전화로 불러줄 수 있어야 함) */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]
  return code
}

export class InviteError extends Error {}

/**
 * 초대코드를 사용 처리한다. 반드시 트랜잭션 안에서 호출할 것.
 * updateMany의 조건부 갱신으로 동시 가입 시 한도 초과를 막는다.
 */
export async function redeemInviteCode(
  tx: Prisma.TransactionClient,
  code: string,
): Promise<string> {
  const invite = await tx.inviteCode.findUnique({ where: { code: code.trim().toUpperCase() } })
  if (!invite) throw new InviteError('초대코드가 올바르지 않습니다.')
  if (invite.revokedAt) throw new InviteError('사용이 중지된 초대코드입니다.')
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new InviteError('만료된 초대코드입니다.')

  const updated = await tx.inviteCode.updateMany({
    where: { id: invite.id, usedCount: { lt: invite.maxUses }, revokedAt: null },
    data: { usedCount: { increment: 1 } },
  })
  if (updated.count === 0) throw new InviteError('이미 다 사용된 초대코드입니다.')

  return invite.id
}
