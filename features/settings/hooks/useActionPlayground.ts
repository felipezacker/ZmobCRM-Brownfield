import { useMemo, useState } from 'react';
import type { Board } from '@/types';

type ActionType = 'create_lead' | 'create_deal' | 'move_stage' | 'create_activity';
type TestResult = { ok: boolean; message: string; raw?: unknown };
type Toast = (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;

const extractErrorMsg = (e: unknown, fallback: string): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return fallback;
};

const URLS = {
  contacts: '/api/public/v1/contacts',
  deals: '/api/public/v1/deals',
  activities: '/api/public/v1/activities',
  moveStage: '/api/public/v1/deals/move-stage',
} as const;

export function useActionPlayground(
  addToast: Toast,
  boards: Board[],
  activeToken: string,
) {
  // Action selection
  const [action, setAction] = useState<ActionType>('create_lead');

  // Board/stage selection (shared by create_deal & move_stage)
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedToStageId, setSelectedToStageId] = useState('');

  // Identity for move_stage
  const [identityMode, setIdentityMode] = useState<'phone' | 'email'>('phone');
  const [identityPhone, setIdentityPhone] = useState('');
  const [identityEmail, setIdentityEmail] = useState('');

  // Lead form fields
  const [leadName, setLeadName] = useState('Lead Teste');
  const [leadEmail, setLeadEmail] = useState('teste@exemplo.com');
  const [leadPhone, setLeadPhone] = useState('+5511999999999');
  const [leadSource, setLeadSource] = useState('n8n');
  const [leadRole, setLeadRole] = useState('Gerente');
  const [leadCompanyName, setLeadCompanyName] = useState('Empresa Teste');
  const [leadNotes, setLeadNotes] = useState('');

  // Activity fields
  const [activityType, setActivityType] = useState('NOTE');
  const [activityTitle, setActivityTitle] = useState('Nota via integração');

  // Test state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Derived board data
  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedBoardId),
    [boards, selectedBoardId],
  );
  const selectedBoardKey = selectedBoard?.key || '';
  const stagesForBoard = useMemo(() => selectedBoard?.stages || [], [selectedBoard]);
  const selectedToStageLabel = useMemo(() => {
    if (!selectedToStageId) return '';
    const stage = stagesForBoard.find((s) => s.id === selectedToStageId);
    return stage?.label || '';
  }, [selectedToStageId, stagesForBoard]);
  const suggestedMark = useMemo<'won' | 'lost' | null>(() => {
    if (!selectedToStageId) return null;
    if (selectedBoard?.wonStageId && selectedToStageId === selectedBoard.wonStageId) return 'won';
    if (selectedBoard?.lostStageId && selectedToStageId === selectedBoard.lostStageId) return 'lost';
    return null;
  }, [selectedBoard?.wonStageId, selectedBoard?.lostStageId, selectedToStageId]);

  // Curl example generation
  const curlExample = useMemo(() => {
    const token = activeToken || 'SUA_API_KEY';
    if (action === 'create_lead') {
      const esc = (v: string) => v.replaceAll('"', '\\"');
      const roleLine = leadRole ? `,\\n+    \\\"role\\\": \\\"${esc(leadRole)}\\\"` : '';
      const companyLine = leadCompanyName ? `,\\n+    \\\"company_name\\\": \\\"${esc(leadCompanyName)}\\\"` : '';
      const notesLine = leadNotes ? `,\\n+    \\\"notes\\\": \\\"${esc(leadNotes)}\\\"` : '';
      return `curl -X POST '${URLS.contacts}' \\\n+  -H 'Content-Type: application/json' \\\n+  -H 'X-Api-Key: ${token}' \\\n+  -d '{\n+    \"name\": \"${esc(leadName || 'Lead')}\",\n+    \"email\": \"${esc(leadEmail || 'teste@exemplo.com')}\",\n+    \"phone\": \"${esc(leadPhone || '+5511999999999')}\",\n+    \"source\": \"${esc(leadSource || 'n8n')}\"${roleLine}${companyLine}${notesLine}\n+  }'`;
    }
    if (action === 'create_deal') {
      return `curl -X POST '${URLS.deals}' \\\n+  -H 'Content-Type: application/json' \\\n+  -H 'X-Api-Key: ${token}' \\\n+  -d '{\n+    \"title\": \"Deal Teste\",\n+    \"value\": 0,\n+    \"board_key\": \"${selectedBoardKey || 'board-key'}\",\n+    \"contact\": {\n+      \"name\": \"Lead Teste\",\n+      \"email\": \"teste@exemplo.com\",\n+      \"phone\": \"+5511999999999\"\n+    }\n+  }'`;
    }
    if (action === 'move_stage') {
      const stageLabel = selectedToStageLabel || 'STAGE_LABEL';
      const boardKeyOrId = selectedBoardKey || selectedBoardId || 'board_key';
      const phone = identityPhone.trim() || '+5511999999999';
      const email = identityEmail.trim() || 'teste@exemplo.com';
      const identityField =
        identityMode === 'phone'
          ? `\"phone\": \"${phone.replaceAll('"', '\\"')}\",`
          : `\"email\": \"${email.replaceAll('"', '\\"')}\",`;
      const markField = suggestedMark ? `\n+    \"mark\": \"${suggestedMark}\",` : '';
      return `curl -X POST '${URLS.moveStage}' \\\n+  -H 'Content-Type: application/json' \\\n+  -H 'X-Api-Key: ${token}' \\\n+  -d '{\n+    \"board_key_or_id\": \"${boardKeyOrId}\",\n+    ${identityField}${markField}\n+    \"to_stage_label\": \"${stageLabel.replaceAll('"', '\\"')}\"\n+  }'`;
    }
    return `curl -X POST '${URLS.activities}' \\\n+  -H 'Content-Type: application/json' \\\n+  -H 'X-Api-Key: ${token}' \\\n+  -d '{\n+    \"type\": \"${activityType}\",\n+    \"title\": \"${activityTitle.replaceAll('"', '\\"')}\",\n+    \"description\": \"Criada via integração\",\n+    \"date\": \"${new Date().toISOString()}\"\n+  }'`;
  }, [
    action, activeToken, selectedBoardKey, selectedBoardId,
    leadName, leadEmail, leadPhone, leadSource, leadRole, leadCompanyName, leadNotes,
    identityMode, identityPhone, identityEmail,
    selectedToStageLabel, suggestedMark, activityTitle, activityType,
  ]);

  const runActionTest = async () => {
    if (!activeToken) {
      addToast('Cole uma API key (ou crie uma nova) para testar.', 'warning');
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      if (action === 'create_lead') {
        const res = await fetch(URLS.contacts, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': activeToken },
          body: JSON.stringify({
            name: leadName || 'Lead Teste',
            email: leadEmail || `teste+${Date.now()}@exemplo.com`,
            phone: leadPhone || '+5511999999999',
            source: leadSource || 'ui-test',
            role: leadRole || undefined,
            company_name: leadCompanyName || undefined,
            notes: leadNotes || undefined,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Falha no teste');
        setTestResult({ ok: true, message: `OK (${json?.action || 'ok'})`, raw: json });
        return;
      }

      if (action === 'create_deal') {
        if (!selectedBoardKey) {
          addToast('Escolha um board com key (slug) para criar deal.', 'warning');
          setTestResult({ ok: false, message: 'Selecione um board com key.' });
          return;
        }
        const res = await fetch(URLS.deals, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': activeToken },
          body: JSON.stringify({
            title: `Deal Teste ${new Date().toLocaleTimeString('pt-BR')}`,
            value: 0,
            board_key: selectedBoardKey,
            contact: {
              name: 'Lead Teste',
              email: `teste+${Date.now()}@exemplo.com`,
              phone: '+5511999999999',
            },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Falha no teste');
        setTestResult({ ok: true, message: 'OK (deal criado)', raw: json });
        return;
      }

      if (action === 'create_activity') {
        const res = await fetch(URLS.activities, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': activeToken },
          body: JSON.stringify({
            type: activityType,
            title: activityTitle,
            description: 'Criada pelo teste da UI',
            date: new Date().toISOString(),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Falha no teste');
        setTestResult({ ok: true, message: 'OK (atividade criada)', raw: json });
        return;
      }

      if (action === 'move_stage') {
        if (!selectedToStageId) {
          addToast('Selecione a etapa de destino.', 'warning');
          setTestResult({ ok: false, message: 'Selecione uma etapa.' });
          return;
        }
        if (!selectedToStageLabel) {
          addToast('Etapa inválida para este board.', 'warning');
          setTestResult({ ok: false, message: 'Etapa inválida.' });
          return;
        }
        if (!selectedBoardKey && !selectedBoardId) {
          addToast('Selecione um board.', 'warning');
          setTestResult({ ok: false, message: 'Selecione um board.' });
          return;
        }
        const phone = identityPhone.trim();
        const email = identityEmail.trim().toLowerCase();
        if (identityMode === 'phone' && !phone) {
          addToast('Informe telefone (E.164).', 'warning');
          setTestResult({ ok: false, message: 'Informe telefone.' });
          return;
        }
        if (identityMode === 'email' && !email) {
          addToast('Informe email.', 'warning');
          setTestResult({ ok: false, message: 'Informe email.' });
          return;
        }
        const res = await fetch(URLS.moveStage, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': activeToken },
          body: JSON.stringify({
            board_key_or_id: selectedBoardKey || selectedBoardId,
            ...(identityMode === 'phone' ? { phone } : { email }),
            ...(suggestedMark ? { mark: suggestedMark } : {}),
            to_stage_label: selectedToStageLabel,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Falha no teste');
        setTestResult({ ok: true, message: 'OK (deal movido)', raw: json });
        return;
      }
    } catch (e: unknown) {
      setTestResult({ ok: false, message: extractErrorMsg(e, 'Erro no teste') });
    } finally {
      setTestLoading(false);
    }
  };

  return {
    // Action selection
    action, setAction,
    // Board/stage
    selectedBoardId, setSelectedBoardId,
    selectedToStageId, setSelectedToStageId,
    selectedBoard, selectedBoardKey, stagesForBoard,
    selectedToStageLabel, suggestedMark,
    // Identity
    identityMode, setIdentityMode,
    identityPhone, setIdentityPhone,
    identityEmail, setIdentityEmail,
    // Lead form
    leadName, setLeadName,
    leadEmail, setLeadEmail,
    leadPhone, setLeadPhone,
    leadSource, setLeadSource,
    leadRole, setLeadRole,
    leadCompanyName, setLeadCompanyName,
    leadNotes, setLeadNotes,
    // Activity
    activityType, setActivityType,
    activityTitle, setActivityTitle,
    // Test
    testLoading, testResult, runActionTest,
    // Curl
    curlExample,
  } as const;
}
