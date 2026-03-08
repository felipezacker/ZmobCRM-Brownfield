import React from 'react';
import { BoardTemplateType } from '@/lib/templates/board-templates';
import { RegistryIndex } from '@/types';
import { Button } from '@/components/ui/button';
import { SelectBrowseFocus } from '@/features/boards/components/board-wizard/types';
import {
  PlaybooksList,
  TemplatesList,
  CommunityList,
} from '@/features/boards/components/board-wizard/BrowseSections';

interface SelectBrowseStepProps {
  selectBrowseFocus: SelectBrowseFocus;
  registryIndex: RegistryIndex | null;
  isLoadingRegistry: boolean;
  isInstalling: boolean;
  onBack: () => void;
  onChangeFocus: (focus: SelectBrowseFocus, tab: 'official' | 'community') => void;
  onSelectPlaybook: (journeyId: string) => void;
  onSelectTemplate: (templateType: BoardTemplateType) => void;
  onInstallJourney: (templatePath: string) => void;
}

export const SelectBrowseStep: React.FC<SelectBrowseStepProps> = ({
  selectBrowseFocus,
  registryIndex,
  isLoadingRegistry,
  isInstalling,
  onBack,
  onChangeFocus,
  onSelectPlaybook,
  onSelectTemplate,
  onInstallJourney,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          onClick={onBack}
          className="px-3 py-2 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors font-medium"
        >
          &larr; Voltar
        </Button>

        <div className="flex p-1 bg-muted dark:bg-white/5 rounded-xl">
          {(['playbooks', 'templates', 'community'] as const).map((tab) => (
            <Button
              key={tab}
              onClick={() => onChangeFocus(tab, tab === 'community' ? 'community' : 'official')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                selectBrowseFocus === tab
                  ? 'bg-white dark:bg-card text-foreground  shadow-sm'
                  : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
              }`}
            >
              {tab === 'playbooks' ? 'Playbooks' : tab === 'templates' ? 'Templates' : 'Comunidade'}
            </Button>
          ))}
        </div>
      </div>

      {selectBrowseFocus === 'playbooks' && <PlaybooksList onSelectPlaybook={onSelectPlaybook} />}
      {selectBrowseFocus === 'templates' && <TemplatesList onSelectTemplate={onSelectTemplate} />}
      {selectBrowseFocus === 'community' && (
        <CommunityList
          registryIndex={registryIndex}
          isLoadingRegistry={isLoadingRegistry}
          isInstalling={isInstalling}
          onInstallJourney={onInstallJourney}
        />
      )}
    </div>
  );
};
