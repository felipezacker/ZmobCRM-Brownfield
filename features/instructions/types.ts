import type React from 'react';

// ─── Section Metadata ────────────────────────────────────────────────────────

export interface InstructionSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  route?: string;
  roles?: ('admin' | 'corretor' | 'diretor')[];
  content: ContentBlock[];
}

// ─── Content Blocks ──────────────────────────────────────────────────────────
// Text wrapped in **double asterisks** will be rendered as <strong>

export type ContentBlock =
  | ParagraphBlock
  | FeatureGridBlock
  | FeatureListBlock
  | InfoBoxBlock
  | TipBlock
  | SpecialComponentBlock
  | ActionGridBlock;

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface FeatureGridBlock {
  type: 'feature-grid';
  title: string;
  cols: 2 | 3;
  items: GridItem[];
}

export interface GridItem {
  label: string;
  description?: string;
  color?: string;
}

export interface FeatureListBlock {
  type: 'feature-list';
  title: string;
  items: ListItem[];
}

export interface ListItem {
  title: string;
  description: string;
}

export interface InfoBoxBlock {
  type: 'info-box';
  title: string;
  text?: string;
  color: string;
  items?: string[];
}

export interface TipBlock {
  type: 'tip';
  text: string;
}

export interface SpecialComponentBlock {
  type: 'special-component';
  title?: string;
  component: string;
}

export interface ActionGridBlock {
  type: 'action-grid';
  title: string;
  cols: 2 | 3;
  items: ActionItem[];
}

export interface ActionItem {
  label: string;
  color: string;
}
