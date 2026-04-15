import { z } from 'zod';

import { type JobDefinition } from '../../client/_internal/job';

const SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_ID = 'send.owner.reminder.digest.email';

const SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_SCHEMA = z.object({
  teamId: z.number(),
  // Array of envelope summaries pre-computed by the sweep handler.
  // Handler renders these directly without re-querying, keeping the digest job lightweight.
  envelopeIds: z.array(z.string()),
});

export type TSendOwnerReminderDigestEmailJobDefinition = z.infer<
  typeof SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_SCHEMA
>;

export const SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION = {
  id: SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_ID,
  name: 'Send Owner Reminder Digest Email',
  version: '1.0.0',
  trigger: {
    name: SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_ID,
    schema: SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_SCHEMA,
  },
  handler: async ({ payload, io }) => {
    const handler = await import('./send-owner-reminder-digest-email.handler');

    await handler.run({ payload, io });
  },
} as const satisfies JobDefinition<
  typeof SEND_OWNER_REMINDER_DIGEST_EMAIL_JOB_DEFINITION_ID,
  TSendOwnerReminderDigestEmailJobDefinition
>;
