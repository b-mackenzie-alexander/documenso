import { z } from 'zod';

import { type JobDefinition } from '../../client/_internal/job';

const SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_ID = 'send.recipient.reminder.email';

const SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_SCHEMA = z.object({
  recipientId: z.number(),
  envelopeId: z.string(),
});

export type TSendRecipientReminderEmailJobDefinition = z.infer<
  typeof SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_SCHEMA
>;

export const SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION = {
  id: SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_ID,
  name: 'Send Recipient Reminder Email',
  version: '1.0.0',
  trigger: {
    name: SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_ID,
    schema: SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_SCHEMA,
  },
  handler: async ({ payload, io }) => {
    const handler = await import('./send-recipient-reminder-email.handler');

    await handler.run({ payload, io });
  },
} as const satisfies JobDefinition<
  typeof SEND_RECIPIENT_REMINDER_EMAIL_JOB_DEFINITION_ID,
  TSendRecipientReminderEmailJobDefinition
>;
