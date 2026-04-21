import { createElement } from 'react';

import { msg } from '@lingui/core/macro';
import { DocumentStatus, SigningStatus } from '@prisma/client';

import { mailer } from '@documenso/email/mailer';
import { DocumentReminderEmailTemplate } from '@documenso/email/templates/document-reminder';
import { prisma } from '@documenso/prisma';

import { getI18nInstance } from '../../../client-only/providers/i18n-server';
import { NEXT_PUBLIC_WEBAPP_URL } from '../../../constants/app';
import { getEmailContext } from '../../../server-only/email/get-email-context';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../../types/document-audit-logs';
import { createDocumentAuditLogData } from '../../../utils/document-audit-logs';
import { renderEmailWithI18N } from '../../../utils/render-email-with-i18n';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendRecipientReminderEmailJobDefinition } from './send-recipient-reminder-email';

export const run = async ({
  payload,
  io,
}: {
  payload: TSendRecipientReminderEmailJobDefinition;
  io: JobRunIO;
}) => {
  const { recipientId, envelopeId } = payload;

  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      documentMeta: true,
      team: {
        select: { teamEmail: true, name: true, url: true },
      },
    },
  });

  if (!envelope) {
    throw new Error(`Envelope ${envelopeId} not found`);
  }

  if (envelope.status !== DocumentStatus.PENDING) {
    return;
  }

  const recipient = await prisma.recipient.findFirst({
    where: { id: recipientId, envelopeId },
  });

  if (!recipient) {
    throw new Error(`Recipient ${recipientId} not found on envelope ${envelopeId}`);
  }

  if (recipient.signingStatus !== SigningStatus.NOT_SIGNED) {
    return;
  }

  const { branding, emailLanguage, senderEmail } = await getEmailContext({
    emailType: 'RECIPIENT',
    source: { type: 'team', teamId: envelope.teamId },
    meta: envelope.documentMeta,
  });

  const i18n = await getI18nInstance(emailLanguage);

  const signDocumentLink = `${NEXT_PUBLIC_WEBAPP_URL()}/sign/${recipient.token}`;

  const daysRemaining = recipient.expiresAt
    ? Math.max(0, Math.ceil((recipient.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const template = createElement(DocumentReminderEmailTemplate, {
    senderName: envelope.user.name || envelope.user.email,
    recipientName: recipient.name || recipient.email,
    documentName: envelope.title,
    signDocumentLink,
    daysRemaining,
    assetBaseUrl: NEXT_PUBLIC_WEBAPP_URL(),
  });

  await io.runTask('send-reminder-email', async () => {
    const [html, text] = await Promise.all([
      renderEmailWithI18N(template, { lang: emailLanguage, branding }),
      renderEmailWithI18N(template, { lang: emailLanguage, branding, plainText: true }),
    ]);

    await mailer.sendMail({
      to: {
        name: recipient.name || '',
        address: recipient.email,
      },
      from: senderEmail,
      subject: i18n._(msg`Reminder: please sign "${envelope.title}"`),
      html,
      text,
    });
  });

  await io.runTask('create-reminder-log', async () => {
    await prisma.documentReminderLog.create({
      data: { envelopeId, recipientId: recipient.id },
    });
  });

  await io.runTask('create-audit-log', async () => {
    await prisma.documentAuditLog.create({
      data: createDocumentAuditLogData({
        type: DOCUMENT_AUDIT_LOG_TYPE.REMINDER_SENT,
        envelopeId,
        data: {
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          recipientName: recipient.name || '',
        },
      }),
    });
  });
};
