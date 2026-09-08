import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireHost } from '@/lib/auth/guard'
import { fromDateOnly, todayKst } from '@/lib/date'
import { getPlay } from '@/lib/mystery'
import PlayForm from './PlayForm'
import { deletePlayAction } from '../actions'

export default async function AdminPlayEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireHost()
  const { id } = await params
  const play = await getPlay(id)
  if (!play) notFound()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href={`/mystery/${play.game.id}`} className="text-ink-soft underline">
          ← {play.game.title}
        </Link>
        {play.visitId && (
          <Link href={`/visits/${play.visitId}`} className="font-semibold text-brand-deep underline">
            방문 기록 →
          </Link>
        )}
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">플레이 기록 수정</h1>

      <section className="mt-6">
        <PlayForm
          play={{
            id: play.id,
            rating: play.rating,
            review: play.review,
            playedOn: fromDateOnly(play.playedOn),
            playersText: play.playersText,
            visitId: play.visitId,
          }}
          today={todayKst()}
        />
      </section>

      <form action={deletePlayAction} className="mt-6">
        <input type="hidden" name="id" value={play.id} />
        <button className="text-sm text-danger underline">이 플레이 기록 삭제</button>
      </form>
      <p className="mt-1 text-xs text-ink-soft">삭제하면 서재 통계에서 빠집니다. 방문 기록 자체는 남습니다.</p>
    </main>
  )
}
