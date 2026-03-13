'use client';

import React from 'react';
import { Info, Lightbulb } from 'lucide-react';
import type { ContentBlock, ActionGridBlock, FeatureGridBlock, FeatureListBlock, InfoBoxBlock } from './types';
import { ScoreTable } from './components/ScoreTable';

// ─── Text Parser ─────────────────────────────────────────────────────────────

function parseText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; darkBg: string; text: string; darkText: string; border: string; darkBorder: string; accent: string; darkAccent: string }> = {
  red:    { bg: 'bg-red-50',    darkBg: 'dark:bg-red-950/30',    text: 'text-red-700',    darkText: 'dark:text-red-300',    border: 'border-red-200/60',    darkBorder: 'dark:border-red-800/30',    accent: 'bg-red-500',    darkAccent: 'dark:bg-red-400' },
  amber:  { bg: 'bg-amber-50',  darkBg: 'dark:bg-amber-950/30',  text: 'text-amber-700',  darkText: 'dark:text-amber-300',  border: 'border-amber-200/60',  darkBorder: 'dark:border-amber-800/30',  accent: 'bg-amber-500',  darkAccent: 'dark:bg-amber-400' },
  green:  { bg: 'bg-green-50',  darkBg: 'dark:bg-green-950/30',  text: 'text-green-600',  darkText: 'dark:text-green-400',  border: 'border-green-200/60',  darkBorder: 'dark:border-green-800/30',  accent: 'bg-green-500',  darkAccent: 'dark:bg-green-400' },
  blue:   { bg: 'bg-blue-50',   darkBg: 'dark:bg-blue-950/30',   text: 'text-blue-700',   darkText: 'dark:text-blue-300',   border: 'border-blue-200/60',   darkBorder: 'dark:border-blue-800/30',   accent: 'bg-blue-500',   darkAccent: 'dark:bg-blue-400' },
  violet: { bg: 'bg-violet-50', darkBg: 'dark:bg-violet-950/30', text: 'text-violet-700', darkText: 'dark:text-violet-300', border: 'border-violet-200/60', darkBorder: 'dark:border-violet-800/30', accent: 'bg-violet-500', darkAccent: 'dark:bg-violet-400' },
  rose:   { bg: 'bg-rose-50',   darkBg: 'dark:bg-rose-950/30',   text: 'text-rose-700',   darkText: 'dark:text-rose-300',   border: 'border-rose-200/60',   darkBorder: 'dark:border-rose-800/30',   accent: 'bg-rose-500',   darkAccent: 'dark:bg-rose-400' },
  pink:   { bg: 'bg-pink-50',   darkBg: 'dark:bg-pink-950/30',   text: 'text-pink-700',   darkText: 'dark:text-pink-300',   border: 'border-pink-200/60',   darkBorder: 'dark:border-pink-800/30',   accent: 'bg-pink-500',   darkAccent: 'dark:bg-pink-400' },
  orange: { bg: 'bg-orange-50', darkBg: 'dark:bg-orange-950/30', text: 'text-orange-700', darkText: 'dark:text-orange-300', border: 'border-orange-200/60', darkBorder: 'dark:border-orange-800/30', accent: 'bg-orange-500', darkAccent: 'dark:bg-orange-400' },
  slate:  { bg: 'bg-muted/50',  darkBg: 'dark:bg-white/[0.04]',  text: 'text-foreground',  darkText: 'dark:text-muted-foreground', border: 'border-border/50', darkBorder: 'dark:border-white/[0.06]', accent: 'bg-slate-500', darkAccent: 'dark:bg-slate-400' },
  teal:   { bg: 'bg-teal-50',   darkBg: 'dark:bg-teal-950/30',   text: 'text-teal-700',   darkText: 'dark:text-teal-300',   border: 'border-teal-200/60',   darkBorder: 'dark:border-teal-800/30',   accent: 'bg-teal-500',   darkAccent: 'dark:bg-teal-400' },
  cyan:   { bg: 'bg-cyan-50',   darkBg: 'dark:bg-cyan-950/30',   text: 'text-cyan-700',   darkText: 'dark:text-cyan-300',   border: 'border-cyan-200/60',   darkBorder: 'dark:border-cyan-800/30',   accent: 'bg-cyan-500',   darkAccent: 'dark:bg-cyan-400' },
  indigo: { bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950/30', text: 'text-indigo-700', darkText: 'dark:text-indigo-300', border: 'border-indigo-200/60', darkBorder: 'dark:border-indigo-800/30', accent: 'bg-indigo-500', darkAccent: 'dark:bg-indigo-400' },
  yellow: { bg: 'bg-yellow-50', darkBg: 'dark:bg-yellow-950/30', text: 'text-yellow-700', darkText: 'dark:text-yellow-300', border: 'border-yellow-200/60', darkBorder: 'dark:border-yellow-800/30', accent: 'bg-yellow-500', darkAccent: 'dark:bg-yellow-400' },
  sky:    { bg: 'bg-sky-50',    darkBg: 'dark:bg-sky-950/30',    text: 'text-sky-700',    darkText: 'dark:text-sky-300',    border: 'border-sky-200/60',    darkBorder: 'dark:border-sky-800/30',    accent: 'bg-sky-500',    darkAccent: 'dark:bg-sky-400' },
};

function getColor(color: string) {
  return colorMap[color] ?? colorMap.slate;
}

// ─── Block Renderers ─────────────────────────────────────────────────────────

function RenderFeatureGrid({ block }: { block: FeatureGridBlock }) {
  return (
    <div className="space-y-2.5">
      <p className="font-medium text-foreground text-[13px] tracking-tight">{block.title}</p>
      <div className={`grid gap-2.5 ${block.cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {block.items.map((item, i) => {
          const c = item.color ? getColor(item.color) : getColor('slate');
          return (
            <div
              key={i}
              className={`
                rounded-xl ${c.bg} ${c.darkBg} p-3 border ${c.border} ${c.darkBorder}
                transition-colors duration-200
                ${item.description ? '' : 'text-center py-2.5'}
              `}
            >
              <span className={`font-semibold text-xs ${c.text} ${c.darkText}`}>{item.label}</span>
              {item.description && (
                <p className={`text-1xs leading-relaxed mt-1 ${c.text} ${c.darkText} opacity-80`}>
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RenderFeatureList({ block }: { block: FeatureListBlock }) {
  return (
    <div className="space-y-2.5">
      <p className="font-medium text-foreground text-[13px] tracking-tight">{block.title}</p>
      <div className="space-y-1.5">
        {block.items.map((item, i) => (
          <div key={i} className="flex gap-3 items-start group">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 dark:bg-primary/30 mt-[7px] shrink-0" />
            <p className="text-[13px] leading-relaxed">
              <strong className="text-foreground font-semibold">{item.title}</strong>
              <span className="text-muted-foreground"> — {parseText(item.description)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RenderInfoBox({ block }: { block: InfoBoxBlock }) {
  const c = getColor(block.color);
  return (
    <div className={`rounded-xl ${c.bg} ${c.darkBg} border ${c.border} ${c.darkBorder} p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <Info className={`w-4 h-4 ${c.text} ${c.darkText} shrink-0 opacity-70`} />
        <p className={`font-semibold text-[13px] ${c.text} ${c.darkText}`}>{block.title}</p>
      </div>
      {block.text && (
        <p className={`${c.text} ${c.darkText} text-xs leading-relaxed opacity-90 pl-6`}>{parseText(block.text)}</p>
      )}
      {block.items && (
        <ul className="space-y-1 pl-6">
          {block.items.map((item, i) => (
            <li key={i} className={`${c.text} ${c.darkText} text-xs leading-relaxed flex gap-2 items-start`}>
              <span className="shrink-0 mt-1.5">•</span>
              <span>{parseText(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RenderActionGrid({ block }: { block: ActionGridBlock }) {
  return (
    <div className="space-y-2.5">
      <p className="font-medium text-foreground text-[13px] tracking-tight">{block.title}</p>
      <div className={`grid gap-2 ${block.cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {block.items.map((item, i) => {
          const c = getColor(item.color);
          return (
            <div
              key={i}
              className={`
                rounded-xl ${c.bg} ${c.darkBg} py-2.5 px-3 text-center
                border ${c.border} ${c.darkBorder}
                transition-colors duration-200
              `}
            >
              <span className={`font-semibold text-xs ${c.text} ${c.darkText}`}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RenderSpecialComponent({ block }: { block: { component: string; title?: string } }) {
  const components: Record<string, React.ComponentType> = {
    ScoreTable,
  };

  const Component = components[block.component];
  if (!Component) return null;

  return (
    <div className="space-y-2.5">
      {block.title && (
        <p className="font-medium text-foreground text-[13px] tracking-tight">{block.title}</p>
      )}
      <Component />
    </div>
  );
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export function SectionRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-4 pt-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={i} className="text-[13px] leading-relaxed text-secondary-foreground dark:text-muted-foreground">
                {parseText(block.text)}
              </p>
            );

          case 'feature-grid':
            return <RenderFeatureGrid key={i} block={block} />;

          case 'feature-list':
            return <RenderFeatureList key={i} block={block} />;

          case 'info-box':
            return <RenderInfoBox key={i} block={block} />;

          case 'tip':
            return (
              <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground italic bg-muted/30 dark:bg-white/[0.02] rounded-lg px-3 py-2.5">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400 not-italic" />
                <span>{parseText(block.text)}</span>
              </div>
            );

          case 'special-component':
            return <RenderSpecialComponent key={i} block={block} />;

          case 'action-grid':
            return <RenderActionGrid key={i} block={block} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
