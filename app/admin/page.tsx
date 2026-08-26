import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { currentSeason } from '@/lib/ranking'
import { createInvite, revokeInvite, resetPassword, toggleUserStatus, toggleTag, addTag } from './actions'
import SeasonCloseForm from './SeasonCloseForm'

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
        <Link href="/" className="text-neutral-500 underline">
          ← 캘린더로
        </Link>
        <Link href="/admin/approvals" className="font-semibold underline">
          승인함 →
        </Link>
      </div>
      <h1 className="mt-2 text-xl font-bold">관리</h1>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">초대코드</h2>
        <form action={createInvite} className="flex flex-col gap-2 rounded-xl border p-3">
          <input name="memo" placeholder="메모 (예: 민수 주려고)" className="rounded-lg border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input name="maxUses" type="number" min={1} defaultValue={1} className="w-24 rounded-lg border px-3 py-2 text-sm" aria-label="사용 한도" />
            <input name="expiresInDays" type="number" min={0} defaultValue={30} className="w-24 rounded-lg border px-3 py-2 text-sm" aria-label="유효 일수 (0=무기한)" />
            <button className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white">발급</button>
          </div>
        </form>

        <ul className="mt-2 flex flex-col gap-1">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <code className="font-mono font-bold tracking-wider">{i.code}</code>
              <span className="flex-1 truncate text-xs text-neutral-500">
                {i.memo ?? '—'} · {i.usedCount}/{i.maxUses}
              </span>
              <form action={revokeInvite}>
                <input type="hidden" name="inviteId" value={i.id} />
                <button className="text-xs text-red-600 underline">중지</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">회원 {users.length}명</h2>
        <ul className="flex flex-col gap-1">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <span className="flex-1">
                {u.nickname}
                <span className="ml-1 text-xs text-neutral-500">@{u.loginId}</span>
                {u.role === 'HOST' && <span className="ml-1 text-xs">👑</span>}
                {u.status === 'SUSPENDED' && <span className="ml-1 text-xs text-red-600">정지</span>}
              </span>
              <form action={resetPassword}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="text-xs underline">비번 초기화</button>
              </form>
              {u.role !== 'HOST' && (
                <form action={toggleUserStatus}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="text-xs text-red-600 underline">
                    {u.status === 'ACTIVE' ? '정지' : '해제'}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-neutral-500">
          비번을 초기화하면 서버 로그에 임시 비밀번호가 남습니다. 확인 후 본인에게 전달하세요.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">활동 태그</h2>
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <form action={toggleTag}>
                <input type="hidden" name="tagId" value={t.id} />
                <button className={`rounded-full border px-3 py-1 text-sm ${t.active ? '' : 'opacity-40 line-through'}`}>
                  {t.emoji} {t.label}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTag} className="mt-2 flex gap-2">
          <input name="emoji" placeholder="🎯" className="w-14 rounded-lg border px-2 py-2 text-center text-sm" />
          <input name="label" placeholder="이름" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <input name="slug" placeholder="slug" className="w-24 rounded-lg border px-3 py-2 text-sm" />
          <button className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">추가</button>
        </form>
        <p className="mt-1 text-xs text-neutral-500">태그는 삭제하지 않고 비활성화합니다 (과거 기록 보존).</p>
      </section>

      {season && (
        <section className="mt-8 mb-10">
          <h2 className="mb-2 font-semibold">시즌</h2>
          <SeasonCloseForm seasonId={season.id} seasonName={season.name} />
        </section>
      )}
    </main>
  )
}
