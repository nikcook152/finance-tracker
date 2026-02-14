-- DropIndex
DROP INDEX IF EXISTS "Transaction_userId_idx";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amount",
DROP COLUMN "category",
DROP COLUMN "title",
ADD COLUMN     "encryptedData" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
