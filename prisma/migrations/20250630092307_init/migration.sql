-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'COMPLETED', 'ACCEPTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethodEnum" AS ENUM ('CARD', 'IBAN');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('PUBLIC', 'WORKER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "telegramId" BIGINT NOT NULL,
    "onPause" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendors" (
    "id" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "work" BOOLEAN NOT NULL DEFAULT false,
    "showReceipt" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "token" TEXT,
    "lastReportedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastAllRatesSentAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastAllRateMessageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequests" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT,
    "payedByUserId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "currencyId" TEXT NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "ratesId" TEXT,
    "activeUserId" TEXT,
    "paymentMethodId" TEXT,

    CONSTRAINT "PaymentRequests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "messageId" BIGINT NOT NULL,
    "paymentRequestId" TEXT,
    "text" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,
    "accessType" "AccessType" NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardPaymentRequestsMethod" (
    "id" TEXT NOT NULL,
    "card" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethodId" TEXT,

    CONSTRAINT "CardPaymentRequestsMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IbanPaymentRequestsMethod" (
    "id" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "comment" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethodId" TEXT,

    CONSTRAINT "IbanPaymentRequestsMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeededBankCards" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankNameEn" TEXT NOT NULL,

    CONSTRAINT "SeededBankCards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rates" (
    "id" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethodId" TEXT NOT NULL,

    CONSTRAINT "Rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "nameEn" "PaymentMethodEnum" NOT NULL,
    "description" TEXT,
    "descriptionEn" TEXT,
    "icon" TEXT,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "symbol" TEXT,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackList" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardBank" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankNameEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserToVendors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserToVendors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PaymentMethodToPaymentRequests" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PaymentMethodToPaymentRequests_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BlackListToCardPaymentRequestsMethod" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlackListToCardPaymentRequestsMethod_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendors_chatId_key" ON "Vendors"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendors_title_key" ON "Vendors"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Vendors_token_key" ON "Vendors"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Vendors_lastAllRateMessageId_key" ON "Vendors"("lastAllRateMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_messageId_key" ON "Message"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "SeededBankCards_number_key" ON "SeededBankCards"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_nameEn_key" ON "PaymentMethod"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BlackList_requestId_key" ON "BlackList"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "CardBank_number_key" ON "CardBank"("number");

-- CreateIndex
CREATE INDEX "_UserToVendors_B_index" ON "_UserToVendors"("B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");

-- CreateIndex
CREATE INDEX "_PaymentMethodToPaymentRequests_B_index" ON "_PaymentMethodToPaymentRequests"("B");

-- CreateIndex
CREATE INDEX "_BlackListToCardPaymentRequestsMethod_B_index" ON "_BlackListToCardPaymentRequestsMethod"("B");

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_payedByUserId_fkey" FOREIGN KEY ("payedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_ratesId_fkey" FOREIGN KEY ("ratesId") REFERENCES "Rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_activeUserId_fkey" FOREIGN KEY ("activeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PaymentRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardPaymentRequestsMethod" ADD CONSTRAINT "CardPaymentRequestsMethod_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IbanPaymentRequestsMethod" ADD CONSTRAINT "IbanPaymentRequestsMethod_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rates" ADD CONSTRAINT "Rates_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rates" ADD CONSTRAINT "Rates_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToVendors" ADD CONSTRAINT "_UserToVendors_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToVendors" ADD CONSTRAINT "_UserToVendors_B_fkey" FOREIGN KEY ("B") REFERENCES "Vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentMethodToPaymentRequests" ADD CONSTRAINT "_PaymentMethodToPaymentRequests_A_fkey" FOREIGN KEY ("A") REFERENCES "PaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentMethodToPaymentRequests" ADD CONSTRAINT "_PaymentMethodToPaymentRequests_B_fkey" FOREIGN KEY ("B") REFERENCES "PaymentRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlackListToCardPaymentRequestsMethod" ADD CONSTRAINT "_BlackListToCardPaymentRequestsMethod_A_fkey" FOREIGN KEY ("A") REFERENCES "BlackList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlackListToCardPaymentRequestsMethod" ADD CONSTRAINT "_BlackListToCardPaymentRequestsMethod_B_fkey" FOREIGN KEY ("B") REFERENCES "CardPaymentRequestsMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
