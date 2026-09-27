import Link from 'next/link'
import { requireHost } from '@/lib/auth/guard'
import { todayKst } from '@/lib/date'
import { listGamesForPicker } from '@/lib/mystery'
import PlayForm from '../PlayForm'

type Props = { searchParams: Promise<{ gameId?: string }> }

/** 방문 기록 없이 머더미스터리 플레이만 남긴다 (호스트, 2026-09-27 사용자 요청) */
export default async function NewPlayPage({ searchParams }: Props) {
  await requireHost()
  const { gameId } = await searchParams
  const games = await listGamesForPicker()
  const from = games.find((g) => g.id === gameId)

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link href={from ? `/mystery/${from.id}` : '/mystery'} className="min-w-0 truncate text-ink-soft underline">
          ← {from ? from.title : '서재로'}
        </Link>
        <Link href="/admin/mystery" className="shrink-0 font-semibold text-brand-deep underline">
          서재 관리 →
        </Link>
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">🔍 플레이 기록 남기기</h1>
      <p className="mt-1 text-sm text-ink-soft">
        방문 기록 없이 게임만 남깁니다. 서재 통계에는 바로 반영되고, 캘린더·점수에는 들어가지 않아요.
      </p>

      <section className="mt-6">
        {games.length === 0 ? (
          <p className="text-sm text-ink-soft">서재에 게임이 없습니다. 서재 관리에서 먼저 게임을 등록해 주세요.</p>
        ) : (
          <PlayForm games={games} defaultGameId={from?.id} today={todayKst()} />
        )}
      </section>
      {games.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          목록에 없는 게임은{' '}
          <Link href="/admin/mystery" className="underline">
            서재 관리
          </Link>
          에서 먼저 등록해 주세요.
        </p>
      )}
    </main>
  )
}
