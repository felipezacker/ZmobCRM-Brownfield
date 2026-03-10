import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

const extractErrorMsg = (e: unknown, fallback: string): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return fallback;
};

type Toast = (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;

export function useApiKeys(addToast: Toast) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRow | null>(null);
  const [newKeyName, setNewKeyName] = useState('n8n');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdPrefix, setCreatedPrefix] = useState<string | null>(null);
  const [apiKeyToken, setApiKeyToken] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const activeToken = apiKeyToken.trim() || createdToken?.trim() || '';

  const loadKeys = useCallback(async () => {
    if (!supabase) {
      addToast('Supabase não configurado neste ambiente.', 'error');
      return;
    }
    setLoadingKeys(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id,name,key_prefix,created_at,last_used_at,revoked_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setKeys((data || []) as ApiKeyRow[]);
    } catch (e: unknown) {
      addToast(extractErrorMsg(e, 'Erro ao carregar chaves'), 'error');
    } finally {
      setLoadingKeys(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const createKey = async () => {
    if (!supabase) {
      addToast('Supabase não configurado neste ambiente.', 'error');
      return;
    }
    const name = newKeyName.trim() || 'Integração';
    setCreating(true);
    setCreatedToken(null);
    setCreatedPrefix(null);
    setTestResult(null);
    try {
      const { data, error } = await supabase.rpc('create_api_key', { p_name: name });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const token = row?.token as string | undefined;
      const prefix = row?.key_prefix as string | undefined;
      if (!token || !prefix) throw new Error('Resposta inválida ao criar chave');
      setCreatedToken(token);
      setCreatedPrefix(prefix);
      setApiKeyToken(token);
      addToast('Chave criada. Copie agora — ela aparece só uma vez.', 'success');
      await loadKeys();
    } catch (e: unknown) {
      addToast(extractErrorMsg(e, 'Erro ao criar chave'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!supabase) {
      addToast('Supabase não configurado neste ambiente.', 'error');
      return;
    }
    setRevokingId(id);
    try {
      const { error } = await supabase.rpc('revoke_api_key', { p_api_key_id: id });
      if (error) throw error;
      addToast('Chave revogada.', 'success');
      await loadKeys();
    } catch (e: unknown) {
      addToast(extractErrorMsg(e, 'Erro ao revogar chave'), 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const deleteRevokedKey = async (id: string) => {
    if (!supabase) {
      addToast('Supabase não configurado neste ambiente.', 'error');
      return;
    }
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id)
        .not('revoked_at', 'is', null);
      if (error) throw error;
      addToast('Chave excluída.', 'success');
      await loadKeys();
    } catch (e: unknown) {
      addToast(extractErrorMsg(e, 'Erro ao excluir chave'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const openDeleteConfirm = (k: ApiKeyRow) => {
    if (!k.revoked_at) {
      addToast('Você só pode excluir chaves revogadas.', 'warning');
      return;
    }
    setDeleteTarget(k);
    setDeleteConfirmOpen(true);
  };

  const testMe = async () => {
    if (!activeToken) {
      addToast('Cole uma API key (ou crie uma nova) para testar.', 'warning');
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/public/v1/me', {
        headers: { 'X-Api-Key': activeToken },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTestResult({ ok: false, message: json?.error || 'Falha no teste' });
        return;
      }
      setTestResult({ ok: true, message: 'OK — API key validada' });
    } catch (e: unknown) {
      setTestResult({ ok: false, message: extractErrorMsg(e, 'Erro no teste') });
    } finally {
      setTestLoading(false);
    }
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast(`${label} copiado.`, 'success');
    } catch {
      addToast(`Não foi possível copiar ${label.toLowerCase()}.`, 'error');
    }
  };

  return {
    keys,
    loadingKeys,
    loadKeys,
    creating,
    createKey,
    revokingId,
    revokeKey,
    deletingId,
    deleteRevokedKey,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    deleteTarget,
    openDeleteConfirm,
    newKeyName,
    setNewKeyName,
    createdToken,
    createdPrefix,
    apiKeyToken,
    setApiKeyToken,
    activeToken,
    testLoading,
    testMe,
    testResult,
    copy,
  } as const;
}
