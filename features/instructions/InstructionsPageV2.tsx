'use client';

import { useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import type { InstructionSection } from './types';
import { SectionRenderer } from './SectionRenderer';
import { sections } from './sections-data';

function SectionCard({
  section,
  onClick,
}: {
  section: InstructionSection;
  onClick: () => void;
}) {
  const Icon = section.icon;

  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="
        group flex flex-col items-center gap-3 p-5 h-auto rounded-2xl border
        border-border/50 dark:border-white/[0.06]
        hover:border-border dark:hover:border-white/10
        hover:bg-muted/30 dark:hover:bg-white/[0.02]
        hover:shadow-sm dark:hover:shadow-none
        transition-all duration-200 cursor-pointer text-center
      "
    >
      <div
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center shrink-0
          ${section.color} shadow-sm
          transition-transform duration-200 group-hover:scale-110 group-hover:shadow-md
        `}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="space-y-1">
        <span className="font-semibold text-sm text-foreground block leading-tight">
          {section.title}
        </span>
        {section.roles && (
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
            {section.roles.join(' · ')}
          </span>
        )}
      </div>
    </Button>
  );
}

export function InstructionsPageV2() {
  const [selectedSection, setSelectedSection] = useState<InstructionSection | null>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filteredSections = sections.filter((section) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    if (section.title.toLowerCase().includes(q)) return true;
    return section.content.some((block) => {
      if ('text' in block && typeof block.text === 'string') return block.text.toLowerCase().includes(q);
      if ('title' in block && typeof block.title === 'string') return block.title.toLowerCase().includes(q);
      if ('items' in block && Array.isArray(block.items)) {
        return block.items.some((item) => {
          if (typeof item === 'string') return item.toLowerCase().includes(q);
          if (typeof item === 'object' && item !== null) {
            return Object.values(item).some((v) => typeof v === 'string' && v.toLowerCase().includes(q));
          }
          return false;
        });
      }
      return false;
    });
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Instrucoes
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Guia completo de uso do CRM — {sections.length} secoes
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-9 w-9 p-0 shrink-0"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nas instrucoes..."
              className="w-full h-10 pl-10 pr-10 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/[0.03] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {search && (
          <p className="text-xs text-muted-foreground">
            {filteredSections.length} {filteredSections.length === 1 ? 'resultado' : 'resultados'} para &quot;{search}&quot;
          </p>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredSections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onClick={() => setSelectedSection(section)}
          />
        ))}
        {filteredSections.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
            Nenhuma secao encontrada para &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedSection && (
        <Modal
          isOpen={!!selectedSection}
          onClose={() => setSelectedSection(null)}
          title={selectedSection.title}
          size="3xl"
          bodyClassName="overflow-y-auto"
        >
          <div className="text-sm text-secondary-foreground dark:text-muted-foreground leading-relaxed">
            <SectionRenderer blocks={selectedSection.content} />
          </div>
        </Modal>
      )}
    </div>
  );
}
