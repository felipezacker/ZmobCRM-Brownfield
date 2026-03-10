import React from 'react';
import { useSettings } from '@/context/settings/SettingsContext';
import { Bot, Key, Cpu, CheckCircle, AlertCircle, Loader2, Save, Trash2, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useApiKeyValidation } from './hooks/useApiKeyValidation';
import { useModelSelection } from './hooks/useModelSelection';

// Performance: keep provider/model catalog outside the component to avoid reallocations on every render.
const AI_PROVIDERS = [
    {
        id: 'google',
        name: 'Google Gemini',
        models: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Recomendado - Best value', price: '$0.15 / $0.60' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most intelligent', price: '$1.25 / $10' },
        ]
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        models: [
            { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Recomendado - Best balance', price: '$3 / $15' },
            { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Fastest', price: '$1 / $5' },
            { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Premium intelligence', price: '$5 / $25' },
        ]
    },
    {
        id: 'openai',
        name: 'OpenAI',
        models: [
            { id: 'gpt-5.2', name: 'GPT-5.2 (Preview)', description: 'Preview', price: '$1.75 / $14' },
            { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: 'Premium', price: '$21 / $168' },
            { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Chat Latest', description: 'Latest chat', price: '$1.75 / $14' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast & efficient', price: '$0.25 / $2' },
            { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Ultra fast', price: '$0.05 / $0.40' },
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Legacy flagship', price: '$2.50 / $10' },
        ]
    },
] as const;

// Função para validar API key fazendo uma chamada real à API
async function validateApiKey(provider: string, apiKey: string, model: string): Promise<{ valid: boolean; error?: string }> {
    if (!apiKey || apiKey.trim().length < 10) {
        return { valid: false, error: 'Chave muito curta' };
    }

    try {
        if (provider === 'google') {
            // Gemini API validation - usa endpoint generateContent com texto mínimo
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Hi' }] }],
                        generationConfig: { maxOutputTokens: 1 }
                    })
                }
            );

            if (response.ok) {
                return { valid: true };
            }

            const error = await response.json();
            if (response.status === 400 && error?.error?.message?.includes('API key not valid')) {
                return { valid: false, error: 'Chave de API inválida' };
            }
            if (response.status === 403) {
                return { valid: false, error: 'Chave sem permissão para este modelo' };
            }
            if (response.status === 429) {
                // Rate limit = key é válida, só está no limite
                return { valid: true };
            }
            return { valid: false, error: error?.error?.message || 'Erro desconhecido' };

        } else if (provider === 'openai') {
            // OpenAI validation
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (response.ok) {
                return { valid: true };
            }
            if (response.status === 401) {
                return { valid: false, error: 'Chave de API inválida' };
            }
            return { valid: false, error: 'Erro ao validar chave' };

        } else if (provider === 'anthropic') {
            // Anthropic validation - não tem endpoint de validação simples
            // Fazemos uma chamada mínima
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'Hi' }]
                })
            });

            if (response.ok) {
                return { valid: true };
            }
            if (response.status === 401) {
                return { valid: false, error: 'Chave de API inválida' };
            }
            if (response.status === 429) {
                return { valid: true }; // Rate limit = key válida
            }
            return { valid: false, error: 'Erro ao validar chave' };
        }

        return { valid: false, error: 'Provedor não suportado' };
    } catch (error) {
        console.error('API Key validation error:', error);
        return { valid: false, error: 'Erro de conexão. Verifique sua internet.' };
    }
}

/**
 * Componente React `AIConfigSection`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const AIConfigSection: React.FC = () => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    const {
        aiProvider, setAiProvider,
        aiApiKey, setAiApiKey,
        aiModel, setAiModel,
        aiKeyConfigured,
        aiThinking, setAiThinking,
        aiSearch, setAiSearch,
        aiAnthropicCaching, setAiAnthropicCaching
    } = useSettings();

    const { showToast } = useToast();

    const currentProvider = AI_PROVIDERS.find(p => p.id === aiProvider);
    const isCatalogModel = !!currentProvider?.models.some(m => m.id === aiModel);

    const modelSelection = useModelSelection({
        aiProvider, aiModel, isCatalogModel, setAiModel, showToast,
        currentProviderModels: currentProvider?.models,
    });

    const {
        modelSelectValue, customModelDraft, setCustomModelDraft,
        customModelDirty, setCustomModelDirty, isSavingModel,
        handleModelSelectChange, handleSaveCustomModel, handleResetCustomModel,
    } = modelSelection;

    const {
        localApiKey, isValidating, validationStatus, validationError,
        lgpdExpanded, setLgpdExpanded,
        handleKeyChange, handleSaveApiKey, handleRemoveApiKey, hasUnsavedChanges,
    } = useApiKeyValidation({
        aiApiKey, aiProvider, aiModel, setAiApiKey, showToast,
        validateApiKey, modelSelectValue, customModelDraft,
    });

    const handleProviderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProviderId = e.target.value as 'google' | 'openai' | 'anthropic';
        try {
            await setAiProvider(newProviderId);

            // Auto-set recommended model (first one in list usually, or one marked recommended)
            const providerData = AI_PROVIDERS.find(p => p.id === newProviderId);
            if (providerData && providerData.models.length > 0) {
                // Prefer models with "Recomendado" in description, else first one
                const recommended = providerData.models.find(m => m.description.includes('Recomendado')) || providerData.models[0];
                await setAiModel(recommended.id);
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Falha ao atualizar provedor de IA', 'error');
        }
    };

    return (
        <div id="ai-config" className="mt-6 border-t border-border pt-6 scroll-mt-8">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground font-display">Inteligência Artificial</h2>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">Configure qual cérebro vai alimentar seu CRM.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">

                {/* Non-admin read-only summary */}
                {!isAdmin && (
                    <div className="bg-white dark:bg-background border border-border rounded-lg p-3">
                        <div className="text-sm text-secondary-foreground dark:text-muted-foreground">
                            <span className="font-semibold">Status:</span> Configurado pela organização
                        </div>
                        <div className="text-sm text-secondary-foreground dark:text-muted-foreground mt-1">
                            <span className="font-semibold">Provedor:</span> {aiProvider}
                        </div>
                        <div className="text-sm text-secondary-foreground dark:text-muted-foreground mt-1">
                            <span className="font-semibold">Modelo:</span> {aiModel}
                        </div>
                        <div className="text-sm text-secondary-foreground dark:text-muted-foreground mt-1">
                            <span className="font-semibold">Chave:</span> {aiKeyConfigured ? 'configurada' : 'não configurada'}
                        </div>
                    </div>
                )}

                {/* Admin-only config UI */}
                {!isAdmin ? null : (
                    <>

                {/* Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label htmlFor="ai-provider-select" className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground flex items-center gap-2">
                            <Cpu size={14} /> Provedor de IA
                        </label>
                        <div className="relative">
                            <select
                                id="ai-provider-select"
                                value={aiProvider}
                                onChange={handleProviderChange}
                                className="w-full appearance-none bg-background dark:bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                            >
                                {AI_PROVIDERS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                        <label htmlFor="ai-model-select" className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground flex items-center gap-2">
                            <Bot size={14} /> Modelo
                        </label>
                        <div className="relative">
                            <select
                                id="ai-model-select"
                                value={modelSelectValue}
                                onChange={(e) => void handleModelSelectChange(e.target.value)}
                                className="w-full appearance-none bg-background dark:bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                            >
                                {currentProvider?.models.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} - {m.description} ({m.price})
                                    </option>
                                ))}
                                <option value="custom">Outro (Digitar ID)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        {modelSelectValue === 'custom' && (
                            <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                                <input
                                    type="text"
                                    value={customModelDraft}
                                    onChange={(e) => {
                                        setCustomModelDraft(e.target.value);
                                        setCustomModelDirty(true);
                                    }}
                                    placeholder="Digite o ID do modelo (ex: gemini-2.5-pro)"
                                    className="w-full bg-white dark:bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Consulte a documentação do provedor para obter o ID correto.
                                </p>

                                <div className="mt-2 flex items-center gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => void handleSaveCustomModel()}
                                        disabled={isSavingModel || !customModelDraft.trim()}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isSavingModel || !customModelDraft.trim()
                                            ? 'bg-accent dark:bg-white/10 text-muted-foreground cursor-not-allowed'
                                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                                            }`}
                                    >
                                        {isSavingModel ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Salvar modelo
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleResetCustomModel}
                                        className="px-3 py-2 rounded-lg text-sm font-medium bg-muted dark:bg-white/5 hover:bg-accent dark:hover:bg-white/10 text-secondary-foreground dark:text-muted-foreground transition-colors"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Google Thinking Config */}
                {aiProvider === 'google' && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                    <span className="text-lg">🧠</span> Modo Pensamento (Thinking)
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    Permite que o modelo "pense" antes de responder, melhorando o raciocínio.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={aiThinking}
                                    onChange={(e) => setAiThinking(e.target.checked)}
                                    className="sr-only peer"
                                    aria-label="Ativar Modo Pensamento"
                                />
                                <div className="w-11 h-6 bg-red-500 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-green-500 dark:peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Anthropic Prompt Caching Config */}
                {aiProvider === 'anthropic' && (
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-orange-900 dark:text-orange-100 flex items-center gap-2">
                                    <span className="text-lg">⚡</span> Prompt Caching
                                </h3>
                                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                    Cacheia o contexto para economizar tokens e acelerar respostas (ideal para conversas longas).
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={aiAnthropicCaching}
                                    onChange={(e) => setAiAnthropicCaching(e.target.checked)}
                                    className="sr-only peer"
                                    aria-label="Ativar Prompt Caching"
                                />
                                <div className="w-11 h-6 bg-red-500 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-green-500 dark:peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Search Config (Google & Anthropic) */}
                {(aiProvider === 'google' || aiProvider === 'anthropic') && (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                                    <span className="text-lg">🌍</span> {aiProvider === 'google' ? 'Google Search Grounding' : 'Web Search'}
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                    Conecta o modelo à internet para buscar informações atualizadas.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={aiSearch}
                                    onChange={(e) => setAiSearch(e.target.checked)}
                                    className="sr-only peer"
                                    aria-label="Ativar busca na web"
                                />
                                <div className="w-11 h-6 bg-red-500 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-border peer-checked:bg-green-500 dark:peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                    </div>
                )}

                {/* API Key */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground flex items-center gap-2">
                        <Key size={14} /> Chave de API ({AI_PROVIDERS.find(p => p.id === aiProvider)?.name})
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="password"
                                value={localApiKey}
                                onChange={(e) => handleKeyChange(e.target.value)}
                                placeholder={`Cole sua chave ${aiProvider === 'google' ? 'AIza...' : 'sk-...'}`}
                                className={`w-full bg-background dark:bg-card border rounded-lg px-3 py-2 text-sm text-foreground  focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-mono ${validationStatus === 'invalid'
                                        ? 'border-red-300 dark:border-red-500/50'
                                        : validationStatus === 'valid'
                                            ? 'border-green-300 dark:border-green-500/50'
                                            : 'border-border '
                                    }`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {isValidating ? (
                                    <Loader2 size={16} className="text-purple-500 animate-spin" />
                                ) : validationStatus === 'valid' ? (
                                    <CheckCircle size={16} className="text-green-500" />
                                ) : validationStatus === 'invalid' ? (
                                    <AlertCircle size={16} className="text-red-500" />
                                ) : localApiKey ? (
                                    <AlertCircle size={16} className="text-amber-500" />
                                ) : null}
                            </div>
                        </div>
                        <Button
                            onClick={handleSaveApiKey}
                            disabled={isValidating || !localApiKey.trim() || (!hasUnsavedChanges && validationStatus === 'valid')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isValidating || !localApiKey.trim() || (!hasUnsavedChanges && validationStatus === 'valid')
                                    ? 'bg-muted dark:bg-card text-muted-foreground cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20'
                                }`}
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Validando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    {hasUnsavedChanges ? 'Salvar' : 'Salvo'}
                                </>
                            )}
                        </Button>
                        {aiApiKey && (
                            <Button
                                onClick={handleRemoveApiKey}
                                disabled={isValidating}
                                className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-all text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-500/30"
                                title="Remover chave"
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </div>
                    {validationError && (
                        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle size={12} /> {validationError}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                        🔒 Sua chave é validada antes de salvar e armazenada no banco de dados da organização.
                        Trate como segredo e use uma chave com o menor escopo possível.
                    </p>

                    {/* Seção LGPD Colapsável - Expandida por padrão */}
                    <div className="mt-4 border border-amber-200 dark:border-amber-500/30 rounded-lg overflow-hidden">
                        <Button
                            type="button"
                            onClick={() => setLgpdExpanded(!lgpdExpanded)}
                            className="w-full flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Shield size={16} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                    ⚖️ Consentimento LGPD - Importante!
                                </span>
                            </div>
                            {lgpdExpanded ? (
                                <ChevronUp size={18} className="text-amber-600 dark:text-amber-400" />
                            ) : (
                                <ChevronDown size={18} className="text-amber-600 dark:text-amber-400" />
                            )}
                        </Button>

                        {lgpdExpanded && (
                            <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
                                    <p className="font-medium">
                                        Ao salvar sua chave de API, você autoriza:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200 ml-2">
                                        <li>O processamento dos seus <strong>negócios</strong> (deals) pela IA</li>
                                        <li>O processamento dos seus <strong>contatos</strong> pela IA</li>
                                        <li>O processamento das suas <strong>atividades</strong> pela IA</li>
                                        <li>Geração de sugestões e textos pelo provedor configurado</li>
                                    </ul>
                                </div>

                                <div className="pt-2 border-t border-amber-200 dark:border-amber-500/20">
                                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                        <strong>Base legal:</strong> Consentimento do titular (Art. 7º, I e Art. 11, I da LGPD).
                                        Seus dados são enviados diretamente ao provedor de IA que você escolheu ({AI_PROVIDERS.find(p => p.id === aiProvider)?.name}).
                                        Nós não armazenamos ou intermediamos essas comunicações.
                                    </p>
                                </div>

                                <div className="pt-2 border-t border-amber-200 dark:border-amber-500/20">
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        <strong>Como revogar:</strong> Remova sua chave de API a qualquer momento clicando no botão 🗑️ ao lado do campo.
                                        O consentimento será automaticamente revogado.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Banner - use localApiKey para refletir estado atual após salvar */}
                <div className={`rounded-lg p-3 flex items-start gap-3 ${validationStatus === 'valid' && localApiKey
                        ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-200'
                        : validationStatus === 'invalid'
                            ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200'
                            : 'bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200'
                    }`}>
                    {validationStatus === 'valid' && localApiKey ? (
                        <CheckCircle className="shrink-0 mt-0.5" size={18} />
                    ) : (
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    )}
                    <div className="text-sm">
                        <p className="font-semibold">
                            {validationStatus === 'valid' && localApiKey
                                ? 'Pronto para uso'
                                : validationStatus === 'invalid'
                                    ? 'Chave Inválida'
                                    : 'Configuração Pendente'}
                        </p>
                        <p className="opacity-90 mt-1">
                            {validationStatus === 'valid' && localApiKey
                                ? `O sistema está configurado para usar o ${AI_PROVIDERS.find(p => p.id === aiProvider)?.name} (${aiModel}).`
                                : validationStatus === 'invalid'
                                    ? 'Verifique sua chave de API e tente novamente.'
                                    : 'Insira uma chave de API válida e clique em Salvar para usar o assistente.'}
                        </p>
                    </div>
                </div>

                    </>
                )}
            </div>
        </div>
    );
};
