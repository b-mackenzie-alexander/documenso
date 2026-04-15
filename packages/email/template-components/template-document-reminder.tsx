import { Trans } from '@lingui/react/macro';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type TemplateDocumentReminderProps = {
  senderName: string;
  recipientName: string;
  documentName: string;
  signDocumentLink: string;
  daysRemaining: number | null;
  assetBaseUrl: string;
};

export const TemplateDocumentReminder = ({
  senderName,
  documentName,
  signDocumentLink,
  daysRemaining,
  assetBaseUrl,
}: TemplateDocumentReminderProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="text-primary mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold">
          {daysRemaining !== null && daysRemaining > 0 ? (
            <Trans>
              Reminder: you have {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left to sign
              <br />
              "{documentName}"
            </Trans>
          ) : (
            <Trans>
              Reminder: your signature is still needed on
              <br />
              "{documentName}"
            </Trans>
          )}
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          <Trans>{senderName} is waiting for your signature.</Trans>
        </Text>

        <Section className="mb-6 mt-8 text-center">
          <Button
            className="bg-documenso-500 inline-flex items-center justify-center rounded-lg px-6 py-3 text-center text-sm font-medium text-black no-underline"
            href={signDocumentLink}
          >
            <Trans>Sign Document</Trans>
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentReminder;
