import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// 노션 "머더미스터리 플레이 기록" 이관 (설계서 docs/superpowers/specs/2026-09-07-murder-mystery-design.md §4)
// 사용: node scripts/import-mystery.mjs < data.json   (또는 파일 경로 인자)
// JSON: [{ title, players, playTime, secretTalk, owner, description, play: { playedOn, rating, review, playersText } | null }]
// 게임은 title 기준 upsert. 플레이는 (game, playedOn, playersText)가 같은 이관분이 이미 있으면 건너뛴다 → 여러 번 실행해도 안전.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function toDateOnly(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

async function main() {
  const src = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : readFileSync(0, 'utf8')
  const items = JSON.parse(src)
  let games = 0
  let plays = 0
  for (const it of items) {
    const game = await prisma.mysteryGame.upsert({
      where: { title: it.title },
      update: {
        players: it.players,
        playTime: it.playTime || null,
        secretTalk: Boolean(it.secretTalk),
        owner: it.owner || null,
        description: it.description || null,
      },
      create: {
        title: it.title,
        players: it.players,
        playTime: it.playTime || null,
        secretTalk: Boolean(it.secretTalk),
        owner: it.owner || null,
        description: it.description || null,
      },
      select: { id: true },
    })
    games++
    if (it.play) {
      const exists = await prisma.mysteryPlay.findFirst({
        where: { gameId: game.id, visitId: null, playedOn: toDateOnly(it.play.playedOn), playersText: it.play.playersText || null },
        select: { id: true },
      })
      if (!exists) {
        await prisma.mysteryPlay.create({
          data: {
            gameId: game.id,
            playedOn: toDateOnly(it.play.playedOn),
            rating: it.play.rating,
            review: it.play.review || null,
            playersText: it.play.playersText || null,
          },
        })
        plays++
      }
    }
  }
  console.log(`이관 완료: 게임 ${games}개 upsert, 플레이 ${plays}건 추가`)
}

main().finally(() => prisma.$disconnect())
