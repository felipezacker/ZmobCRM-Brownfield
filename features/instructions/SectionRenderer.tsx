'use client';

import React from 'react';
import type { ContentBlock, ActionGridBlock, FeatureGridBlock, FeatureListBlock, InfoBoxBlock } from './types';
import { ScoreTable } from './components/ScoreTable';

// ─── Text Parser ─────────────────────────────────────────────────────────────
// Converts **bold** markers to <strong> elements

function parseText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; darkBg: string; text: string; darkText: string; border?: string; darkBorder?: string }> = {
  red: { bg: 'bg-red-50', darkBg: 'dark:bg-red-900/20', text: 'text-red-700', darkText: 'dark:text-red-300', border: 'border-red-200', darkBorder: 'dark:border-red-800' },
  amber: { bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20', text: 'text-amber-700', darkText: 'dark:text-amber-300', border: 'border-amber-200', darkBorder: 'dark:border-amber-800' },
  green: { bg: 'bg-green-50', darkBg: 'dark:bg-green-900/20', text: 'text-green-600', darkText: 'dark:text-green-400', border: 'border-green-200', darkBorder: 'dark:border-green-800' },
  blue: { bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/20', text: 'text-blue-700', darkText: 'dark:text-blue-300', border: 'border-blue-200', darkBorder: 'dark:border-blue-800' },
  violet: { bg: 'bg-violet-50', darkBg: 'dark:bg-violet-900/20', text: 'text-violet-700', darkText: 'dark:text-violet-300', border: 'border-violet-200', darkBorder: 'dark:border-violet-800' },
  rose: { bg: 'bg-rose-50', darkBg: 'dark:bg-rose-900/20', text: 'text-rose-700', darkText: 'dark:text-rose-300', border: 'border-rose-200', darkBorder: 'dark:border-rose-800' },
  pink: { bg: 'bg-pink-50', darkBg: 'dark:bg-pink-900/20', text: 'text-pink-700', darkText: 'dark:text-pink-300', border: 'border-pink-200', darkBorder: 'dark:border-pink-800' },
  orange: { bg: 'bg-orange-50', darkBg: 'dark:bg-orange-900/20', text: 'text-orange-700', darkText: 'dark:text-orange-300', border: 'border-orange-200', darkBorder: 'dark:border-orange-800' },
  slate: { bg: 'bg-background', darkBg: 'dark:bg-white/5', text: 'text-foreground', darkText: 'dark:text-muted-foreground', border: 'border-border', darkBorder: 'dark:border-border' },
  teal: { bg: 'bg-teal-50', darkBg: 'dark:bg-teal-900/20', text: 'text-teal-700', darkText: 'dark:text-teal-300', border: 'border-teal-200', darkBorder: 'dark:border-teal-800' },
  cyan: { bg: 'bg-cyan-50', darkBg: 'dark:bg-cyan-900/20', text: 'text-cyan-700', darkText: 'dark:text-cyan-300', border: 'border-cyan-200', darkBorder: 'dark:border-cyan-800' },
  indigo: { bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-900/20', text: 'text-indigo-700', darkText: 'dark:text-indigo-300', border: 'border-indigo-200', darkBorder: 'dark:border-indigo-800' },
};

function getColor(color: string) {
  return colorMap[color] ?? colorMap.slate;
}

// ─── Block Renderers ─────────────────────────────────────────────────────────

function RenderFeatureGrid({ block }: { block: FeatureGridBlock }) {
  return (
    <>
      <p className="font-medium text-foreground dark:text-muted-foreground">{block.title}</p>
      <div className={`grid grid-cols-${block.cols} gap-2 text-xs`}>
        {block.items.map((item, i) => {
          const c = item.color ? getColor(item.color) : getColor('slate');
          return (
            <div
              key={i}
              className={`rounded-lg ${c.bg} ${c.darkBg} p-2.5 ${item.description ? '' : 'text-center py-2'} ${item.color ? '' : `border ${c.border} ${c.darkBorder}`}`}
            >
              <span className={`font-semibold ${c.text} ${c.darkText}`}>{item.label}</span>
              {item.description && (
                <p className={`${item.color ? `${c.text} ${c.darkText}` : `text-muted-foreground dark:text-muted-foreground`} mt-0.5`}>
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function RenderFeatureList({ block }: { block: FeatureListBlock }) {
  return (
    <>
      <p className="font-medium text-foreground dark:text-muted-foreground">{block.title}</p>
      <ul className="list-disc list-inside space-y-1 ml-1">
        {block.items.map((item, i) => (
          <li key={i}>
            <strong>{item.title}</strong> — {parseText(item.description)}
          </li>
        ))}
      </ul>
    </>
  );
}

function RenderInfoBox({ block }: { block: InfoBoxBlock }) {
  const c = getColor(block.color);
  return (
    <div className={`rounded-lg ${c.bg} ${c.darkBg} p-3 space-y-1.5`}>
      <p className={`font-medium ${c.text} ${c.darkText}`}>{block.title}</p>
      {block.text && (
        <p className={`${c.text} ${c.darkText} text-xs`}>{parseText(block.text)}</p>
      )}
      {block.items && (
        <ul className={`list-disc list-inside ${c.text} ${c.darkText} space-y-0.5`}>
          {block.items.map((item, i) => (
            <li key={i}>{parseText(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RenderActionGrid({ block }: { block: ActionGridBlock }) {
  return (
    <>
      <p className="font-medium text-foreground dark:text-muted-foreground">{block.title}</p>
      <div className={`grid grid-cols-${block.cols} gap-2 text-xs`}>
        {block.items.map((item, i) => {
          const c = getColor(item.color);
          return (
            <div
              key={i}
              className={`rounded-lg ${c.bg} ${c.darkBg} p-2 text-center border ${c.border} ${c.darkBorder}`}
            >
              <span className={`font-semibold ${c.text} ${c.darkText}`}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function RenderSpecialComponent({ block }: { block: { component: string; title?: string } }) {
  const components: Record<string, React.ComponentType> = {
    ScoreTable,
  };

  const Component = components[block.component];
  if (!Component) return null;

  return (
    <>
      {block.title && (
        <p className="font-medium text-foreground dark:text-muted-foreground">{block.title}</p>
      )}
      <Component />
    </>
  );
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export function SectionRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'paragraph':
            return <p key={i}>{parseText(block.text)}</p>;

          case 'feature-grid':
            return <RenderFeatureGrid key={i} block={block} />;

          case 'feature-list':
            return <RenderFeatureList key={i} block={block} />;

          case 'info-box':
            return <RenderInfoBox key={i} block={block} />;

          case 'tip':
            return (
              <p key={i} className="text-xs text-muted-foreground dark:text-muted-foreground italic">
                {parseText(block.text)}
              </p>
            );

          case 'special-component':
            return <RenderSpecialComponent key={i} block={block} />;

          case 'action-grid':
            return <RenderActionGrid key={i} block={block} />;

          default:
            return null;
        }
      })}
    </>
  );
}
