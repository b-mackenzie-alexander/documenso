import { Trans } from '@lingui/react/macro';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type PendingDocumentSummary = {
  documentName: string;
  pendingRecipientCount: number;
  daysRemaining: number | null;
  documentLink: string;
};

export type TemplateSenderReminderDigestProps = {
  ownerName: string;
  teamName: string;
  pendingDocuments: PendingDocumentSummary[];
  assetBaseUrl: string;
};

export const TemplateSenderReminderDigest = ({
  ownerName,
  teamName,
  pendingDocuments,
  assetBaseUrl,
}: TemplateSenderReminderDigestProps) => {
  const count = pendingDocuments.length;

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold text-primary">
          {count === 1 ? (
            <Trans>1 document in {teamName} is awaiting a signature</Trans>
          ) : (
            <Trans>
              {count} documents in {teamName} are awaiting signatures
            </Trans>
          )}
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          <Trans>Hi {ownerName}, here's a summary of documents that still need attention.</Trans>
        </Text>

        {pendingDocuments.map((doc, index) => (
          <Section key={index} className="my-4 border-b border-slate-100 pb-4">
            <Text className="mb-0 font-semibold text-slate-700">{doc.documentName}</Text>

            <Text className="my-0 text-sm text-slate-400">
              {doc.pendingRecipientCount === 1 ? (
                <Trans>1 recipient pending</Trans>
              ) : (
                <Trans>{doc.pendingRecipientCount} recipients pending</Trans>
              )}
              {doc.daysRemaining !== null && doc.daysRemaining > 0 && (
                <Trans>
                  {' '}
                  · {doc.daysRemaining} day{doc.daysRemaining === 1 ? '' : 's'} remaining
                </Trans>
              )}
            </Text>

            <Button
              className="mt-2 inline-flex items-center justify-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 no-underline"
              href={doc.documentLink}
            >
              <Trans>View Document</Trans>
            </Button>
          </Section>
        ))}
      </Section>
    </>
  );
};

export default TemplateSenderReminderDigest;
