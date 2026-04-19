-- AlterTable
ALTER TABLE "DocumentMeta" ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderIntervalDays" INTEGER;

-- CreateTable
CREATE TABLE "DocumentReminderLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envelopeId" TEXT NOT NULL,
    "recipientId" INTEGER,

    CONSTRAINT "DocumentReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentReminderLog_envelopeId_idx" ON "DocumentReminderLog"("envelopeId");

-- CreateIndex
CREATE INDEX "DocumentReminderLog_recipientId_idx" ON "DocumentReminderLog"("recipientId");

-- AddForeignKey
ALTER TABLE "DocumentReminderLog" ADD CONSTRAINT "DocumentReminderLog_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReminderLog" ADD CONSTRAINT "DocumentReminderLog_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
