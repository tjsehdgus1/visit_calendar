import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { fromDateOnly, toDateOnly, todayKst } from '@/lib/date'
import Calendar, { type CalendarDay } from '@/components/Calendar'

type Props = { searchParams: Promise<{ y?: string; m?: string; submitted?: string; photos?: string }> }

export default async function CalendarPage({ searchParams }: Props) {
  await requireUser()
  const sp = await searchParams
  const today = todayKst()

  const year = Number(sp.y) || Number(today.slice(0, 4))
  const month = Number(sp.m) || Number(today.slice(5, 7))

  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const from = toDateOnly(`${year}-${pad(month)}-01`)
  const to = toDateOnly(`${year}-${pad(month)}-${pad(lastDay)}`)

  const visits = await prisma.visit.findMany({
    where: { status: 'APPROVED', visitDate: { gte: from, lte: to } },
    include: {
      attendees: { include: { user: { select: { nickname: true } } } },
      tags: { include: { tag: { select: { emoji: true } } } },
    },
    orderBy: { visitDate: 'asc' },
  })

  const grouped = new Map<string, CalendarDay>()
  for (const v of visits) {
    const key = fromDateOnly(v.visitDate)
    const entry = grouped.get(key) ?? { date: key, visits: [] }
    entry.visits.push({
      id: v.id,
      emojis: v.tags.map((t) => t.tag.emoji),
      nicknames: v.attendees.map((a) => a.user.nickname),
    })
    grouped.set(key, entry)
  }

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      {sp.submitted === '1' && (
        <p className="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
          기록이 올라갔어요! 호스트 승인을 기다리는 중입니다
        </p>
      )}
      {sp.photos === 'failed' && (
        <p className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          사진 저장에 실패했어요
        </p>
      )}

      <header className="mb-4 flex items-center justify-between">
        <Link href={`/?y=${prev.y}&m=${prev.m}`} className="px-3 py-2 text-lg" aria-label="이전 달">‹</Link>
        <h1 className="text-lg font-bold">{year}년 {month}월</h1>
        <Link href={`/?y=${next.y}&m=${next.m}`} className="px-3 py-2 text-lg" aria-label="다음 달">›</Link>
      </header>

      <Calendar year={year} month={month} days={[...grouped.values()]} today={today} />

      <p className="mt-6 text-center text-sm text-neutral-500">
        이번 달 {visits.length}번 모였습니다
      </p>
    </main>
  )
}
