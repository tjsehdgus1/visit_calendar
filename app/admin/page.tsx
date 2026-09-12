import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { currentSeason } from '@/lib/ranking'
import { createInvite, revokeInvite, toggleUserStatus, toggleTag, addTag } from './actions'
import SeasonCloseForm from './SeasonCloseForm'
import CreateUserForm from './CreateUserForm'
import ResetPasswordButton from './ResetPasswordButton'
import LogoutButton from '@/components/LogoutButton'

export default async function AdminPage() {
  await requireHost()

  const [invites, users, tags, season] = await Promise.all([
    prisma.inviteCode.findMany({ where: { revokedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, loginId: true, nickname: true, role: true, status: true } }),
    prisma.tag.findMany({ orderBy: { sortOrder: 'asc' } }),
    currentSeason(),
  ])

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-ink-soft underline">
          ← 캘린더로
        </Link>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">관리</h1>
        <LogoutButton />
      </div>
      <Link
        href="/admin/mystery"
        className="mt-4 flex min-h-12 items-center justify-between rounded-2xl border border-line bg-card px-4 text-sm font-semibold text-ink shadow-warm"
      >
        🔍 머더미스터리 서재 관리 <span aria-hidden>→</span>
      </Link>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold text-ink">초대코드</h2>
        <form action={createInvite} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 shadow-warm">
          <input name="memo" placeholder="메모 (예: 민수 주려고)" className="h-11 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-soft">가입 가능 인원</span>
              <input name="maxUses" type="number" min={1} defaultValue={1} className="h-11 w-24 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-soft">유효 일수 (0=무기한)</span>
              <input name="expiresInDays" type="number" min={0} defaultValue={30} className="h-11 w-24 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </label>
            <button className="h-11 flex-1 rounded-xl bg-cta text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none">발급</button>
          </div>
        </form>

        <ul className="mt-2 flex flex-col gap-1">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-xl border border-line bg-card p-2 text-sm shadow-warm">
              <code className="font-mono font-bold tracking-wider text-ink">{i.code}</code>
              <span className="flex-1 truncate text-xs text-ink-soft">
                {i.memo ?? '—'} · {i.usedCount}/{i.maxUses}
              </span>
              <form action={revokeInvite}>
                <input type="hidden" name="inviteId" value={i.id} />
                <button className="text-xs text-danger underline">중지</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold text-ink">회원 {users.length}명</h2>
        <CreateUserForm />
        <ul className="mt-2 flex flex-col gap-1">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded-xl border border-line bg-card p-2 text-sm shadow-warm">
              <span className="flex-1 text-ink">
                {u.nickname}
                {u.role === 'HOST' && <span className="ml-1 text-xs">👑</span>}
                {u.status === 'SUSPENDED' && <span className="ml-1 text-xs text-danger">정지</span>}
              </span>
              <ResetPasswordButton userId={u.id} loginId={u.loginId} />
              {u.role !== 'HOST' && (
                <form action={toggleUserStatus}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="text-xs text-danger underline">
                    {u.status === 'ACTIVE' ? '정지' : '해제'}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-ink-soft">
          비번을 초기화하면 임시 비밀번호가 그 자리에 한 번 표시됩니다. 본인에게 전달한 뒤 화면을 새로고침하세요.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold text-ink">활동 태그</h2>
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <form action={toggleTag}>
                <input type="hidden" name="tagId" value={t.id} />
                <button className={`min-h-11 rounded-full border px-3 py-1 text-sm transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${t.active ? 'border-line bg-card text-ink' : 'border-line bg-card text-ink-soft opacity-40 line-through'}`}>
                  {t.emoji} {t.label}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTag} className="mt-2 flex gap-2">
          <input name="emoji" placeholder="🎯" className="h-11 w-14 rounded-xl border border-line bg-card px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          <input name="label" placeholder="이름" className="h-11 flex-1 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          <input name="slug" placeholder="slug" className="h-11 w-24 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          <button className="h-11 rounded-xl bg-cta px-3 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none">추가</button>
        </form>
        <p className="mt-1 text-xs text-ink-soft">태그는 삭제하지 않고 비활성화합니다 (과거 기록 보존).</p>
      </section>

      {season && (
        <section className="mt-8 mb-10">
          <h2 className="mb-2 font-semibold text-ink">시즌</h2>
          <SeasonCloseForm seasonId={season.id} seasonName={season.name} />
        </section>
      )}
    </main>
  )
}
