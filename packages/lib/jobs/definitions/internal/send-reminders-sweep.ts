import { z } from 'zod';

import { type JobDefinition } from '../../client/_internal/job';

const SEND_REMINDERS_SWEEP_JOB_DEFINITION_ID = 'internal.send-reminders-sweep';

const SEND_REMINDERS_SWEEP_JOB_DEFINITION_SCHEMA = z.object({});

export type TSendRemindersSweepJobDefinition = z.infer<
  typeof SEND_REMINDERS_SWEEP_JOB_DEFINITION_SCHEMA
>;

export const SEND_REMINDERS_SWEEP_JOB_DEFINITION = {
  id: SEND_REMINDERS_SWEEP_JOB_DEFINITION_ID,
  name: 'Send Reminders Sweep',
  version: '1.0.0',
  trigger: {
    name: SEND_REMINDERS_SWEEP_JOB_DEFINITION_ID,
    schema: SEND_REMINDERS_SWEEP_JOB_DEFINITION_SCHEMA,
    cron: '*/15 * * * *', // Every 15 minutes, matching expire-recipients-sweep cadence.
  },
  handler: async ({ payload, io }) => {
    const handler = await import('./send-reminders-sweep.handler');

    await handler.run({ payload, io });
  },
} as const satisfies JobDefinition<
  typeof SEND_REMINDERS_SWEEP_JOB_DEFINITION_ID,
  TSendRemindersSweepJobDefinition
>;
