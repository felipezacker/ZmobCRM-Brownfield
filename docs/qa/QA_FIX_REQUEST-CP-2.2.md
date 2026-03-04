# QA Fix Request — CP-2.2

**Story:** CP-2.2 — Quick Actions Pós-Chamada + Templates de Notas
**Gate:** CONCERNS (70/100)
**Reviewer:** Quinn (Test Architect)
**Data:** 2026-03-04

---

## Fix 1 — AC10: NoteTemplatesManager sem entry point na UI

**Problema:** O componente `NoteTemplatesManager.tsx` implementa CRUD completo de templates para diretor/admin, mas não é importado nem renderizado em nenhuma página. O diretor/admin não tem como acessar essa funcionalidade.

**Arquivo: `features/prospecting/components/QuickActionsPanel.tsx`**

Adicionar um botão "Gerenciar Templates" no rodapé do painel, visível apenas para admin/director:

1. Importar `NoteTemplatesManager` e `useAuth`:

```tsx
import { NoteTemplatesManager } from '@/features/prospecting/components/NoteTemplatesManager'
import { useAuth } from '@/context/AuthContext'
```

2. Adicionar state e verificação de role:

```tsx
const [showTemplatesManager, setShowTemplatesManager] = useState(false)
const { profile } = useAuth()
const isAdminOrDirector = profile?.role === 'admin' || profile?.role === 'director'
```

3. Renderizar botão acima do "Pular e avançar →", apenas se `isAdminOrDirector`:

```tsx
{isAdminOrDirector && (
  <button
    type="button"
    onClick={() => setShowTemplatesManager(true)}
    className="w-full py-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-teal-500 dark:hover:text-teal-400 transition-colors text-center"
  >
    Gerenciar templates de notas
  </button>
)}
```

4. Renderizar o modal do manager (junto ao CreateDealModal, dentro do Fragment):

```tsx
<NoteTemplatesManager
  isOpen={showTemplatesManager}
  onClose={() => setShowTemplatesManager(false)}
/>
```

**Alternativa (se preferir em Settings):** Importar `NoteTemplatesManager` numa rota de Settings da organização. Mas o QuickActionsPanel é o ponto mais contextual — o admin vê os templates em ação e pode editá-los ali mesmo.

**Testes:** Adicionar 1 teste: "shows 'Gerenciar templates' button for admin role" e "hides button for corretor role".

---

## Fix 2 — AC2: Pre-fill contato no CreateDealModal

**Problema:** O AC2 pede "formulário pré-preenchido com: nome do contato, telefone, stage atual, source = PROSPECTING". Atualmente o modal abre vazio e o corretor precisa buscar o contato manualmente.

**Arquivo 1: `features/boards/components/Modals/CreateDealModal.tsx`**

1. Adicionar prop opcional `initialContactId?: string` na interface `CreateDealModalProps`
2. Importar `useContacts` de `@/lib/query/hooks`
3. Adicionar `useEffect` que, quando `initialContactId` é fornecido e o modal abre (`isOpen`), busca o contato na lista de contatos carregados e chama `setSelectedContact(contact)`:

```tsx
// Na interface:
initialContactId?: string;

// No componente, após os states existentes:
const { contacts } = useContacts(); // já existe no projeto

useEffect(() => {
  if (!isOpen || !initialContactId || selectedContact) return;
  const found = contacts?.find((c: Contact) => c.id === initialContactId);
  if (found) setSelectedContact(found);
}, [isOpen, initialContactId, contacts]);
```

Isso auto-seleciona o contato sem alterar nenhum comportamento existente do modal (prop é opcional).

**Arquivo 2: `features/prospecting/components/QuickActionsPanel.tsx`**

Passar `initialContactId={contactId}` ao renderizar CreateDealModal (linha ~258):

```tsx
<CreateDealModal
  isOpen={showCreateDeal}
  onClose={() => setShowCreateDeal(false)}
  onCreated={handleDealCreated}
  initialContactId={contactId}    // ← adicionar
/>
```

**Testes:** Adicionar 1 teste no `quickActionsPanel.test.tsx` verificando que CreateDealModal recebe `initialContactId`.

---

## Fix 3 — AC3: Data/hora selecionável para Agendar Retorno

**Problema:** O AC3 pede "data/hora futura selecionável (default: próximo dia útil às 10h)". Atualmente clica e agenda direto sem escolha.

**Arquivo: `features/prospecting/components/QuickActionsPanel.tsx`**

Trocar o botão direto por um mini-form com input datetime-local. Abordagem:

1. Adicionar state `showReturnPicker` (boolean) e `returnDate` (string, formato ISO para datetime-local)
2. Ao clicar "Agendar Retorno", em vez de agendar direto, mostrar o picker:

```tsx
const [showReturnPicker, setShowReturnPicker] = useState(false)
const [returnDate, setReturnDate] = useState(() => {
  const d = getNextBusinessDay()
  // Formato para datetime-local: YYYY-MM-DDTHH:MM
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T10:00`
})
```

3. No botão "Agendar Retorno", trocar `onClick={handleScheduleReturn}` por `onClick={() => setShowReturnPicker(true)}`

4. Abaixo do botão, quando `showReturnPicker && !returnScheduled`, renderizar:

```tsx
{showReturnPicker && !returnScheduled && (
  <div className="px-3 pb-2.5 flex items-center gap-2">
    <input
      type="datetime-local"
      value={returnDate}
      onChange={(e) => setReturnDate(e.target.value)}
      className="flex-1 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-md px-2 py-1.5 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-teal-500/50"
    />
    <Button
      variant="unstyled"
      size="unstyled"
      onClick={handleScheduleReturn}
      disabled={isScheduling}
      className="px-3 py-1.5 text-xs font-medium rounded-md bg-teal-500 hover:bg-teal-600 text-white transition-colors disabled:opacity-40"
    >
      {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
    </Button>
  </div>
)}
```

5. No `handleScheduleReturn`, usar `returnDate` em vez de `getNextBusinessDay()`:

```tsx
const handleScheduleReturn = async () => {
  setIsScheduling(true)
  try {
    const scheduledDate = new Date(returnDate)
    await createActivity.mutateAsync({
      activity: {
        title: `Retorno - ${contactName}`,
        description: callNotes || undefined,
        type: 'CALL',
        date: scheduledDate.toISOString(),  // ← usa a data selecionada
        completed: false,
        contactId,
        dealTitle: '',
        user: { name: 'Você', avatar: '' },
        metadata: { source: 'prospecting', scheduled_return: true },
      },
    })
    setReturnScheduled(true)
    toast(`Retorno agendado para ${scheduledDate.toLocaleDateString('pt-BR')} às ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 'success')
  } catch {
    toast('Erro ao agendar retorno', 'error')
  } finally {
    setIsScheduling(false)
  }
}
```

Estrutura visual: mesmo padrão do "Mover Stage" — botão abre inline picker abaixo, botão confirma ao lado.

**Testes:** Atualizar teste "creates activity when Agendar Retorno clicked" para refletir o flow de 2 passos (click → picker aparece → confirmar → atividade criada).

---

## Checklist de entrega

- [x] Fix 1: NoteTemplatesManager acessível via botão no QuickActionsPanel (admin/director only)
- [x] Fix 2: CreateDealModal aceita `initialContactId` e auto-seleciona contato
- [x] Fix 2: QuickActionsPanel passa `contactId` ao CreateDealModal
- [x] Fix 3: Agendar Retorno mostra datetime-local picker com default next business day 10h
- [x] Fix 3: Confirmar agenda na data selecionada
- [x] Testes atualizados/adicionados para os 3 fixes
- [x] Lint + typecheck clean
- [x] 47+ testes passando (sem regressão)
