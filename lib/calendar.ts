// Prisma를 import 하지 않는 순수 함수 — 캘린더 칸 표시용

export type DayVisit = { emojis: string[]; nicknames: string[] }

/**
 * 캘린더 한 칸 요약. 같은 날 모임이 여러 번이면 이모지·이름을 합쳐 중복 없이 보여준다.
 * 칸이 좁아(375px에서 약 47px) 이름은 한 줄에 한 명씩 두 줄까지 — 세 명 이상이면 둘째 줄을 "외 N명"으로.
 */
export function summarizeDay(visits: DayVisit[]): { emojis: string[]; names: string[]; lines: string[] } {
  const emojis = [...new Set(visits.flatMap((v) => v.emojis))].slice(0, 2)
  const names = [...new Set(visits.flatMap((v) => v.nicknames))]
  const lines = names.length <= 2 ? names : [names[0], `외 ${names.length - 1}명`]
  return { emojis, names, lines }
}
