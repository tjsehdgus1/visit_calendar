import { requireUser } from '@/lib/auth/guard'
import BottomNav from '@/components/BottomNav'

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav role={user.role} />
    </>
  )
}
