import ContactCockpitClient from '@/features/contacts/cockpit/ContactCockpitClient';

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
  return <ContactCockpitClient contactId={contactId} />;
}
