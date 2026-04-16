import { DocumentStatus, SigningStatus } from '@prisma/client';
import { DateTime } from 'luxon';

import { prisma } from '@documenso/prisma';

import { jobs } from '../../client';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendRemindersSweepJobDefinition } from './send-reminders-sweep';

export const run = async ({
  io,
}: {
  payload: TSendRemindersSweepJobDefinition;
  io: JobRunIO;
}) => { // eslint-disable-line @typescript-eslint/require-await -- stub; add awaits when implemented
  // TODO(Person 1): Implement sweep logic.
  //
  // Steps:
  // 1. Query pending envelopes with reminderEnabled=true and a set reminderIntervalDays.
  //    Filter to envelopes where the document is still PENDING.
  //
  //    const envelopes = await prisma.envelope.findMany({
  //      where: {
  //        status: DocumentStatus.PENDING,
  //        documentMeta: {
  //          reminderEnabled: true,
  //          reminderIntervalDays: { not: null },
  //        },
  //      },
  //      include: {
  //        documentMeta: true,
  //        recipients: {
  //          where: {
  //            signingStatus: { notIn: [SigningStatus.SIGNED, SigningStatus.REJECTED] },
  //            documentDeletedAt: null,
  //          },
  //        },
  //        reminderLogs: {
  //          orderBy: { createdAt: 'desc' },
  //        },
  //      },
  //      take: 1000,
  //    });
  //
  // 2. For each envelope and each unsigned recipient, determine if a reminder is due.
  //    A reminder is due when:
  //      (now - lastReminderSentAt) >= reminderIntervalDays
  //    where lastReminderSentAt is the most recent DocumentReminderLog.createdAt for
  //    that recipient, or the envelope sentAt (createdAt) if no log exists yet.
  //
  //    Use DateTime from 'luxon' for date arithmetic.
  //
  // 3. Collect recipients due for a reminder. Cap at 1000 total across all envelopes.
  //
  // 4. Fan out per-recipient email jobs:
  //    await Promise.allSettled(
  //      dueRecipients.map((r) =>
  //        jobs.triggerJob({
  //          name: 'send.recipient.reminder.email',
  //          payload: { recipientId: r.id, envelopeId: r.envelopeId },
  //        }),
  //      ),
  //    );
  //
  // 5. Group due envelopes by teamId. For each team with at least one due envelope,
  //    trigger the digest job:
  //    await Promise.allSettled(
  //      Object.entries(byTeam).map(([teamId, envIds]) =>
  //        jobs.triggerJob({
  //          name: 'send.owner.reminder.digest.email',
  //          payload: { teamId: Number(teamId), envelopeIds: envIds },
  //        }),
  //      ),
  //    );

  // Reference implementations:
  //   expire-recipients-sweep.handler.ts  — sweep query pattern + Promise.allSettled fan-out
  //   process-recipient-expired.handler.ts — io.runTask idempotency pattern

  void DocumentStatus;
  void SigningStatus;
  void DateTime;
  void prisma;
  void jobs;

  io.logger.info('send-reminders-sweep: not yet implemented');
};
