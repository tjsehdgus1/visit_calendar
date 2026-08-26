import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { fromDateOnly } from '@/lib/date'

const SLOT_LABEL = { DAY: '낮', EVENING: '저녁', OVERNIGHT: '밤새' } as const

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params

  const visit = await prisma.visit.findFirst({
    where: { id, status: 'APPROVED' },
    include: {
      attendees: { include: { user: { select: { nickname: true } } } },
      tags: { include: { tag: true } },
      photos: { select: { id: true } },
    },
  })
  if (!visit) notFound()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">{fromDateOnly(visit.visitDate)}</h1>
      <p className="mt-1 text-sm text-neutral-500">{SLOT_LABEL[visit.timeSlot]}</p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-500">누가</h2>
        <p className="mt-1">{visit.attendees.map((a) => a.user.nickname).join(', ')}</p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-neutral-500">뭐 했나</h2>
        <p className="mt-1">{visit.tags.map((t) => `${t.tag.emoji} ${t.tag.label}`).join('  ')}</p>
      </section>

      {visit.memo && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-neutral-500">한 줄</h2>
          <p className="mt-1 rounded-lg bg-neutral-100 p-3">{visit.memo}</p>
        </section>
      )}

      {visit.photos.length > 0 && (
        <section className="mt-4 grid grid-cols-2 gap-2">
          {visit.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={`/api/photos/${p.id}`} alt="" className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </section>
      )}
    </main>
  )
}
