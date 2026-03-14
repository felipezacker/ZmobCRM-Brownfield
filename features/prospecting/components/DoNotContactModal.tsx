import React, { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { contactsService } from '@/lib/supabase'
import { useToast } from '@/context/ToastContext'

interface DoNotContactModalProps {
  isOpen: boolean
  onClose: () => void
  contactId: string
  onBlocked?: () => void
}

export const DoNotContactModal: React.FC<DoNotContactModalProps> = ({
  isOpen,
  onClose,
  contactId,
  onBlocked,
}) => {
  const [reason, setReason] = useState('')
  const [isBlocking, setIsBlocking] = useState(false)
  const { addToast } = useToast()

  const handleClose = useCallback(() => {
    setReason('')
    onClose()
  }, [onClose])

  const handleConfirm = useCallback(async () => {
    if (!reason) return
    setIsBlocking(true)
    try {
      const { error } = await contactsService.markDoNotContact(contactId, reason)
      if (error) throw error
      addToast('Contato bloqueado — não receberá mais ligações', 'success')
      setReason('')
      onBlocked?.()
    } catch {
      addToast('Erro ao bloquear contato', 'error')
    } finally {
      setIsBlocking(false)
    }
  }, [contactId, reason, addToast, onBlocked])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bloquear contato"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Este contato não receberá mais ligações de prospecção. Esta ação pode ser revertida apenas por um admin ou diretor.
        </p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full text-sm bg-background dark:bg-card/50 border border-border dark:border-border/50 rounded-md px-3 py-2 text-secondary-foreground dark:text-muted-foreground outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="">Selecione o motivo...</option>
          <option value="Pediu para não ligar">Pediu para não ligar</option>
          <option value="Número inválido">Número inválido</option>
          <option value="Faleceu">Faleceu</option>
          <option value="Duplicado">Duplicado</option>
        </select>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            variant="unstyled"
            size="sm"
            onClick={handleConfirm}
            disabled={!reason || isBlocking}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 px-4"
          >
            {isBlocking ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Confirmar bloqueio
          </Button>
        </div>
      </div>
    </Modal>
  )
}
