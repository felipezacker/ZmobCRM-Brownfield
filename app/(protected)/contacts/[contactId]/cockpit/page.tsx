import ContactCockpitClient from '@/features/contacts/cockpit/ContactCockpitClient';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

/**
 * Cockpit do contato — scaffold inicial.
 * URL: /contacts/[contactId]/cockpit
 */
export default async function ContactCockpitPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  return (
    <ErrorBoundary>
      <ContactCockpitClient contactId={contactId} />
    </ErrorBoundary>
  );
}
