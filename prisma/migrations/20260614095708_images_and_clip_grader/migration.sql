-- AlterEnum
ALTER TYPE "GradedBy" ADD VALUE 'clip';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "imageUrl" TEXT;
