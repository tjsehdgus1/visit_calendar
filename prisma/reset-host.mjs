import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// 호스트 계정의 로그인 ID·비밀번호를 갱신한다 (호스트는 1명이므로 role=HOST인 사용자를 찾아 수정).
// 사용: HOST_LOGIN_ID=<새ID> HOST_PASSWORD=<새비번> node prisma/reset-host.mjs
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const loginId = process.env.HOST_LOGIN_ID
  const password = process.env.HOST_PASSWORD
  if (!loginId || !password) throw new Error('HOST_LOGIN_ID / HOST_PASSWORD 환경변수가 필요합니다')

  const host = await prisma.user.findFirst({ where: { role: 'HOST' } })
  if (!host) throw new Error('호스트 계정이 없습니다. 먼저 시드를 실행하세요')

  await prisma.user.update({
    where: { id: host.id },
    data: { loginId, passwordHash: await bcrypt.hash(password, 12) },
  })
  console.log('호스트 갱신 완료:', { from: host.loginId, to: loginId })
}

main().finally(() => prisma.$disconnect())
