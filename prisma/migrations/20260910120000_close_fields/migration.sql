-- Единый флоу закрытия заявки: площадка, курс, комиссия и ID P2P-ордера.
ALTER TABLE "PaymentRequests"
  ADD COLUMN IF NOT EXISTS "closeAccount" TEXT,
  ADD COLUMN IF NOT EXISTS "closeRate" DECIMAL(32,16),
  ADD COLUMN IF NOT EXISTS "closeFee" DECIMAL(30,8),
  ADD COLUMN IF NOT EXISTS "closeOrderId" TEXT;

-- один P2P-ордер закрывает ровно одну заявку
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRequests_closeOrderId_key"
  ON "PaymentRequests"("closeOrderId");

-- Справочник комиссий площадок; отсутствие строки не блокирует закрытие (fee = 0).
CREATE TABLE IF NOT EXISTS "CloseFee" (
  "account" TEXT NOT NULL,
  "fee" DECIMAL(30,8) NOT NULL,
  CONSTRAINT "CloseFee_pkey" PRIMARY KEY ("account")
);

INSERT INTO "CloseFee" ("account", "fee") VALUES
  ('binance', 0),
  ('okx', 0),
  ('htx', 0),
  ('bybit', 0),
  ('mexc', 0)
ON CONFLICT ("account") DO NOTHING;
