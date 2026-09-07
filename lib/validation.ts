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
