import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';

interface UseDangerZoneParams {
  addToast: (message: string, type: 'success' | 'error') => void;
  sb: SupabaseClient | null;
  queryClient: QueryClient;
  refresh: () => Promise<void>;
}

export function useDangerZone({ addToast, sb, queryClient, refresh }: UseDangerZoneParams) {
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleNukeDatabase = async () => {
    if (confirmText !== 'DELETAR TUDO') {
      addToast('Digite "DELETAR TUDO" para confirmar', 'error');
      return;
    }

    if (!sb) {
      addToast('Supabase não está configurado neste ambiente.', 'error');
      return;
    }

    setIsDeleting(true);

    try {
      const { error: boardsRefsError } = await sb
        .from('boards')
        .update({ won_stage_id: null, lost_stage_id: null, next_board_id: null })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (boardsRefsError) throw boardsRefsError;

      const { error: deliveriesError } = await sb
        .from('webhook_deliveries')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (deliveriesError) console.warn('Aviso: erro ao limpar webhook_deliveries:', deliveriesError);

      const { error: eventsOutError } = await sb
        .from('webhook_events_out')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (eventsOutError) console.warn('Aviso: erro ao limpar webhook_events_out:', eventsOutError);

      const { error: eventsInError } = await sb
        .from('webhook_events_in')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (eventsInError) console.warn('Aviso: erro ao limpar webhook_events_in:', eventsInError);

      const { error: outboundError } = await sb
        .from('integration_outbound_endpoints')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (outboundError) console.warn('Aviso: erro ao limpar integration_outbound_endpoints:', outboundError);

      const { error: inboundError } = await sb
        .from('integration_inbound_sources')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (inboundError) console.warn('Aviso: erro ao limpar integration_inbound_sources:', inboundError);

      const { error: activitiesError } = await sb.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (activitiesError) throw activitiesError;

      const { error: itemsError } = await sb.from('deal_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (itemsError) throw itemsError;

      const { error: dealsError } = await sb.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (dealsError) throw dealsError;

      const { error: userSettingsError } = await sb
        .from('user_settings')
        .update({ active_board_id: null })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (userSettingsError) console.warn('Aviso: erro ao limpar user_settings (pode não existir ainda):', userSettingsError);

      const { error: stagesError } = await sb.from('board_stages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (stagesError) throw stagesError;

      const { error: boardsError } = await sb.from('boards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (boardsError) throw boardsError;

      const { error: contactsError } = await sb.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (contactsError) throw contactsError;

      const { error: tagsError } = await sb.from('tags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (tagsError) throw tagsError;

      const { error: productsError } = await sb.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (productsError) throw productsError;

      await queryClient.invalidateQueries();
      queryClient.removeQueries({ queryKey: queryKeys.boards.all });
      queryClient.removeQueries({ queryKey: [...queryKeys.boards.all, 'default'] as const });
      queryClient.removeQueries({ queryKey: queryKeys.deals.all });

      await refresh();

      addToast('🔥 Database zerado com sucesso!', 'success');
      setConfirmText('');
      setShowDangerZone(false);

    } catch (error: unknown) {
      console.error('Erro ao zerar database:', error);
      addToast(`Erro: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    showDangerZone,
    setShowDangerZone,
    confirmText,
    setConfirmText,
    isDeleting,
    handleNukeDatabase,
  };
}
