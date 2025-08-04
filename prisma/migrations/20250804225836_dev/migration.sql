/*
  Warnings:

  - You are about to drop the column `paymentMethodId` on the `CardPaymentRequestsMethod` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethodId` on the `IbanPaymentRequestsMethod` table. All the data in the column will be lost.
  - You are about to drop the column `paymentRequestId` on the `Message` table. All the data in the column will be lost.
  - You are about to alter the column `messageId` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to drop the `SeededBankCards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PaymentMethodToPaymentRequests` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `Currency` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `name` on the `Currency` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `Role` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CurrencyEnum" AS ENUM ('UAH', 'USD');

-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('GUEST', 'ADMIN', 'WORKER');

-- DropForeignKey
ALTER TABLE "CardPaymentRequestsMethod" DROP CONSTRAINT "CardPaymentRequestsMethod_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "IbanPaymentRequestsMethod" DROP CONSTRAINT "IbanPaymentRequestsMethod_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "_PaymentMethodToPaymentRequests" DROP CONSTRAINT "_PaymentMethodToPaymentRequests_A_fkey";

-- DropForeignKey
ALTER TABLE "_PaymentMethodToPaymentRequests" DROP CONSTRAINT "_PaymentMethodToPaymentRequests_B_fkey";

-- AlterTable
ALTER TABLE "CardBank" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "CardPaymentRequestsMethod" DROP COLUMN "paymentMethodId",
ADD COLUMN     "bankId" TEXT,
ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "Currency" DROP COLUMN "name",
ADD COLUMN     "name" "CurrencyEnum" NOT NULL;

-- AlterTable
ALTER TABLE "IbanPaymentRequestsMethod" DROP COLUMN "paymentMethodId",
ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "paymentRequestId",
ALTER COLUMN "messageId" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "name",
ADD COLUMN     "name" "RoleEnum" NOT NULL;

-- DropTable
DROP TABLE "SeededBankCards";

-- DropTable
DROP TABLE "_PaymentMethodToPaymentRequests";

-- CreateTable
CREATE TABLE "AdminRequestPhotoMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRequestPhotoMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerRequestPhotoMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerRequestPhotoMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "name" TEXT NOT NULL DEFAULT 'default',
    "onPause" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_name_key" ON "Currency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPaymentRequestsMethod" ADD CONSTRAINT "CardPaymentRequestsMethod_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PaymentRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPaymentRequestsMethod" ADD CONSTRAINT "CardPaymentRequestsMethod_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "CardBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IbanPaymentRequestsMethod" ADD CONSTRAINT "IbanPaymentRequestsMethod_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PaymentRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestPhotoMessage" ADD CONSTRAINT "AdminRequestPhotoMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PaymentRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminRequestPhotoMessage" ADD CONSTRAINT "AdminRequestPhotoMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerRequestPhotoMessage" ADD CONSTRAINT "WorkerRequestPhotoMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PaymentRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerRequestPhotoMessage" ADD CONSTRAINT "WorkerRequestPhotoMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
