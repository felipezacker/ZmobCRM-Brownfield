'use client';

import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import type { InstructionSection } from './types';
import { SectionRenderer } from './SectionRenderer';
import { sections } from './sections-data';

function AccordionItem({
  section,
  isOpen,
  onToggle,
}: {
  section: InstructionSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;
  return (
    <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden">
      <Button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        aria-expanded={isOpen}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section.color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="flex-1 font-semibold text-slate-900 dark:text-white">
          {section.title}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>
      {isOpen && (
        <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3 border-t border-slate-100 dark:border-slate-700/50 pt-4">
          <SectionRenderer blocks={section.content} />
        </div>
      )}
    </div>
  );
}

export function InstructionsPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
            Instruções
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Guia completo de uso do CRM para corretores
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>
    </div>
  );
}
