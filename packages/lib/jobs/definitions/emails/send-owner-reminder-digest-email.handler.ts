import { createElement } from 'react';

import { msg } from '@lingui/core/macro';

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

export const run = ({
  payload,
  io,
}: {
  payload: TSendOwnerReminderDigestEmailJobDefinition;
  io: JobRunIO;
}): Promise<void> => {
  const { teamId, envelopeIds } = payload;

  // TODO(Person 2): Implement sender digest dispatch.
  //
  // Steps:
  // 1. Fetch team with owner (user) and all envelopes from envelopeIds payload.
  //    Include documentMeta and pending recipient count per envelope.
  //
  // 2. Check ownerReminderDigest setting on first envelope's documentMeta:
  //      const isDigestEnabled = extractDerivedDocumentEmailSettings(documentMeta).ownerReminderDigest;
  //      if (!isDigestEnabled) return;
  //    Note: if the sender disabled digests, skip — don't send for any envelope in this team.
  //
  // 3. Build pendingDocuments array:
  //      pendingDocuments = envelopes.map(e => ({
  //        documentName: e.title,
  //        pendingRecipientCount: e.recipients.filter(r => r.signingStatus === 'NOT_SIGNED').length,
  //        daysRemaining: ..., // calculate from expiration period
  //        documentLink: `${NEXT_PUBLIC_WEBAPP_URL()}${formatDocumentsPath(team.url)}/${e.id}`,
  //      }));
  //
  // 4. getEmailContext + getI18nInstance + createElement(SenderReminderDigestEmailTemplate, {...})
  //    + renderEmailWithI18N + mailer.sendMail to team owner.
  //    Wrap in io.runTask('send-digest-email').
  //
  // 5. INSERT one DocumentReminderLog per envelope (recipientId = null = digest entry):
  //    await io.runTask('create-reminder-logs', async () => {
  //      await prisma.documentReminderLog.createMany({
  //        data: envelopeIds.map((eid) => ({ envelopeId: eid })),
  //      });
  //    });

  void teamId;
  void envelopeIds;
  void createElement;
  void msg;
  void mailer;
  void SenderReminderDigestEmailTemplate;
  void prisma;
  void getI18nInstance;
  void NEXT_PUBLIC_WEBAPP_URL;
  void getEmailContext;
  void extractDerivedDocumentEmailSettings;
  void renderEmailWithI18N;
  void formatDocumentsPath;

  io.logger.info(`send-owner-reminder-digest-email: not yet implemented (team ${teamId})`);

  return Promise.resolve();
};
