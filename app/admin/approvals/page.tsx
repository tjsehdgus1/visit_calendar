import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { fromDateOnly } from '@/lib/date'
import { reject } from './actions'
import ApproveButton from './ApproveButton'

const SLOT_LABEL = { DAY: '낮', EVENING: '저녁', OVERNIGHT: '밤새' } as const

export default async function ApprovalsPage() {
  await requireHost()

  const pending = await prisma.visit.findMany({
    where: { status: 'PENDING' },
    include: {
      submittedBy: { select: { nickname: true } },
      attendees: { include: { user: { select: { nickname: true } } } },
      tags: { include: { tag: true } },
      photos: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-ink-soft underline">
          ← 캘린더로
        </Link>
        <Link href="/admin" className="font-semibold text-brand-deep underline">
          ← 관리
        </Link>
      </div>
      <h1 className="mb-6 mt-2 font-display text-2xl text-ink">승인 대기 {pending.length}건</h1>

      {pending.length === 0 && <p className="text-ink-soft">대기 중인 기록이 없습니다.</p>}

      <div className="flex flex-col gap-4">
        {pending.map((v) => (
          <article key={v.id} className="rounded-2xl border border-line border-l-4 border-l-brand bg-card p-4 shadow-warm">
            <p className="text-sm text-ink-soft">
              {v.submittedBy.nickname}님이 올림
            </p>
            <p className="mt-1 font-semibold text-ink">
              {fromDateOnly(v.visitDate)} · {SLOT_LABEL[v.timeSlot]}
            </p>
            <p className="mt-2 text-sm text-ink">
              {v.attendees.map((a) => a.user.nickname).join(', ')}
            </p>
            <p className="mt-1 text-sm text-ink">
              {v.tags.map((t) => `${t.tag.emoji} ${t.tag.label}`).join(' ')}
            </p>
            {v.memo && <p className="mt-2 rounded-xl bg-cream p-2 text-sm text-ink">{v.memo}</p>}
            {v.photos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {v.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={`/api/photos/${p.id}`} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <input
                name="reason"
                form={`reject-${v.id}`}
                placeholder="반려 사유 (선택)"
                className="h-11 w-full rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <div className="flex gap-2">
                <ApproveButton visitId={v.id} />
                <form id={`reject-${v.id}`} action={reject} className="flex-1">
                  <input type="hidden" name="visitId" value={v.id} />
                  <button className="h-12 w-full rounded-xl border border-danger font-semibold text-danger transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none">반려</button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
