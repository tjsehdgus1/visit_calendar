'use server'

import { revalidatePath } from 'next/cache'
import { requireHost } from '@/lib/auth/guard'
import { closeSeason } from '@/lib/season'

export type SeasonState = { message?: string; error?: string }

export async function closeSeasonAction(
  _prev: SeasonState,
  formData: FormData,
): Promise<SeasonState> {
  await requireHost()
  try {
    const result = await closeSeason(String(formData.get('seasonId') ?? ''))
    revalidatePath('/ranking')
    revalidatePath('/hall-of-fame')
    revalidatePath('/admin')
    return {
      message:
        result.champions.length > 0
          ? `시즌을 마감했습니다. 챔피언: ${result.champions.join(', ')} (부문왕 ${result.tagKings}명)`
          : '시즌을 마감했습니다. 참가자가 없어 챔피언은 없습니다.',
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '마감 처리에 실패했습니다.' }
  }
}
