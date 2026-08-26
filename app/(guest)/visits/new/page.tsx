import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { todayKst } from '@/lib/date'
import NewVisitForm from './form'

export default async function NewVisitPage() {
  const user = await requireUser()
  const [tags, members] = await Promise.all([
    prisma.tag.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', id: { not: user.id } },
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    }),
  ])

  return <NewVisitForm tags={tags} members={members} today={todayKst()} />
}
