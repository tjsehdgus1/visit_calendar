import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import BottomNav from '@/components/BottomNav'

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const pendingCount =
    user.role === 'HOST' ? await prisma.visit.count({ where: { status: 'PENDING' } }) : 0

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav role={user.role} pendingCount={pendingCount} />
    </>
  )
}
