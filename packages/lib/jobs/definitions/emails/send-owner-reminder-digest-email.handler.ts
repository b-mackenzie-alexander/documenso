import { createElement } from 'react';

import { msg } from '@lingui/core/macro';
import { SigningStatus } from '@prisma/client';

import { mailer } from '@documenso/email/mailer';
import { SenderReminderDigestEmailTemplate } from '@documenso/email/templates/sender-reminder-digest';
import { prisma } from '@documenso/prisma';

import { getI18nInstance } from '../../../client-only/providers/i18n-server';
import { NEXT_PUBLIC_WEBAPP_URL } from '../../../constants/app';
import { getEmailContext } from '../../../server-only/email/get-email-context';
import { extractDerivedDocumentEmailSettings } from '../../../types/document-email';
import { renderEmailWithI18N } from '../../../utils/render-email-with-i18n';
import { formatDocumentsPath } from '../../../utils/teams';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendOwnerReminderDigestEmailJobDefinition } from './send-owner-reminder-digest-email';

export const run = async ({
  payload,
  io,
}: {
  payload: TSendOwnerReminderDigestEmailJobDefinition;
  io: JobRunIO;
}) => {
  const { teamId, envelopeIds } = payload;

  const envelopes = await prisma.envelope.findMany({
    where: { id: { in: envelopeIds } },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      documentMeta: true,
      team: {
        select: { name: true, url: true },
      },
      recipients: {
        select: { signingStatus: true, expiresAt: true },
      },
    },
  });

  if (envelopes.length === 0) {
    return;
  }

  const firstEnvelope = envelopes[0];

  const isDigestEnabled = extractDerivedDocumentEmailSettings(
    firstEnvelope.documentMeta,
  ).ownerReminderDigest;

  if (!isDigestEnabled) {
    return;
  }

  const { branding, emailLanguage, senderEmail } = await getEmailContext({
    emailType: 'INTERNAL',
    source: { type: 'team', teamId },
    meta: firstEnvelope.documentMeta,
  });

  const i18n = await getI18nInstance(emailLanguage);

  const pendingDocuments = envelopes.map((envelope) => {
    const pendingRecipients = envelope.recipients.filter(
      (r) => r.signingStatus === SigningStatus.NOT_SIGNED,
    );

    const earliestExpiry = pendingRecipients
      .map((r) => r.expiresAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const daysRemaining = earliestExpiry
      ? Math.max(0, Math.ceil((earliestExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      documentName: envelope.title,
      pendingRecipientCount: pendingRecipients.length,
      daysRemaining,
      documentLink: `${NEXT_PUBLIC_WEBAPP_URL()}${formatDocumentsPath(envelope.team.url)}/${envelope.id}`,
    };
  });

  const owner = firstEnvelope.user;
  const teamName = firstEnvelope.team.name;
  const count = envelopes.length;

  const template = createElement(SenderReminderDigestEmailTemplate, {
    ownerName: owner.name || owner.email,
    teamName,
    pendingDocuments,
    assetBaseUrl: NEXT_PUBLIC_WEBAPP_URL(),
  });

  await io.runTask('send-digest-email', async () => {
    const [html, text] = await Promise.all([
      renderEmailWithI18N(template, { lang: emailLanguage, branding }),
      renderEmailWithI18N(template, { lang: emailLanguage, branding, plainText: true }),
    ]);

    await mailer.sendMail({
      to: {
        name: owner.name || '',
        address: owner.email,
      },
      from: senderEmail,
      subject: i18n._(
        msg`Reminder: ${count} document${count === 1 ? '' : 's'} awaiting signatures in "${teamName}"`,
      ),
      html,
      text,
    });
  });

  await io.runTask('create-reminder-logs', async () => {
    await prisma.documentReminderLog.createMany({
      data: envelopeIds.map((eid) => ({ envelopeId: eid })),
    });
  });
};
