import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const CLASSIFICATION_OPTIONS = [
    { value: 'COMPRADOR', label: 'Comprador' },
    { value: 'VENDEDOR', label: 'Vendedor' },
    { value: 'LOCATARIO', label: 'Locatario' },
    { value: 'LOCADOR', label: 'Locador' },
    { value: 'INVESTIDOR', label: 'Investidor' },
    { value: 'PERMUTANTE', label: 'Permutante' },
] as const;

const TEMPERATURE_OPTIONS = [
    { value: 'ALL', label: 'Todos' },
    { value: 'HOT', label: 'Quente' },
    { value: 'WARM', label: 'Morno' },
    { value: 'COLD', label: 'Frio' },
] as const;

const CONTACT_TYPE_OPTIONS = [
    { value: 'ALL', label: 'Todos' },
    { value: 'PF', label: 'Pessoa Fisica' },
    { value: 'PJ', label: 'Pessoa Juridica' },
] as const;

const SOURCE_OPTIONS = [
    { value: 'ALL', label: 'Todas' },
    { value: 'WEBSITE', label: 'Website' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'REFERRAL', label: 'Indicacao' },
    { value: 'MANUAL', label: 'Manual' },
] as const;

const SELECT_CLASS = 'bg-white dark:bg-black/20 border border-border  rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 ';

interface ContactsFiltersProps {
    dateRange: { start: string; end: string };
    setDateRange: (range: { start: string; end: string }) => void;
    classification: string[];
    setClassification: (val: string[]) => void;
    temperature: string;
    setTemperature: (val: string) => void;
    contactType: string;
    setContactType: (val: string) => void;
    ownerId: string;
    setOwnerId: (val: string) => void;
    source: string;
    setSource: (val: string) => void;
    profiles: Array<{ id: string; name: string; avatar?: string }>;
}

/**
 * Componente de filtros avancados da lista de contatos.
 * Story 3.5 — Filtros por classificacao, temperatura, tipo, responsavel e origem.
 */
export const ContactsFilters: React.FC<ContactsFiltersProps> = ({
    dateRange,
    setDateRange,
    classification,
    setClassification,
    temperature,
    setTemperature,
    contactType,
    setContactType,
    ownerId,
    setOwnerId,
    source,
    setSource,
    profiles,
}) => {
    const hasAnyFilter =
        dateRange.start ||
        dateRange.end ||
        classification.length > 0 ||
        temperature !== 'ALL' ||
        contactType !== 'ALL' ||
        ownerId !== '' ||
        source !== 'ALL';

    const handleClearAll = () => {
        setDateRange({ start: '', end: '' });
        setClassification([]);
        setTemperature('ALL');
        setContactType('ALL');
        setOwnerId('');
        setSource('ALL');
    };

    const toggleClassification = (val: string) => {
        if (classification.includes(val)) {
            setClassification(classification.filter(c => c !== val));
        } else {
            setClassification([...classification, val]);
        }
    };

    return (
        <div className="bg-background dark:bg-white/5 border border-border rounded-xl p-4 animate-in slide-in-from-top-2 space-y-4">
            {/* Row 1: Date Range + Single Selects */}
            <div className="flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Data Inicio</label>
                    <input
                        type="date"
                        className={SELECT_CLASS}
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Data Fim</label>
                    <input
                        type="date"
                        className={SELECT_CLASS}
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Temperatura</label>
                    <select
                        className={SELECT_CLASS}
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                    >
                        {TEMPERATURE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Tipo</label>
                    <select
                        className={SELECT_CLASS}
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value)}
                    >
                        {CONTACT_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Origem</label>
                    <select
                        className={SELECT_CLASS}
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                    >
                        {SOURCE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Responsavel</label>
                    <select
                        className={SELECT_CLASS}
                        value={ownerId}
                        onChange={(e) => setOwnerId(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {profiles.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                {hasAnyFilter && (
                    <Button
                        onClick={handleClearAll}
                        className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 font-medium px-2 py-2"
                    >
                        <X size={14} />
                        Limpar Filtros
                    </Button>
                )}
            </div>

            {/* Row 2: Classification multi-select (checkboxes) */}
            <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Classificacao</label>
                <div className="flex flex-wrap gap-2">
                    {CLASSIFICATION_OPTIONS.map(opt => (
                        <label
                            key={opt.value}
                            className={`flex items-center gap-1.5 cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                                classification.includes(opt.value)
                                    ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/30'
                                    : 'bg-white text-secondary-foreground border-border hover:border-border dark:bg-black/20 dark:text-muted-foreground  dark:hover:border-white/20'
                            }`}
                        >
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={classification.includes(opt.value)}
                                onChange={() => toggleClassification(opt.value)}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};
