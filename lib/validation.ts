import { z } from 'zod'

export const signupSchema = z.object({
  inviteCode: z.string().trim().min(1, '초대코드를 입력해 주세요.'),
  loginId: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{4,20}$/, '아이디는 영문·숫자·밑줄 4~20자여야 합니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
  nickname: z.string().trim().min(1, '닉네임을 입력해 주세요.').max(20, '닉네임은 20자 이하여야 합니다.'),
})

export const visitSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.'),
  timeSlot: z.enum(['DAY', 'EVENING', 'OVERNIGHT']),
  memo: z.string().trim().max(200, '메모는 200자 이하여야 합니다.').optional(),
  tagIds: z.array(z.string()).min(1, '활동을 하나 이상 선택해 주세요.'),
  attendeeIds: z.array(z.string()).min(1, '참석자를 한 명 이상 선택해 주세요.'),
})
