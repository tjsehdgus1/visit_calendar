-- 승인 절차 폐지 (2026-09-27 사용자 결정): 방문 기록은 제출 즉시 등록된다.

-- AlterTable
ALTER TABLE "Visit" ALTER COLUMN "status" SET DEFAULT 'APPROVED';

-- 승인 대기 중이던 기록은 모두 등록 처리한다 (승인함이 없어지므로 그대로 두면 영영 보이지 않는다).
-- 뱃지는 SQL로 판정할 수 없어, 해당 참석자가 다음에 기록될 때 함께 판정된다.
UPDATE "Visit" SET "status" = 'APPROVED', "reviewedAt" = NOW(), "updatedAt" = NOW() WHERE "status" = 'PENDING';
