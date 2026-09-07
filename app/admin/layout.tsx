import { requireHost } from '@/lib/auth/guard'
import BottomNav from '@/components/BottomNav'

/** 관리 화면에서도 하단 탭을 유지한다 (2026-09-07 사용자 확정) */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireHost()

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav role="HOST" />
    </>
  )
}
