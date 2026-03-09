import React from 'react';
import { Phone, Users, Mail, CheckSquare, CheckCircle2, Circle, MessageCircle } from 'lucide-react';
import { Activity } from '@/types';

/** Ícone do tipo de atividade para a lista (com cores individuais). */
export const getActivityIconList = (type: Activity['type'], size = 16) => {
    switch (type) {
        case 'CALL': return <Phone size={size} className="text-blue-500" />;
        case 'MEETING': return <Users size={size} className="text-purple-500" />;
        case 'EMAIL': return <Mail size={size} className="text-green-500" />;
        case 'TASK': return <CheckSquare size={size} className="text-orange-500" />;
        case 'WHATSAPP': return <MessageCircle size={size} className="text-emerald-500" />;
        case 'STATUS_CHANGE': return <CheckCircle2 size={size} className="text-muted-foreground" />;
        default: return <Circle size={size} className="text-muted-foreground" />;
    }
};

/** Ícone do tipo de atividade para o calendário (branco). */
export const getActivityIconCalendar = (type: Activity['type'], size = 14) => {
    switch (type) {
        case 'CALL': return <Phone size={size} className="text-white" />;
        case 'MEETING': return <Users size={size} className="text-white" />;
        case 'EMAIL': return <Mail size={size} className="text-white" />;
        case 'TASK': return <CheckSquare size={size} className="text-white" />;
        case 'WHATSAPP': return <MessageCircle size={size} className="text-white" />;
        default: return <Circle size={size} className="text-white" />;
    }
};
