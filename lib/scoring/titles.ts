/** 스펙 §4.2 — 통산 누적 점수 기준 칭호 */
export const TITLES = [
  { min: 0, label: '잠깐손님' },
  { min: 50, label: '눈도장' },
  { min: 150, label: '단골' },
  { min: 350, label: '터줏대감' },
  { min: 700, label: '이집사람' },
  { min: 1500, label: '세대주' },
] as const

export type Title = { label: string; min: number; next: { label: string; min: number } | null }

export function titleFor(points: number): Title {
  let index = 0
  for (let i = 0; i < TITLES.length; i++) {
    if (points >= TITLES[i].min) index = i
  }
  const current = TITLES[index]
  const upcoming = TITLES[index + 1]
  return {
    label: current.label,
    min: current.min,
    next: upcoming ? { label: upcoming.label, min: upcoming.min } : null,
  }
}
