import { z } from 'zod'

/** 비밀번호 최소 길이. 지인끼리 쓰는 비공개 앱이라 숫자 4자리도 허용한다 (2026-09-07 사용자 확정) */
export const PASSWORD_MIN = 4

const loginIdSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{4,20}$/, '아이디는 영문·숫자·밑줄 4~20자여야 합니다.')
const passwordSchema = z.string().min(PASSWORD_MIN, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`)
const nicknameSchema = z.string().trim().min(1, '닉네임을 입력해 주세요.').max(20, '닉네임은 20자 이하여야 합니다.')

export const signupSchema = z.object({
  inviteCode: z.string().trim().min(1, '초대코드를 입력해 주세요.'),
  loginId: loginIdSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
})

/** 호스트가 관리자 화면에서 회원을 직접 추가할 때 */
export const createUserSchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
})

export const visitSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.'),
  timeSlot: z.enum(['DAY', 'EVENING', 'OVERNIGHT']),
  memo: z.string().trim().max(200, '메모는 200자 이하여야 합니다.').optional(),
  tagIds: z.array(z.string()).min(1, '활동을 하나 이상 선택해 주세요.'),
  attendeeIds: z.array(z.string()).min(0),
})
