import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { LifecycleStage, Product, CustomFieldDefinition, Lead, Contact } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '../AuthContext';
import { useUIStore } from '@/lib/stores';
import { useLifecycleStages } from './hooks/useLifecycleStages';
import { useProductsCatalog } from './hooks/useProductsCatalog';
import { useCustomFields } from './hooks/useCustomFields';
import { useAISettings } from './hooks/useAISettings';
import { useTagsSettings } from './hooks/useTagsSettings';

interface AIConfig {
  provider: 'google' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  thinking: boolean;
  search: boolean;
  anthropicCaching: boolean;
}

interface SettingsContextType {
  // Loading state
  loading: boolean;
  error: string | null;

  // Lifecycle Stages
  lifecycleStages: LifecycleStage[];
  addLifecycleStage: (stage: Omit<LifecycleStage, 'id' | 'order'>) => Promise<LifecycleStage | null>;
  updateLifecycleStage: (id: string, updates: Partial<LifecycleStage>) => Promise<void>;
  deleteLifecycleStage: (id: string, contacts: Contact[]) => Promise<void>;
  reorderLifecycleStages: (newOrder: LifecycleStage[]) => Promise<void>;

  // Products (Catalogo)
  products: Product[];
  /** Recarrega o catalogo de produtos (usado para manter o dropdown do deal atualizado). */
  refreshProducts: () => Promise<void>;

  // Custom Fields (persisted to Supabase custom_field_definitions table)
  customFieldDefinitions: CustomFieldDefinition[];
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => Promise<void>;
  updateCustomField: (id: string, updates: Partial<CustomFieldDefinition>) => Promise<void>;
  removeCustomField: (id: string) => Promise<void>;

  // Tags (persisted to Supabase tags table)
  availableTags: string[];
  addTag: (tag: string) => Promise<void>;
  removeTag: (tag: string) => Promise<void>;

  // AI Config
  aiProvider: AIConfig['provider'];
  setAiProvider: (provider: AIConfig['provider']) => Promise<void>;
  aiApiKey: string; // Current key (based on provider)
  setAiApiKey: (key: string) => Promise<void>;
  aiGoogleKey: string;
  aiOpenaiKey: string;
  aiAnthropicKey: string;
  aiModel: string;
  setAiModel: (model: string) => Promise<void>;
  /** Toggle org-wide: admin controla se IA esta ativa para a organizacao */
  aiOrgEnabled: boolean;
  setAiOrgEnabled: (enabled: boolean) => Promise<void>;
  /** True quando a organizacao tem uma key configurada para o provider atual (sem expor o segredo ao membro). */
  aiKeyConfigured: boolean;
  /** Feature flags (org-wide) para habilitar/desabilitar funcoes especificas de IA. */
  aiFeatureFlags: Record<string, boolean>;
  setAIFeatureFlag: (key: string, enabled: boolean) => Promise<void>;
  aiThinking: boolean;
  setAiThinking: (enabled: boolean) => Promise<void>;
  aiSearch: boolean;
  setAiSearch: (enabled: boolean) => Promise<void>;
  aiAnthropicCaching: boolean;
  setAiAnthropicCaching: (enabled: boolean) => Promise<void>;

  // UI State
  isGlobalAIOpen: boolean;
  setIsGlobalAIOpen: (isOpen: boolean) => void;

  // Legacy Leads (deprecated - kept for compatibility)
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  discardLead: (id: string) => void;

  // Refresh
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Componente React `SettingsProvider`.
 *
 * @param {{ children: ReactNode; }} { children } - Parametro `{ children }`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, organizationId } = useAuth();
  const pathname = usePathname();
  const supabase = createClient()!;

  // Loading & error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State - via Zustand
  const isGlobalAIOpen = useUIStore(state => state.isGlobalAIOpen);
  const setIsGlobalAIOpen = useUIStore(state => state.setIsGlobalAIOpen);

  // Legacy Leads (deprecated)
  const [leads, setLeads] = useState<Lead[]>([]);

  // Composed hooks
  const lifecycle = useLifecycleStages(setError);
  const catalog = useProductsCatalog();
  const customFields = useCustomFields(supabase, organizationId, setError);
  const ai = useAISettings(profile?.id, setError, pathname, isGlobalAIOpen);
  const tags = useTagsSettings(supabase, organizationId, setError);

  // Fetch settings on mount
  const fetchSettings = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // User-level AI preferences
      await ai.loadUserAIPreferences();

      // Org-wide AI config
      await ai.loadOrgAIConfig();

      // Lifecycle stages
      await lifecycle.loadLifecycleStages();

      // Products catalog
      await catalog.refreshProducts();

      // Custom fields & tags
      await customFields.loadCustomFields();
      await tags.loadTags();
    } catch (e) {
      console.error('Error fetching settings:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch settings');
    }

    setLoading(false);
  }, [profile, ai, lifecycle, catalog, customFields, tags]);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, organizationId]);

  // Legacy Leads helpers
  const addLead = useCallback((lead: Lead) => {
    setLeads(prev => [...prev, lead]);
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const discardLead = useCallback((id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      loading,
      error,
      // Lifecycle
      lifecycleStages: lifecycle.lifecycleStages,
      addLifecycleStage: lifecycle.addLifecycleStage,
      updateLifecycleStage: lifecycle.updateLifecycleStage,
      deleteLifecycleStage: lifecycle.deleteLifecycleStage,
      reorderLifecycleStages: lifecycle.reorderLifecycleStages,
      // Products
      products: catalog.products,
      refreshProducts: catalog.refreshProducts,
      // Custom Fields
      customFieldDefinitions: customFields.customFieldDefinitions,
      addCustomField: customFields.addCustomField,
      updateCustomField: customFields.updateCustomField,
      removeCustomField: customFields.removeCustomField,
      // Tags
      availableTags: tags.availableTags,
      addTag: tags.addTag,
      removeTag: tags.removeTag,
      // AI
      aiProvider: ai.aiProvider,
      setAiProvider: ai.setAiProvider,
      aiApiKey: ai.aiApiKey,
      setAiApiKey: ai.setAiApiKey,
      aiGoogleKey: ai.aiGoogleKey,
      aiOpenaiKey: ai.aiOpenaiKey,
      aiAnthropicKey: ai.aiAnthropicKey,
      aiModel: ai.aiModel,
      setAiModel: ai.setAiModel,
      aiOrgEnabled: ai.aiOrgEnabled,
      setAiOrgEnabled: ai.setAiOrgEnabled,
      aiKeyConfigured: ai.aiKeyConfigured,
      aiFeatureFlags: ai.aiFeatureFlags,
      setAIFeatureFlag: ai.setAIFeatureFlag,
      aiThinking: ai.aiThinking,
      setAiThinking: ai.setAiThinking,
      aiSearch: ai.aiSearch,
      setAiSearch: ai.setAiSearch,
      aiAnthropicCaching: ai.aiAnthropicCaching,
      setAiAnthropicCaching: ai.setAiAnthropicCaching,
      // UI State
      isGlobalAIOpen,
      setIsGlobalAIOpen,
      // Legacy Leads
      leads,
      setLeads,
      addLead,
      updateLead,
      discardLead,
      // Refresh
      refresh: fetchSettings,
    }),
    [
      loading,
      error,
      lifecycle,
      catalog,
      customFields,
      tags,
      ai,
      isGlobalAIOpen,
      setIsGlobalAIOpen,
      leads,
      setLeads,
      addLead,
      updateLead,
      discardLead,
      fetchSettings,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

/**
 * Hook React `useSettings` que encapsula uma logica reutilizavel.
 * @returns {SettingsContextType} Retorna um valor do tipo `SettingsContextType`.
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
