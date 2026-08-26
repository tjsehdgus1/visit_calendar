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
        <Link href="/" className="text-neutral-500 underline">
          ← 캘린더로
        </Link>
        <Link href="/admin" className="font-semibold underline">
          ← 관리
        </Link>
      </div>
      <h1 className="mb-6 mt-2 text-xl font-bold">승인 대기 {pending.length}건</h1>

      {pending.length === 0 && <p className="text-neutral-500">대기 중인 기록이 없습니다.</p>}

      <div className="flex flex-col gap-4">
        {pending.map((v) => (
          <article key={v.id} className="rounded-xl border p-4">
            <p className="text-sm text-neutral-500">
              {v.submittedBy.nickname}님이 올림
            </p>
            <p className="mt-1 font-semibold">
              {fromDateOnly(v.visitDate)} · {SLOT_LABEL[v.timeSlot]}
            </p>
            <p className="mt-2 text-sm">
              {v.attendees.map((a) => a.user.nickname).join(', ')}
            </p>
            <p className="mt-1 text-sm">
              {v.tags.map((t) => `${t.tag.emoji} ${t.tag.label}`).join(' ')}
            </p>
            {v.memo && <p className="mt-2 rounded-lg bg-neutral-100 p-2 text-sm">{v.memo}</p>}
            {v.photos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {v.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={`/api/photos/${p.id}`} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <input
                name="reason"
                form={`reject-${v.id}`}
                placeholder="반려 사유 (선택)"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <ApproveButton visitId={v.id} />
                <form id={`reject-${v.id}`} action={reject} className="flex-1">
                  <input type="hidden" name="visitId" value={v.id} />
                  <button className="w-full rounded-lg border py-3 font-semibold">반려</button>
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
