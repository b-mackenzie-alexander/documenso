import { DocumentStatus, SigningStatus } from '@prisma/client';
import { DateTime } from 'luxon';

import { prisma } from '@documenso/prisma';

import { jobs } from '../../client';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendRemindersSweepJobDefinition } from './send-reminders-sweep';

export const run = async ({ io }: { payload: TSendRemindersSweepJobDefinition; io: JobRunIO }) => {
  const now = DateTime.now();

  const envelopes = await prisma.envelope.findMany({
    where: {
      status: DocumentStatus.PENDING,
      documentMeta: {
        reminderEnabled: true,
        reminderIntervalDays: { not: null },
      },
    },
    include: {
      documentMeta: true,
      recipients: {
        where: {
          signingStatus: { notIn: [SigningStatus.SIGNED, SigningStatus.REJECTED] },
          documentDeletedAt: null,
        },
      },
      reminderLogs: {
        orderBy: { createdAt: 'desc' as const },
      },
    },
    take: 1000,
  });

  if (envelopes.length === 0) {
    io.logger.info('No envelopes with reminders enabled');
    return;
  }

  const dueRecipients: Array<{ id: number; envelopeId: string }> = [];
  const dueEnvelopesByTeam = new Map<number, Set<string>>();

  for (const envelope of envelopes) {
    const intervalDays = envelope.documentMeta?.reminderIntervalDays;

    if (!intervalDays) {
      continue;
    }

    for (const recipient of envelope.recipients) {
      const lastLog = envelope.reminderLogs.find((log) => log.recipientId === recipient.id);
      const lastSentAt = lastLog
        ? DateTime.fromJSDate(lastLog.createdAt)
        : DateTime.fromJSDate(envelope.createdAt);

      const daysSinceLast = now.diff(lastSentAt, 'days').days;

      if (daysSinceLast >= intervalDays) {
        dueRecipients.push({ id: recipient.id, envelopeId: envelope.id });

        const teamEnvelopes = dueEnvelopesByTeam.get(envelope.teamId) ?? new Set<string>();
        teamEnvelopes.add(envelope.id);
        dueEnvelopesByTeam.set(envelope.teamId, teamEnvelopes);
      }

      // Cap matches the take: 1000 query limit — remainder picked up in next cron run.
      if (dueRecipients.length >= 1000) {
        break;
      }
    }

    if (dueRecipients.length >= 1000) {
      break;
    }
  }

  if (dueRecipients.length === 0) {
    io.logger.info('No recipients due for reminders');
    return;
  }

  io.logger.info(`Found ${dueRecipients.length} recipients due for reminders`);

  const recipientResults = await Promise.allSettled(
    dueRecipients.map(async (r) => {
      await jobs.triggerJob({
        name: 'send.recipient.reminder.email',
        payload: { recipientId: r.id, envelopeId: r.envelopeId },
      });
    }),
  );

  for (const result of recipientResults) {
    if (result.status === 'rejected') {
      io.logger.error('Failed to trigger recipient reminder', { reason: result.reason });
    }
  }

  const digestResults = await Promise.allSettled(
    Array.from(dueEnvelopesByTeam.entries()).map(async ([teamId, envelopeIds]) => {
      await jobs.triggerJob({
        name: 'send.owner.reminder.digest.email',
        payload: { teamId, envelopeIds: Array.from(envelopeIds) },
      });
    }),
  );

  for (const result of digestResults) {
    if (result.status === 'rejected') {
      io.logger.error('Failed to trigger owner digest', { reason: result.reason });
    }
  }
};
