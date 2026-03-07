import React, { useRef } from 'react';
import { Plus, Loader2, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DealFile } from '@/lib/supabase/dealFiles';

interface FilesTabProps {
    files: DealFile[];
    isLoading: boolean;
    isUploading: boolean;
    formatFileSize: (size: number) => string;
    onUpload: (file: File) => void;
    onDownload: (file: DealFile) => void;
    onDelete: (fileId: string, filePath: string) => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({
    files,
    isLoading,
    isUploading,
    formatFileSize,
    onUpload,
    onDownload,
    onDelete,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onUpload(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
            {/* Upload area */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />
            <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center mb-6 transition-all cursor-pointer ${isUploading
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
            >
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                    {isUploading ? (
                        <Loader2 size={20} className="text-primary-400 animate-spin" />
                    ) : (
                        <Plus size={20} className="text-slate-400" />
                    )}
                </div>
                <p className="text-sm font-medium text-white">
                    {isUploading ? 'Enviando...' : 'Adicionar arquivo'}
                </p>
                <p className="text-xs text-slate-500">Clique ou arraste (max 10MB)</p>
            </div>

            <p className="text-xs font-semibold text-slate-500 mb-3 px-1 flex items-center gap-2">
                Arquivos do Deal
                {isLoading && <Loader2 size={12} className="animate-spin" />}
            </p>

            <div className="space-y-2">
                {files.length === 0 && !isLoading ? (
                    <p className="text-sm text-slate-600 text-center py-4">Nenhum arquivo ainda</p>
                ) : (
                    files.map((file) => {
                        const ext = file.file_name.split('.').pop()?.toUpperCase() || 'FILE';
                        return (
                            <div key={file.id} className="flex items-center p-3 rounded-lg bg-slate-800/20 border border-white/5 hover:bg-slate-800/40 transition-colors group">
                                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-400 border border-white/5 uppercase shrink-0">
                                    {ext.slice(0, 3)}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{file.file_name}</p>
                                    <p className="text-xs text-slate-500">
                                        {formatFileSize(file.file_size ?? 0)} - {new Date(file.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <Button
                                    onClick={() => onDownload(file)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors"
                                >
                                    <Download size={16} />
                                </Button>
                                <Button
                                    onClick={() => onDelete(file.id, file.file_path)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
