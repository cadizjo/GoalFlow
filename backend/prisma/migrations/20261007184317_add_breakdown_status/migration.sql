-- CreateEnum
CREATE TYPE "BreakdownStatus" AS ENUM ('idle', 'processing', 'complete', 'failed');

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "breakdown_status" "BreakdownStatus" NOT NULL DEFAULT 'idle';
