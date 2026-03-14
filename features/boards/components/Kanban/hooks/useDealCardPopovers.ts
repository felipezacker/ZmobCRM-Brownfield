import { useState, useMemo, useCallback } from 'react';
import { Product } from '@/types';
import type { OrgMember } from '@/hooks/useOrganizationMembers';
import { productsService } from '@/lib/supabase/products';

interface UseDealCardPopoversParams {
  dealId: string;
  products: Product[];
  members: OrgMember[];
  onProductChange: (dealId: string, product: Product | null) => void;
  onOwnerChange: (dealId: string, member: OrgMember | null) => void;
}

export function useDealCardPopovers({
  dealId,
  products,
  members,
  onProductChange,
  onOwnerChange,
}: UseDealCardPopoversParams) {
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const filteredMembers = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, ownerSearch]);

  const handleCreateProduct = useCallback(async () => {
    if (!productSearch.trim() || creatingProduct) return;
    setCreatingProduct(true);
    try {
      const { data: newProduct, error } = await productsService.create({
        name: productSearch.trim(),
        price: 0,
      });
      if (error || !newProduct) {
        console.error('Falha ao criar produto:', error);
        return;
      }
      window.dispatchEvent(new CustomEvent('crm:products-updated'));
      onProductChange(dealId, newProduct);
      // Popover stays open — transitions to edit view via optimistic update
      setProductSearch('');
    } finally {
      setCreatingProduct(false);
    }
  }, [productSearch, creatingProduct, dealId, onProductChange]);

  const handleSelectProduct = useCallback(
    (product: Product | null) => {
      onProductChange(dealId, product);
      // Only close when removing; selecting keeps popover open for edit view
      if (!product) {
        setProductPickerOpen(false);
      }
      setProductSearch('');
    },
    [dealId, onProductChange],
  );

  const handleSelectOwner = useCallback(
    (member: OrgMember | null) => {
      onOwnerChange(dealId, member);
      setOwnerPickerOpen(false);
    },
    [dealId, onOwnerChange],
  );

  const handleProductPickerOpenChange = useCallback((open: boolean) => {
    setProductPickerOpen(open);
    if (!open) setProductSearch('');
  }, []);

  const handleOwnerPickerOpenChange = useCallback((open: boolean) => {
    setOwnerPickerOpen(open);
    if (!open) setOwnerSearch('');
  }, []);

  return {
    // Product popover
    productSearch,
    setProductSearch,
    productPickerOpen,
    handleProductPickerOpenChange,
    filteredProducts,
    creatingProduct,
    handleCreateProduct,
    handleSelectProduct,

    // Owner popover
    ownerSearch,
    setOwnerSearch,
    ownerPickerOpen,
    handleOwnerPickerOpenChange,
    filteredMembers,
    handleSelectOwner,
  };
}
