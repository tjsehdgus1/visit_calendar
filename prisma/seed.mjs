import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Prisma 7은 PrismaClient에 driver adapter 전달을 요구한다.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const TAGS = [
  { slug: 'meal',      label: '밥',       emoji: '🍚', sortOrder: 1 },
  { slug: 'drink',     label: '술',       emoji: '🍺', sortOrder: 2 },
  { slug: 'boardgame', label: '보드게임', emoji: '🎲', sortOrder: 3 },
  { slug: 'movie',     label: '영화',     emoji: '🎬', sortOrder: 4 },
  { slug: 'game',      label: '게임',     emoji: '🎮', sortOrder: 5 },
  { slug: 'chat',      label: '수다',     emoji: '💬', sortOrder: 6 },
  { slug: 'cook',      label: '요리',     emoji: '👨‍🍳', sortOrder: 7 },
  { slug: 'sleepover', label: '자고감',   emoji: '🛏️', sortOrder: 8 },
]

const BADGES = [
  { code: 'FIRST_VISIT',     label: '개시',            emoji: '🎉', description: '처음으로 놀러왔을 때',                 repeatable: false, sortOrder: 1 },
  { code: 'VISIT_10',        label: '출석왕',          emoji: '🔟', description: '통산 10회 방문',                       repeatable: false, sortOrder: 2 },
  { code: 'VISIT_50',        label: '백번손님',        emoji: '💯', description: '통산 50회 방문',                       repeatable: false, sortOrder: 3 },
  { code: 'OVERNIGHT_3',     label: '새벽 생존자',     emoji: '🌅', description: '밤새 놀다 간 날 3회',                  repeatable: false, sortOrder: 4 },
  { code: 'STREAK_4W',       label: '정기구독',        emoji: '📅', description: '4주 연속 방문',                        repeatable: false, sortOrder: 5 },
  { code: 'ALL_TAGS',        label: '만능 엔터테이너', emoji: '🎲', description: '모든 활동을 한 번씩 경험',             repeatable: false, sortOrder: 6 },
  { code: 'PHOTO_30',        label: '사진사',          emoji: '📸', description: '사진 30장 업로드',                     repeatable: false, sortOrder: 7 },
  { code: 'MEMO_20',         label: '작가',            emoji: '✍️', description: '한 줄 메모 20건 작성',                 repeatable: false, sortOrder: 8 },
  { code: 'SOLO_5',          label: '독고다이',        emoji: '🧍', description: '혼자 방문 5회',                        repeatable: false, sortOrder: 9 },
  { code: 'CROWD_5',         label: '인싸',            emoji: '👥', description: '4명 이상 모인 자리 5회',               repeatable: false, sortOrder: 10 },
  { code: 'SEASON_CHAMPION', label: '시즌 챔피언',     emoji: '🏆', description: '시즌 랭킹 1위',                        repeatable: true,  sortOrder: 11 },
  { code: 'TAG_KING',        label: '부문왕',          emoji: '🥇', description: '시즌 내 특정 활동 1위',                repeatable: true,  sortOrder: 12 },
]

function currentQuarter(now) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const y = kst.getUTCFullYear()
  const q = Math.floor(kst.getUTCMonth() / 3)
  const startMonth = q * 3
  const pad = (n) => String(n).padStart(2, '0')
  const endDay = [31, 30, 30, 31][q]
  return {
    name: `${y} ${q + 1}분기`,
    startDate: new Date(`${y}-${pad(startMonth + 1)}-01T00:00:00.000Z`),
    endDate: new Date(`${y}-${pad(startMonth + 3)}-${endDay}T00:00:00.000Z`),
  }
}

async function main() {
  for (const t of TAGS) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: t, create: t })
  }
  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { code: b.code }, update: b, create: b })
  }

  const loginId = process.env.HOST_LOGIN_ID
  const password = process.env.HOST_PASSWORD
  if (!loginId || !password) throw new Error('HOST_LOGIN_ID / HOST_PASSWORD 환경변수가 필요합니다')

  await prisma.user.upsert({
    where: { loginId },
    update: { role: 'HOST' },
    create: {
      loginId,
      passwordHash: await bcrypt.hash(password, 12),
      nickname: process.env.HOST_NICKNAME ?? '집주인',
      role: 'HOST',
    },
  })

  const q = currentQuarter(new Date())
  await prisma.season.upsert({
    where: { startDate_endDate: { startDate: q.startDate, endDate: q.endDate } },
    update: { name: q.name },
    create: q,
  })

  console.log('시드 완료:', { tags: TAGS.length, badges: BADGES.length, host: loginId, season: q.name })
}

main().finally(() => prisma.$disconnect())
