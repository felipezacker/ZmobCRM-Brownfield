import { useCallback, useEffect, useState } from 'react';

interface UseInviteModalParams {
  addToast: (message: string, type: 'success' | 'error') => void;
}

interface ActiveInvite {
  id: string;
  token: string;
  role: string;
  email?: string | null;
  expires_at: string | null;
  used_at: string | null;
}

export function useInviteModal({ addToast }: UseInviteModalParams) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserRole, setNewUserRole] = useState('corretor');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInvites, setActiveInvites] = useState<ActiveInvite[]>([]);
  const [expirationDays, setExpirationDays] = useState<number | null>(7);
  const [emailInput, setEmailInput] = useState('');
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);

  const fetchActiveInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Falha ao carregar convites (HTTP ${res.status})`);
      }

      const invites = data?.invites || [];
      const nowTs = Date.now();
      const validInvites = (invites || []).filter((invite: { used_at?: string | null; expires_at?: string | null }) => {
        if (invite.used_at) return false;
        if (!invite.expires_at) return true;
        const expiresTs = Date.parse(invite.expires_at);
        return expiresTs > nowTs;
      });
      setActiveInvites([...validInvites]);
    } catch (error) {
      console.error('Error fetching invites:', error);
      setActiveInvites([]);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setError(null);
    setNewUserRole('corretor');
    setExpirationDays(7);
    setEmailInput('');
    setFallbackLink(null);
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      fetchActiveInvites();
    }
  }, [fetchActiveInvites, isModalOpen]);

  const handleGenerateLink = async () => {
    setSendingInvites(true);
    setError(null);
    try {
      const expiresAt = expirationDays
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role: newUserRole,
          expiresAt,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Erro ao gerar link (HTTP ${res.status})`);
      }

      await fetchActiveInvites();
      await new Promise(resolve => setTimeout(resolve, 100));
      addToast('Novo link gerado!', 'success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar link');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Erro ao remover link (HTTP ${res.status})`);
      }

      await fetchActiveInvites();
      addToast('Link removido!', 'success');
    } catch {
      addToast('Erro ao remover link', 'error');
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(link);
    addToast('Link copiado!', 'success');
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendEmailInvite = async () => {
    setFallbackLink(null);

    if (!emailInput.trim() || !isValidEmail(emailInput.trim())) {
      setError('Informe um email valido');
      return;
    }

    setSendingEmail(true);
    setError(null);
    try {
      const expiresAt = expirationDays
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const res = await fetch('/api/settings/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: emailInput.trim(),
          role: newUserRole,
          expiresAt,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Erro ao enviar convite (HTTP ${res.status})`);
      }

      await fetchActiveInvites();

      if (data?.emailSent === false && data?.link) {
        // AC3: Email failed but invite was created — show fallback link
        setFallbackLink(data.link);
        addToast('Convite criado, mas o email falhou. Copie o link manualmente.', 'error');
      } else {
        setEmailInput('');
        addToast('Convite enviado por email!', 'success');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setSendingEmail(false);
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
    newUserRole,
    setNewUserRole,
    sendingInvites,
    sendingEmail,
    error,
    activeInvites,
    expirationDays,
    setExpirationDays,
    emailInput,
    setEmailInput,
    fallbackLink,
    closeModal,
    handleGenerateLink,
    handleSendEmailInvite,
    handleDeleteInvite,
    copyLink,
    isValidEmail,
  };
}
