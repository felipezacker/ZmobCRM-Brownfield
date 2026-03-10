import React from 'react';
import { DealView, Product } from '@/types';
import { Check, Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { OrgMember } from '@/hooks/useOrganizationMembers';

// Performance: reuse currency formatter instance.
const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/* ------------------------------------------------------------------ */
/*  Product Picker Popover                                             */
/* ------------------------------------------------------------------ */

interface ProductPickerProps {
  deal: DealView;
  productName: string | null;
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  productPickerOpen: boolean;
  onProductPickerOpenChange: (open: boolean) => void;
  filteredProducts: Product[];
  creatingProduct: boolean;
  onCreateProduct: () => void;
  onSelectProduct: (product: Product | null) => void;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  deal,
  productName,
  productSearch,
  onProductSearchChange,
  productPickerOpen,
  onProductPickerOpenChange,
  filteredProducts,
  creatingProduct,
  onCreateProduct,
  onSelectProduct,
}) => (
  <div className="flex items-center gap-1 mt-1 ml-8 text-xs truncate">
    <Popover open={productPickerOpen} onOpenChange={onProductPickerOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`truncate hover:underline cursor-pointer ${productName ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}
        >
          {productName || 'Sem produto'}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-56 p-0 border border-border bg-white dark:bg-card rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
            className="flex-1 bg-transparent text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-auto py-1">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectProduct(null); }}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted dark:hover:bg-white/5 transition-colors ${!productName ? 'text-amber-500 font-semibold' : 'text-muted-foreground dark:text-muted-foreground'}`}
          >
            Sem produto
          </Button>
          {filteredProducts.map((p) => (
            <Button
              variant="unstyled"
              size="unstyled"
              key={p.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectProduct(p); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-2 ${deal.items?.[0]?.productId === p.id ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-secondary-foreground dark:text-muted-foreground'}`}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {BRL_CURRENCY.format(p.price)}
              </span>
            </Button>
          ))}
          {filteredProducts.length === 0 && (
            productSearch.trim() ? (
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                disabled={creatingProduct}
                onClick={(e) => { e.stopPropagation(); onCreateProduct(); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted dark:hover:bg-white/5 transition-colors text-primary-500 dark:text-primary-400 flex items-center gap-1.5"
              >
                {creatingProduct ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                <span className="truncate">Criar &quot;{productSearch.trim()}&quot;</span>
              </Button>
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum produto encontrado</div>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Owner Picker Popover                                               */
/* ------------------------------------------------------------------ */

interface OwnerPickerProps {
  deal: DealView;
  ownerSearch: string;
  onOwnerSearchChange: (value: string) => void;
  ownerPickerOpen: boolean;
  onOwnerPickerOpenChange: (open: boolean) => void;
  filteredMembers: OrgMember[];
  onSelectOwner: (member: OrgMember | null) => void;
}

export const OwnerPicker: React.FC<OwnerPickerProps> = ({
  deal,
  ownerSearch,
  onOwnerSearchChange,
  ownerPickerOpen,
  onOwnerPickerOpenChange,
  filteredMembers,
  onSelectOwner,
}) => (
  <div className="flex items-center mt-1 ml-1 text-xs">
    <Popover open={ownerPickerOpen} onOpenChange={onOwnerPickerOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 truncate cursor-pointer group/owner"
        >
          {deal.owner?.name && deal.owner.name !== 'Sem Dono' ? (
            <>
              <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[8px] font-bold shrink-0 ring-1 ring-blue-200/50 dark:ring-blue-700/30">
                {getInitials(deal.owner.name)}
              </span>
              <span className="truncate text-muted-foreground dark:text-muted-foreground group-hover/owner:text-foreground dark:group-hover/owner:text-muted-foreground transition-colors">
                {deal.owner.name}
              </span>
            </>
          ) : (
            <>
              <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-[8px] shrink-0">
                ?
              </span>
              <span className="text-amber-500 dark:text-amber-400 group-hover/owner:text-amber-600 dark:group-hover/owner:text-amber-300 transition-colors">
                Sem dono
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-60 p-0 border border-border bg-white dark:bg-card rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={ownerSearch}
            onChange={(e) => onOwnerSearchChange(e.target.value)}
            placeholder="Buscar corretor..."
            aria-label="Buscar corretor"
            className="flex-1 bg-transparent text-xs text-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-52 overflow-auto py-1">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelectOwner(null); }}
            className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-background dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${!deal.ownerId ? 'bg-background dark:bg-white/5' : ''}`}
          >
            <span className="w-5 h-5 rounded-full bg-muted dark:bg-white/10 text-muted-foreground flex items-center justify-center text-[9px] shrink-0">

            </span>
            <span className={`flex-1 ${!deal.ownerId ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground dark:text-muted-foreground'}`}>
              Sem dono
            </span>
            {!deal.ownerId && <Check className="h-3 w-3 text-amber-500 shrink-0" />}
          </Button>
          {filteredMembers.map((m) => {
            const isSelected = deal.ownerId === m.id;
            return (
              <Button
                variant="unstyled"
                size="unstyled"
                key={m.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectOwner(m); }}
                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-background dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 ring-1 ring-blue-300/50 dark:ring-blue-600/30'
                    : 'bg-muted dark:bg-white/10 text-muted-foreground dark:text-muted-foreground'
                  }`}>
                  {getInitials(m.name)}
                </span>
                <span className={`flex-1 truncate ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-secondary-foreground dark:text-muted-foreground'}`}>
                  {m.name}
                </span>
                <span className={`text-[9px] px-1 py-0.5 rounded ${m.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400' :
                    m.role === 'diretor' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500 dark:text-sky-400' :
                      'bg-background dark:bg-white/5 text-muted-foreground dark:text-muted-foreground'
                  }`}>
                  {m.role}
                </span>
                {isSelected && <Check className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />}
              </Button>
            );
          })}
          {filteredMembers.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum corretor encontrado</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  </div>
);
