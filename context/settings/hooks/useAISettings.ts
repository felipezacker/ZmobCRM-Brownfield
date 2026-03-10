import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { settingsService } from '@/lib/supabase';
import { AI_DEFAULT_MODELS, AI_DEFAULT_PROVIDER } from '@/lib/ai/defaults';

interface AIConfig {
  provider: 'google' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  thinking: boolean;
  search: boolean;
  anthropicCaching: boolean;
}

export function useAISettings(
  profileId: string | null | undefined,
  setError: (msg: string) => void,
  pathname: string | null,
  isGlobalAIOpen: boolean,
) {
  // AI Config state - separate keys per provider
  const [aiProvider, setAiProviderState] = useState<AIConfig['provider']>(AI_DEFAULT_PROVIDER);
  const [aiGoogleKey, setAiGoogleKeyState] = useState<string>('');
  const [aiOpenaiKey, setAiOpenaiKeyState] = useState<string>('');
  const [aiAnthropicKey, setAiAnthropicKeyState] = useState<string>('');
  const [aiModel, setAiModelState] = useState<string>(AI_DEFAULT_MODELS[AI_DEFAULT_PROVIDER]);
  const [aiOrgEnabled, setAiOrgEnabledState] = useState<boolean>(true);
  const [aiHasGoogleKey, setAiHasGoogleKey] = useState<boolean>(false);
  const [aiHasOpenaiKey, setAiHasOpenaiKey] = useState<boolean>(false);
  const [aiHasAnthropicKey, setAiHasAnthropicKey] = useState<boolean>(false);
  const [aiFeatureFlags, setAiFeatureFlags] = useState<Record<string, boolean>>({});
  const [aiThinking, setAiThinkingState] = useState<boolean>(true);
  const [aiSearch, setAiSearchState] = useState<boolean>(true);
  const [aiAnthropicCaching, setAiAnthropicCachingState] = useState<boolean>(false);

  // Avoid duplicate network calls (dev StrictMode / profile hydration)
  const aiConfigLoadedForUserRef = useRef<string | null>(null);
  const aiFeaturesLoadedForUserRef = useRef<string | null>(null);

  // Computed: current API key based on provider
  const aiApiKey = useMemo(() => {
    switch (aiProvider) {
      case 'google': return aiGoogleKey;
      case 'openai': return aiOpenaiKey;
      case 'anthropic': return aiAnthropicKey;
      default: return '';
    }
  }, [aiProvider, aiGoogleKey, aiOpenaiKey, aiAnthropicKey]);

  const aiKeyConfigured = useMemo(() => {
    switch (aiProvider) {
      case 'google': return aiHasGoogleKey || Boolean(aiGoogleKey && aiGoogleKey.trim());
      case 'openai': return aiHasOpenaiKey || Boolean(aiOpenaiKey && aiOpenaiKey.trim());
      case 'anthropic': return aiHasAnthropicKey || Boolean(aiAnthropicKey && aiAnthropicKey.trim());
      default: return false;
    }
  }, [aiProvider, aiHasGoogleKey, aiHasOpenaiKey, aiHasAnthropicKey, aiGoogleKey, aiOpenaiKey, aiAnthropicKey]);

  const shouldLoadAiFeatures = useMemo(() => {
    const inAiSettings = (pathname || '').startsWith('/settings/ai');
    return Boolean(inAiSettings || isGlobalAIOpen);
  }, [pathname, isGlobalAIOpen]);

  // Load user-level AI preferences (thinking, search, caching)
  const loadUserAIPreferences = useCallback(async () => {
    const { data: settings } = await settingsService.get();
    if (settings) {
      setAiThinkingState(settings.aiThinking);
      setAiSearchState(settings.aiSearch);
      setAiAnthropicCachingState(settings.aiAnthropicCaching);
    }
  }, []);

  // Load org-wide AI config (provider, model, keys)
  const loadOrgAIConfig = useCallback(async () => {
    if (!profileId) return;
    if (aiConfigLoadedForUserRef.current === profileId) return;

    // Mark as "in-flight" immediately to avoid duplicate requests in dev StrictMode
    aiConfigLoadedForUserRef.current = profileId;
    try {
      const aiRes = await fetch('/api/settings/ai', {
        method: 'GET',
        headers: { accept: 'application/json' },
        credentials: 'include',
      });

      if (aiRes.ok) {
        const aiData = (await aiRes.json()) as {
          aiEnabled: boolean;
          aiProvider: AIConfig['provider'];
          aiModel: string;
          aiGoogleKey: string;
          aiOpenaiKey: string;
          aiAnthropicKey: string;
          aiHasGoogleKey?: boolean;
          aiHasOpenaiKey?: boolean;
          aiHasAnthropicKey?: boolean;
        };

        setAiOrgEnabledState(typeof aiData.aiEnabled === 'boolean' ? aiData.aiEnabled : true);
        setAiProviderState(aiData.aiProvider);
        setAiModelState(aiData.aiModel);
        setAiGoogleKeyState(aiData.aiGoogleKey);
        setAiOpenaiKeyState(aiData.aiOpenaiKey);
        setAiAnthropicKeyState(aiData.aiAnthropicKey);
        setAiHasGoogleKey(Boolean(aiData.aiHasGoogleKey));
        setAiHasOpenaiKey(Boolean(aiData.aiHasOpenaiKey));
        setAiHasAnthropicKey(Boolean(aiData.aiHasAnthropicKey));
      } else {
        const body = await aiRes.json().catch(() => null);
        const message = body?.error || `Falha ao carregar config de IA (HTTP ${aiRes.status})`;
        console.warn('[Settings] Falha ao carregar config org-wide de IA:', message);
        aiConfigLoadedForUserRef.current = null;
      }
    } catch (e) {
      aiConfigLoadedForUserRef.current = null;
      throw e;
    }
  }, [profileId]);

  // Lazy-load AI feature flags only when needed (settings/ai or global AI UI)
  useEffect(() => {
    if (!profileId) return;
    if (!shouldLoadAiFeatures) return;
    if (aiFeaturesLoadedForUserRef.current === profileId) return;

    aiFeaturesLoadedForUserRef.current = profileId;

    (async () => {
      try {
        const ffRes = await fetch('/api/settings/ai-features', {
          method: 'GET',
          headers: { accept: 'application/json' },
          credentials: 'include',
        });
        if (ffRes.ok) {
          const ffData = (await ffRes.json().catch(() => null)) as { flags?: Record<string, boolean> } | null;
          setAiFeatureFlags((ffData?.flags as Record<string, boolean>) || {});
        } else {
          console.warn('[Settings] Falha ao carregar flags de IA (features).', { status: ffRes.status });
          aiFeaturesLoadedForUserRef.current = null;
        }
      } catch {
        aiFeaturesLoadedForUserRef.current = null;
      }
    })();
  }, [profileId, pathname, isGlobalAIOpen, shouldLoadAiFeatures]);

  // Persistence helpers
  const updateSettings = useCallback(async (updates: Record<string, unknown>) => {
    const { error: updateError } = await settingsService.update(updates);
    if (updateError) {
      setError(updateError.message);
    }
  }, [setError]);

  const updateOrgAISettings = useCallback(async (updates: Record<string, unknown>) => {
    const res = await fetch('/api/settings/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.error || `Falha ao salvar config de IA (HTTP ${res.status})`;
      setError(message);
      throw new Error(message);
    }
  }, [setError]);

  // Setters
  const setAiProvider = useCallback(
    async (provider: AIConfig['provider']) => {
      await updateOrgAISettings({ aiProvider: provider });
      setAiProviderState(provider);
    },
    [updateOrgAISettings]
  );

  const setAiApiKey = useCallback(
    async (key: string) => {
      switch (aiProvider) {
        case 'google':
          await updateOrgAISettings({ aiGoogleKey: key });
          setAiGoogleKeyState(key);
          break;
        case 'openai':
          await updateOrgAISettings({ aiOpenaiKey: key });
          setAiOpenaiKeyState(key);
          break;
        case 'anthropic':
          await updateOrgAISettings({ aiAnthropicKey: key });
          setAiAnthropicKeyState(key);
          break;
      }
    },
    [updateOrgAISettings, aiProvider]
  );

  const setAiModel = useCallback(
    async (model: string) => {
      await updateOrgAISettings({ aiModel: model });
      setAiModelState(model);
    },
    [updateOrgAISettings]
  );

  const setAiOrgEnabled = useCallback(
    async (enabled: boolean) => {
      await updateOrgAISettings({ aiEnabled: enabled });
      setAiOrgEnabledState(enabled);
    },
    [updateOrgAISettings]
  );

  const setAIFeatureFlag = useCallback(
    async (key: string, enabled: boolean) => {
      const res = await fetch('/api/settings/ai-features', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, enabled }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = body?.error || `Falha ao salvar flag de IA (HTTP ${res.status})`;
        setError(message);
        throw new Error(message);
      }

      setAiFeatureFlags((prev) => ({ ...prev, [key]: enabled }));
    },
    [setError]
  );

  const setAiThinking = useCallback(
    async (enabled: boolean) => {
      setAiThinkingState(enabled);
      await updateSettings({ aiThinking: enabled });
    },
    [updateSettings]
  );

  const setAiSearch = useCallback(
    async (enabled: boolean) => {
      setAiSearchState(enabled);
      await updateSettings({ aiSearch: enabled });
    },
    [updateSettings]
  );

  const setAiAnthropicCaching = useCallback(
    async (enabled: boolean) => {
      setAiAnthropicCachingState(enabled);
      await updateSettings({ aiAnthropicCaching: enabled });
    },
    [updateSettings]
  );

  return {
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey,
    aiGoogleKey,
    aiOpenaiKey,
    aiAnthropicKey,
    aiModel,
    setAiModel,
    aiOrgEnabled,
    setAiOrgEnabled,
    aiKeyConfigured,
    aiFeatureFlags,
    setAIFeatureFlag,
    aiThinking,
    setAiThinking,
    aiSearch,
    setAiSearch,
    aiAnthropicCaching,
    setAiAnthropicCaching,
    loadUserAIPreferences,
    loadOrgAIConfig,
  };
}
