import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import BottomNav from '@/components/BottomNav'

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  // 호스트 탭의 '승인'에만 대기 건수를 띄운다 — 손님 화면에서는 조회하지 않는다
  const pendingCount = user.role === 'HOST' ? await prisma.visit.count({ where: { status: 'PENDING' } }) : 0

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav role={user.role} pendingCount={pendingCount} />
    </>
  )
}
