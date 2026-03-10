import React, { useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { Loader2, User, Mail, Shield, Calendar, Key, Check, Eye, EyeOff, Phone, Pencil, Save, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Componente React `ProfilePage`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const ProfilePage: React.FC = () => {
    const { profile, refreshProfile } = useAuth();

    // Em ambientes onde as variáveis de ambiente não estão configuradas,
    // nosso helper pode retornar `null` para evitar crash.
    const sb = supabase;

    const fileInputRef = useRef<HTMLInputElement>(null);

    // All hooks must be called before the early return (Rules of Hooks).
    // The hook receives sb as non-null; the early return below guards against null.
    const form = useProfileForm({
        profile,
        refreshProfile,
        sb: sb!,
        fileInputRef,
    });

    // Sem Supabase não há como salvar/atualizar perfil.
    // Hooks MUST come before early returns (rules-of-hooks).
    if (!sb) {
        return (
            <div className="p-6">
                <div className="max-w-xl mx-auto bg-white dark:bg-dark-card border border-border rounded-2xl p-6">
                    <h1 className="text-lg font-bold text-foreground mb-2">
                        Configuração incompleta
                    </h1>
                    <p className="text-secondary-foreground dark:text-muted-foreground">
                        O Supabase não está configurado neste ambiente. Verifique as variáveis de ambiente
                        (URL e ANON KEY) para usar a página de perfil.
                    </p>
                </div>
            </div>
        );
    }

    const {
        isChangingPassword,
        setIsChangingPassword,
        isEditingProfile,
        setIsEditingProfile,
        showPasswords,
        setShowPasswords,
        loading,
        savingProfile,
        uploadingAvatar,
        message,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        passwordRequirements,
        firstName,
        setFirstName,
        lastName,
        setLastName,
        nickname,
        setNickname,
        phone,
        setPhone,
        avatarUrl,
        commissionRate,
        setCommissionRate,
        isChangingEmail,
        setIsChangingEmail,
        newEmail,
        setNewEmail,
        initials,
        displayName,
        fullName,
        gradient,
        triggerAvatarPicker,
        handleAvatarUpload,
        handleRemoveAvatar,
        handleSaveProfile,
        handleChangePassword,
        handleChangeEmail,
        handleCancelEdit,
        handleCancelPasswordChange,
        handleCancelEmailChange,
    } = form;

    return (
        <div className="max-w-2xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
                    Meu Perfil
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground mt-2">
                    Gerencie suas informações pessoais e segurança.
                </p>
            </div>

            {/* Mensagem de feedback */}
            {message && (
                <div className={`flex items-center gap-2 p-4 rounded-xl text-sm mb-6 ${message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                    }`}>
                    {message.type === 'success' && <Check className="w-4 h-4" />}
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white dark:bg-white/3 border border-border rounded-2xl p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar Grande com Upload */}
                        <div className="relative group">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt="Avatar"
                                    width={80}
                                    height={80}
                                    className="w-20 h-20 rounded-2xl object-cover shadow-xl"
                                    unoptimized
                                />
                            ) : (
                                <div className={`w-20 h-20 rounded-2xl bg-linear-to-br ${gradient} flex items-center justify-center text-white font-bold text-2xl shadow-xl`}>
                                    {initials}
                                </div>
                            )}

                            {/* Overlay de upload */}
                            <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {uploadingAvatar ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <Button
                                        onClick={triggerAvatarPicker}
                                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                    >
                                        <Camera className="w-5 h-5 text-white" />
                                    </Button>
                                )}
                            </div>

                            {/* Botão de remover (só aparece se tem foto) */}
                            {avatarUrl && !uploadingAvatar && (
                                <Button
                                    onClick={handleRemoveAvatar}
                                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                                    title="Remover foto"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            )}

                            {/* Input hidden para upload */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Info resumida */}
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">
                                {displayName}
                            </h2>
                            {fullName && (
                                <p className="text-muted-foreground dark:text-muted-foreground mt-0.5">
                                    {fullName}
                                </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${profile?.role === 'admin'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                    <Shield className="w-3 h-3" />
                                    {profile?.role === 'admin' ? 'Admin' : profile?.role === 'diretor' ? 'Diretor' : 'Corretor'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {!isEditingProfile && (
                        <Button
                            onClick={() => setIsEditingProfile(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
                        >
                            <Pencil className="w-4 h-4" />
                            Editar
                        </Button>
                    )}
                </div>

                {/* Modo de edição */}
                {isEditingProfile ? (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-border dark:border-border rounded-xl bg-background dark:bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 transition-all"
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                    Sobrenome
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-border dark:border-border rounded-xl bg-background dark:bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 transition-all"
                                    placeholder="Seu sobrenome"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                Apelido
                                <span className="text-muted-foreground font-medium ml-1">(como gostaria de ser chamado)</span>
                            </label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full px-4 py-2.5 border-2 border-border dark:border-border rounded-xl bg-background dark:bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 transition-all"
                                placeholder="Seu apelido"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                Telefone
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 border-2 border-border dark:border-border rounded-xl bg-background dark:bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 transition-all"
                                    placeholder="+5511999999999"
                                />
                            </div>
                        </div>

                        {/* Taxa de Comissão (apenas admin/diretor) */}
                        {(profile?.role === 'admin' || profile?.role === 'diretor') && (
                            <div>
                                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                    Taxa de Comissão (%)
                                    <span className="text-muted-foreground font-medium ml-1">(padrão para novos deals)</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={commissionRate}
                                    onChange={(e) => setCommissionRate(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-border dark:border-border rounded-xl bg-background dark:bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 transition-all"
                                    placeholder="1.5"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Valor entre 0 e 100. Usado como fallback quando o deal não possui taxa específica.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                onClick={handleCancelEdit}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={savingProfile}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
                            >
                                {savingProfile ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Salvar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Modo de visualização */
                    <div className="grid gap-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-secondary-foreground dark:text-muted-foreground">{profile?.email}</span>
                            </div>
                            {!isChangingEmail && (
                                <Button
                                    onClick={() => setIsChangingEmail(true)}
                                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                                >
                                    Alterar
                                </Button>
                            )}
                        </div>

                        {/* Alterar email form */}
                        {isChangingEmail && (
                            <form onSubmit={handleChangeEmail} className="bg-background dark:bg-card/50 p-4 rounded-xl space-y-3">
                                <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground">
                                    Novo E-mail
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-border dark:border-border rounded-lg bg-white dark:bg-card text-foreground focus:outline-none focus:border-primary-500"
                                    placeholder="seu@novoemail.com"
                                    required
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        onClick={handleCancelEmailChange}
                                        className="px-3 py-1.5 text-sm text-secondary-foreground dark:text-muted-foreground hover:text-foreground"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {phone && (
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span className="text-secondary-foreground dark:text-muted-foreground">{phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground dark:text-muted-foreground">
                                Membro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '-'}
                            </span>
                        </div>
                        {profile?.commission_rate != null && (
                            <div className="flex items-center gap-3 text-sm">
                                <span className="w-4 h-4 text-muted-foreground flex items-center justify-center text-xs font-bold">%</span>
                                <span className="text-secondary-foreground dark:text-muted-foreground">
                                    Comissão: {profile.commission_rate}%
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Security Section */}
            <div className="bg-white dark:bg-white/3 border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Key className="w-5 h-5 text-muted-foreground" />
                            Segurança
                        </h3>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                            Gerencie sua senha de acesso.
                        </p>
                    </div>
                    {!isChangingPassword && (
                        <Button
                            onClick={() => setIsChangingPassword(true)}
                            className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                            Alterar Senha
                        </Button>
                    )}
                </div>

                {isChangingPassword && (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                Nova Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-border dark:border-border rounded-xl bg-background dark:bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-500 transition-all pr-10"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    minLength={6}
                                />
                                <Button
                                    type="button"
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground"
                                >
                                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>

                            {/* Password Requirements */}
                            {newPassword.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">Requisitos:</p>
                                    <div className="grid grid-cols-2 gap-1 text-xs">
                                        <span className={passwordRequirements.minLength ?'text-green-500' : 'text-muted-foreground'}>
                                            {passwordRequirements.minLength ? '✓' : '○'} Mínimo 6 caracteres
                                        </span>
                                        <span className={passwordRequirements.hasLowercase ?'text-green-500' : 'text-muted-foreground'}>
                                            {passwordRequirements.hasLowercase ? '✓' : '○'} Letra minúscula
                                        </span>
                                        <span className={passwordRequirements.hasUppercase ?'text-green-500' : 'text-muted-foreground'}>
                                            {passwordRequirements.hasUppercase ? '✓' : '○'} Letra maiúscula
                                        </span>
                                        <span className={passwordRequirements.hasDigit ?'text-green-500' : 'text-muted-foreground'}>
                                            {passwordRequirements.hasDigit ? '✓' : '○'} Número
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-foreground dark:text-muted-foreground mb-2">
                                Confirmar Nova Senha
                            </label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-2.5 border-2 rounded-xl bg-background dark:bg-card/50 text-foreground  placeholder:text-muted-foreground focus:outline-none transition-all ${confirmPassword.length > 0
                                    ? (newPassword === confirmPassword && confirmPassword.length > 0)
                                        ? 'border-green-500 focus:border-green-500'
                                        : 'border-red-500 focus:border-red-500'
                                    : 'border-border dark:border-border focus:border-primary-500'
                                    }`}
                                placeholder="Digite novamente"
                                required
                            />
                            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                                <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
                            )}
                            {confirmPassword.length > 0 && newPassword === confirmPassword && (
                                <p className="mt-1 text-xs text-green-500">✓ Senhas coincidem</p>
                            )}
                        </div>

                        {message && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${message.type === 'success'
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                }`}>
                                {message.type === 'success' && <Check className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                onClick={handleCancelPasswordChange}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Salvar Senha
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}

                {!isChangingPassword && (
                    <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                        Sua senha está configurada. Clique em "Alterar Senha" para modificá-la.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
