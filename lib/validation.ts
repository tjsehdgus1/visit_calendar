import { z } from 'zod'

/**
 * 로그인 이름 = 표시 이름. 지인끼리 쓰는 앱이라 별도 아이디 없이 이름(한글 가능)으로 로그인한다 (2026-09-07 사용자 확정)
 */
const nameSchema = z
  .string()
  .trim()
  .regex(/^[가-힣a-zA-Z0-9]{2,20}$/, '이름은 한글·영문·숫자 2~20자여야 합니다 (공백 없이).')

/** 비밀번호는 숫자 4자리 (2026-09-07 사용자 확정) */
export const PASSWORD_PATTERN = /^\d{4}$/
const passwordSchema = z.string().regex(PASSWORD_PATTERN, '비밀번호는 숫자 4자리여야 합니다.')

export const signupSchema = z.object({
  inviteCode: z.string().trim().min(1, '초대코드를 입력해 주세요.'),
  loginId: nameSchema,
  password: passwordSchema,
})

/** 호스트가 관리자 화면에서 회원을 직접 추가할 때 */
export const createUserSchema = z.object({
  loginId: nameSchema,
  password: passwordSchema,
})

export const visitSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.'),
  timeSlot: z.enum(['DAY', 'EVENING', 'OVERNIGHT']),
  memo: z.string().trim().max(200, '메모는 200자 이하여야 합니다.').optional(),
  tagIds: z.array(z.string()).min(1, '활동을 하나 이상 선택해 주세요.'),
  attendeeIds: z.array(z.string()).min(0),
})

/** 머더미스터리 게임 (서재 관리, 호스트) */
export const mysteryGameSchema = z.object({
  title: z.string().trim().min(1, '게임명을 입력해 주세요.').max(60, '게임명은 60자 이하여야 합니다.'),
  players: z.coerce.number().int('인원은 정수여야 합니다.').min(2, '인원은 2명 이상이어야 합니다.').max(12, '인원은 12명 이하여야 합니다.'),
  playTime: z.string().trim().max(30, '예상 시간은 30자 이하여야 합니다.').optional(),
  secretTalk: z.boolean(),
  owner: z.string().trim().max(20, '소유자는 20자 이하여야 합니다.').optional(),
  description: z.string().trim().max(2000, '소개는 2000자 이하여야 합니다.').optional(),
})

/** 방문 기록에 붙는 머더미스터리 플레이 */
export const mysteryPlaySchema = z.object({
  gameId: z.string().min(1, '어떤 게임을 했는지 골라 주세요.'),
  rating: z.coerce.number().int().min(1, '별점을 골라 주세요.').max(5, '별점은 5점까지입니다.'),
  review: z.string().trim().max(200, '한줄 후기는 200자 이하여야 합니다.').optional(),
})

/** 플레이 기록 수정 (호스트). 방문에 붙지 않은 이관분만 날짜·함께한 사람을 바꿀 수 있다 */
export const mysteryPlayEditSchema = z.object({
  rating: z.coerce.number().int().min(1, '별점을 골라 주세요.').max(5, '별점은 5점까지입니다.'),
  review: z.string().trim().max(200, '한줄 후기는 200자 이하여야 합니다.').optional(),
  playedOn: z.string().regex(/^d{4}-d{2}-d{2}$/, '날짜 형식이 올바르지 않습니다.').optional(),
  playersText: z.string().trim().max(200, '함께한 사람은 200자 이하여야 합니다.').optional(),
})
