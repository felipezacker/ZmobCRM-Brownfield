// Re-export client
export { supabase } from './supabase/client';

// Re-export all services
export { boardsService, boardStagesService } from './supabase/boards';
export { contactsService } from './supabase/contacts';
export { contactPreferencesService } from './supabase/contact-preferences';
export { dealsService, calculateEstimatedCommission } from './supabase/deals';
export { activitiesService } from './supabase/activities';
export { productsService } from './supabase/products';
export { settingsService, lifecycleStagesService } from './supabase/settings';

// Re-export Realtime hooks
export { useRealtimeSync, useRealtimeSyncAll, useRealtimeSyncKanban } from './realtime';
