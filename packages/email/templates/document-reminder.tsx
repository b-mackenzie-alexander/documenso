import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';

import { Body, Container, Head, Hr, Html, Img, Preview, Section } from '../components';
import { useBranding } from '../providers/branding';
import { TemplateFooter } from '../template-components/template-footer';
import type { TemplateDocumentReminderProps } from '../template-components/template-document-reminder';
import { TemplateDocumentReminder } from '../template-components/template-document-reminder';

export type DocumentReminderEmailTemplateProps = Partial<TemplateDocumentReminderProps>;

export const DocumentReminderEmailTemplate = ({
  senderName = 'Lucas Smith',
  recipientName = 'John Doe',
  documentName = 'Open Source Pledge.pdf',
  signDocumentLink = 'https://documenso.com',
  daysRemaining = 3,
  assetBaseUrl = 'http://localhost:3002',
}: DocumentReminderEmailTemplateProps) => {
  const { _ } = useLingui();
  const branding = useBranding();

  const previewText =
    daysRemaining !== null && daysRemaining > 0
      ? msg`Reminder: you have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to sign "${documentName}"`
      : msg`Reminder: your signature is still needed on "${documentName}"`;

  const getAssetUrl = (path: string) => {
    return new URL(path, assetBaseUrl).toString();
  };

  return (
    <Html>
      <Head />
      <Preview>{_(previewText)}</Preview>

      <Body className="mx-auto my-auto bg-white font-sans">
        <Section>
          <Container className="mx-auto mb-2 mt-8 max-w-xl rounded-lg border border-solid border-slate-200 p-4 backdrop-blur-sm">
            <Section>
              {branding.brandingEnabled && branding.brandingLogo ? (
                <Img src={branding.brandingLogo} alt="Branding Logo" className="mb-4 h-6" />
              ) : (
                <Img
                  src={getAssetUrl('/static/logo.png')}
                  alt="Documenso Logo"
                  className="mb-4 h-6"
                />
              )}

              <TemplateDocumentReminder
                senderName={senderName}
                recipientName={recipientName}
                documentName={documentName}
                signDocumentLink={signDocumentLink}
                daysRemaining={daysRemaining}
                assetBaseUrl={assetBaseUrl}
              />
            </Section>
          </Container>

          <Hr className="mx-auto mt-12 max-w-xl" />

          <Container className="mx-auto max-w-xl">
            <TemplateFooter />
          </Container>
        </Section>
      </Body>
    </Html>
  );
};

export default DocumentReminderEmailTemplate;
