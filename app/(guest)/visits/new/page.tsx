import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { todayKst } from '@/lib/date'
import NewVisitForm from './form'

type Props = { searchParams: Promise<{ date?: string }> }

export default async function NewVisitPage({ searchParams }: Props) {
  const user = await requireUser()
  const [tags, members] = await Promise.all([
    prisma.tag.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', id: { not: user.id } },
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    }),
  ])

  const today = todayKst()
  // 캘린더에서 날짜를 눌러 진입하면 그 날짜를 미리 채운다 (미래 날짜·형식 오류는 오늘로)
  const { date } = await searchParams
  const defaultDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today

  return (
    <NewVisitForm
      tags={tags}
      members={members}
      today={today}
      defaultDate={defaultDate}
      isHost={user.role === 'HOST'}
    />
  )
}
