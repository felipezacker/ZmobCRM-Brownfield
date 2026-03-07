import React from 'react';
import { Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRL_CURRENCY } from '@/features/boards/components/deal-detail/constants';
import type { DealDetailProductsProps } from '@/features/boards/components/deal-detail/types';
import { ProductPickerDropdown, CustomItemForm } from '@/features/boards/components/deal-detail/product-picker';

export const DealDetailProducts: React.FC<DealDetailProductsProps> = ({
  deal,
  products,
  selectedProductId,
  productQuantity,
  productSearch,
  productPickerOpen,
  filteredProducts,
  selectedProduct,
  showCustomItem,
  customItemName,
  customItemPrice,
  customItemQuantity,
  productPickerRef,
  productSearchInputRef,
  onSelectProduct,
  onProductQuantityChange,
  onProductSearchChange,
  onToggleProductPicker,
  onCloseProductPicker,
  onAddProduct,
  onRemoveItem,
  onToggleCustomItem,
  onCustomItemNameChange,
  onCustomItemPriceChange,
  onCustomItemQuantityChange,
  onAddCustomItem,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-200 dark:border-white/10">
        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
          <Package size={16} /> Adicionar Produto/Servico
        </h3>
        <div className="flex gap-3">
          {/* Searchable product picker */}
          <div className="flex-1 relative" ref={productPickerRef}>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              className="w-full flex items-center justify-between gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-white/8 transition-colors"
              onClick={onToggleProductPicker}
            >
              <span className={`truncate ${selectedProduct ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {selectedProduct ? selectedProduct.name : 'Selecione um item...'}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                {selectedProduct ? BRL_CURRENCY.format(selectedProduct.price) : ''}
              </span>
            </Button>

            {productPickerOpen && (
              <ProductPickerDropdown
                products={products}
                filteredProducts={filteredProducts}
                selectedProductId={selectedProductId}
                productSearch={productSearch}
                productSearchInputRef={productSearchInputRef}
                onSearchChange={onProductSearchChange}
                onSelect={onSelectProduct}
                onClose={onCloseProductPicker}
              />
            )}
          </div>

          <input
            type="number"
            min="1"
            className="w-20 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
            value={productQuantity}
            onChange={e => onProductQuantityChange(parseInt(e.target.value))}
          />
          <Button
            onClick={onAddProduct}
            disabled={!selectedProductId}
            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            Adicionar
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Produto depende do cliente? Use um item personalizado (nao precisa estar no catalogo).
          </div>
          <Button
            type="button"
            onClick={onToggleCustomItem}
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showCustomItem ? 'Fechar' : 'Adicionar item personalizado'}
          </Button>
        </div>

        {showCustomItem && (
          <CustomItemForm
            customItemName={customItemName}
            customItemPrice={customItemPrice}
            customItemQuantity={customItemQuantity}
            onNameChange={onCustomItemNameChange}
            onPriceChange={onCustomItemPriceChange}
            onQuantityChange={onCustomItemQuantityChange}
            onAdd={onAddCustomItem}
          />
        )}
      </div>

      {/* Products table */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 font-medium">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 w-20 text-center">Qtd</th>
              <th className="px-4 py-3 w-32 text-right">Preco Unit.</th>
              <th className="px-4 py-3 w-32 text-right">Total</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {!deal.items || deal.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">
                  Nenhum produto adicionado. O valor do negocio e manual.
                </td>
              </tr>
            ) : (
              deal.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{BRL_CURRENCY.format(item.price)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{BRL_CURRENCY.format(item.price * item.quantity)}</td>
                  <td className="px-4 py-3 text-center">
                    <Button onClick={() => onRemoveItem(deal.id, item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/5">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">
                Total do Pedido
              </td>
              <td className="px-4 py-3 text-right font-bold text-primary-600 dark:text-primary-400 text-lg">
                {BRL_CURRENCY.format(deal.value)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
