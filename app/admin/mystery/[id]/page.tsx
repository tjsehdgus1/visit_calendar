import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireHost } from '@/lib/auth/guard'
import { prisma } from '@/lib/db'
import GameForm from '../GameForm'
import { toggleGameActive } from '../actions'

export default async function AdminMysteryEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireHost()
  const { id } = await params
  const game = await prisma.mysteryGame.findUnique({
    where: { id },
    select: { id: true, title: true, players: true, playTime: true, secretTalk: true, owner: true, description: true, active: true },
  })
  if (!game) notFound()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/admin/mystery" className="text-ink-soft underline">
          ← 서재 관리로
        </Link>
        <Link href={`/mystery/${game.id}`} className="font-semibold text-brand-deep underline">
          게임 보기 →
        </Link>
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">게임 수정</h1>

      <section className="mt-6">
        <GameForm values={game} />
      </section>

      <form action={toggleGameActive} className="mt-6">
        <input type="hidden" name="id" value={game.id} />
        <input type="hidden" name="active" value={game.active ? 'false' : 'true'} />
        <button className={`text-sm underline ${game.active ? 'text-danger' : 'text-brand-deep'}`}>
          {game.active ? '이 게임 숨기기' : '이 게임 복구하기'}
        </button>
      </form>
    </main>
  )
}
