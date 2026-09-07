import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// 호스트(집주인) 계정을 만들거나 갱신한다. 호스트는 여러 명일 수 있다 (2026-09-07: 선동현·노성소).
// 사용:
//   새 호스트 생성/비번 갱신: HOST_LOGIN_ID=<이름> HOST_PASSWORD=<숫자4자리> node prisma/set-host.mjs
//   기존 계정 이름 변경:      HOST_FROM=<현재이름> HOST_LOGIN_ID=<새이름> HOST_PASSWORD=<비번> node prisma/set-host.mjs
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const loginId = process.env.HOST_LOGIN_ID
  const password = process.env.HOST_PASSWORD
  const from = process.env.HOST_FROM
  if (!loginId || !password) throw new Error('HOST_LOGIN_ID / HOST_PASSWORD 환경변수가 필요합니다')

  const passwordHash = await bcrypt.hash(password, 12)

  if (from) {
    const user = await prisma.user.findUnique({ where: { loginId: from } })
    if (!user) throw new Error(`계정을 찾을 수 없습니다: ${from}`)
    await prisma.user.update({
      where: { id: user.id },
      data: { loginId, nickname: loginId, passwordHash, role: 'HOST', status: 'ACTIVE' },
    })
    console.log('호스트 이름 변경:', { from, to: loginId })
    return
  }

  await prisma.user.upsert({
    where: { loginId },
    update: { passwordHash, role: 'HOST', status: 'ACTIVE' },
    create: { loginId, nickname: loginId, passwordHash, role: 'HOST' },
  })
  console.log('호스트 설정 완료:', loginId)
}

main().finally(() => prisma.$disconnect())
