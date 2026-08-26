export const MAX_FAILURES = 5
export const LOCK_MS = 10 * 60 * 1000

type Entry = { count: number; until: number }

export function createLockout(now: () => number = Date.now) {
  const failures = new Map<string, Entry>()
  return {
    isLocked(key: string): boolean {
      const f = failures.get(key)
      if (!f) return false
      if (now() > f.until) { failures.delete(key); return false }
      return f.count >= MAX_FAILURES
    },
    recordFailure(key: string): void {
      const f = failures.get(key) ?? { count: 0, until: 0 }
      failures.set(key, { count: f.count + 1, until: now() + LOCK_MS })
    },
    clear(key: string): void { failures.delete(key) },
  }
}
