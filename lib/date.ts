/**
 * 날짜는 전부 'YYYY-MM-DD' 문자열로 다룬다.
 * new Date('YYYY-MM-DD')는 UTC로 파싱되어 KST에서 하루 밀리므로 직접 쓰지 않는다.
 */

const DAY_MS = 86_400_000

/** 오늘 날짜(KST) */
export function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** 주어진 시각까지 남은 일수 (올림). 컴포넌트 렌더 안에서 Date.now()를 직접 부르지 않기 위한 헬퍼 */
export function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / DAY_MS)
}

/** @db.Date 컬럼에 저장할 Date (UTC 자정) */
export function toDateOnly(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error(`날짜 형식이 잘못되었습니다: ${ymd}`)
  return new Date(`${ymd}T00:00:00.000Z`)
}

/** DB의 Date → 'YYYY-MM-DD' */
export function fromDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** ISO-8601 주차 키. 월요일 시작, 목요일이 속한 해가 그 주의 연도 */
export function isoWeekKey(ymd: string): string {
  const d = toDateOnly(ymd)
  // getUTCDay(): 일=0 → 7로 바꿔 월=1..일=7
  const dayNum = d.getUTCDay() || 7
  // 그 주의 목요일로 이동
  const thursday = new Date(d.getTime() + (4 - dayNum) * DAY_MS)
  const year = thursday.getUTCFullYear()
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / (7 * DAY_MS)) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** 주차 키 목록에서 연속 구간의 길이들을 구한다 */
export function consecutiveWeekRuns(weekKeys: string[]): number[] {
  const unique = [...new Set(weekKeys)].sort()
  if (unique.length === 0) return []

  const runs: number[] = []
  let current = 1
  for (let i = 1; i < unique.length; i++) {
    if (isNextWeek(unique[i - 1], unique[i])) current++
    else {
      runs.push(current)
      current = 1
    }
  }
  runs.push(current)
  return runs
}

/** b가 a의 바로 다음 주인가 (연도 경계 포함) */
function isNextWeek(a: string, b: string): boolean {
  return isoWeekKey(mondayOf(a, 7)) === b
}

/** 주차 키의 월요일에서 offsetDays 만큼 이동한 날짜 문자열 */
function mondayOf(weekKey: string, offsetDays = 0): string {
  const [yearStr, weekStr] = weekKey.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  // 1월 4일은 항상 ISO 1주차에 속한다
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Monday = jan4.getTime() - (jan4Day - 1) * DAY_MS
  const monday = new Date(week1Monday + (week - 1) * 7 * DAY_MS + offsetDays * DAY_MS)
  return monday.toISOString().slice(0, 10)
}
