import { createElement } from 'react';

import { msg } from '@lingui/core/macro';

import { mailer } from '@documenso/email/mailer';
import { DocumentReminderEmailTemplate } from '@documenso/email/templates/document-reminder';
import { prisma } from '@documenso/prisma';

import { getI18nInstance } from '../../../client-only/providers/i18n-server';
import { NEXT_PUBLIC_WEBAPP_URL } from '../../../constants/app';
import { getEmailContext } from '../../../server-only/email/get-email-context';
import { extractDerivedDocumentEmailSettings } from '../../../types/document-email';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../../types/document-audit-logs';
import { createDocumentAuditLogData } from '../../../utils/document-audit-logs';
import { renderEmailWithI18N } from '../../../utils/render-email-with-i18n';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendRecipientReminderEmailJobDefinition } from './send-recipient-reminder-email';

// eslint-disable-next-line @typescript-eslint/require-await -- stub; remove when implemented
export const run = async ({
  payload,
  io,
}: {
  payload: TSendRecipientReminderEmailJobDefinition;
  io: JobRunIO;
}) => {
  const { recipientId, envelopeId } = payload;

  // TODO(Person 2): Implement recipient reminder dispatch.
  //
  // Steps:
  // 1. Fetch envelope (with documentMeta + team) and recipient. Pattern:
  //      send-owner-recipient-expired-email.handler.ts lines 27–62
  //
  // 2. Return early if envelope is no longer PENDING or recipient has signed.
  //
  // 3. Check email settings (reminderEnabled is sufficient — per-recipient reminders
  //    always fire when the sweep decides they're due):
  //      const settings = extractDerivedDocumentEmailSettings(documentMeta);
  //      No specific toggle blocks recipient reminders — the sweep's enabled check is sufficient.
  //
  // 4. Calculate daysRemaining from envelope expiration date (documentMeta.envelopeExpirationPeriod
  //    or envelope-level expiry). If no expiration is set, omit from email copy.
  //
  // 5. getEmailContext + getI18nInstance (same pattern as every email handler).
  //
  // 6. Build signing link:
  //      const signDocumentLink = `${NEXT_PUBLIC_WEBAPP_URL()}/sign/${recipient.token}`;
  //
  // 7. createElement(DocumentReminderEmailTemplate, { ... }) + renderEmailWithI18N + mailer.sendMail
  //    Wrap in io.runTask('send-reminder-email').
  //
  // 8. INSERT DocumentReminderLog row (recipientId = recipient.id):
  //    await io.runTask('create-reminder-log', async () => {
  //      await prisma.documentReminderLog.create({
  //        data: { envelopeId, recipientId: recipient.id },
  //      });
  //    });
  //
  // 9. INSERT DocumentAuditLog (type: REMINDER_SENT):
  //    await io.runTask('create-audit-log', async () => {
  //      await prisma.documentAuditLog.create({
  //        data: createDocumentAuditLogData({
  //          type: DOCUMENT_AUDIT_LOG_TYPE.REMINDER_SENT,
  //          envelopeId,
  //          data: { recipientId, recipientEmail: recipient.email, recipientName: recipient.name },
  //        }),
  //      });
  //    });

  void recipientId;
  void envelopeId;
  void createElement;
  void msg;
  void mailer;
  void DocumentReminderEmailTemplate;
  void prisma;
  void getI18nInstance;
  void NEXT_PUBLIC_WEBAPP_URL;
  void getEmailContext;
  void extractDerivedDocumentEmailSettings;
  void DOCUMENT_AUDIT_LOG_TYPE;
  void createDocumentAuditLogData;
  void renderEmailWithI18N;

  io.logger.info(`send-recipient-reminder-email: not yet implemented (recipient ${recipientId})`);
};
