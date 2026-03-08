import React from 'react';
import { Sparkles, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface AIInputStepProps {
  aiInput: string;
  error: string | null;
  onAiInputChange: (value: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}

export const AIInputStep: React.FC<AIInputStepProps> = ({
  aiInput,
  error,
  onAiInputChange,
  onGenerate,
  onClose,
}) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-foreground">
            Descreva seu negocio em 1 frase:
          </h3>
        </div>

        <input
          type="text"
          value={aiInput}
          onChange={(e) => onAiInputChange(e.target.value)}
          placeholder="Ex: Sou tatuador, Vendo cursos online, Consultoria de TI..."
          className="w-full px-4 py-3 rounded-lg border-2 border-border bg-white dark:bg-white/5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onGenerate();
          }}
        />

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button
              onClick={() => {
                onClose();
                router.push('/settings/ai#ai-config');
              }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 hover:bg-background dark:hover:bg-white/15 text-foreground font-semibold rounded-lg border border-border transition-colors"
              type="button"
            >
              <Settings size={16} />
              Configurar IA
            </Button>
          </div>
        )}

        <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground">
          A IA vai criar um board personalizado para voce!
        </p>
      </div>
    </div>
  );
};
