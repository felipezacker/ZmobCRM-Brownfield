import { useMemo, useState, useEffect, useCallback, type RefObject } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/utils/errorUtils';
import { useAuth } from '@/context/AuthContext';
import { isE164, normalizePhoneE164 } from '@/lib/phone';

type Profile = NonNullable<ReturnType<typeof useAuth>['profile']>;

interface UseProfileFormParams {
    profile: Profile | null;
    refreshProfile: () => Promise<void>;
    sb: SupabaseClient;
    fileInputRef: RefObject<HTMLInputElement | null>;
}

/**
 * Custom hook que encapsula todo o estado e logica do formulario de perfil.
 * Extraido de ProfilePage.tsx para reduzir complexidade do componente.
 */
export function useProfileForm({ profile, refreshProfile, sb, fileInputRef }: UseProfileFormParams) {
    // --- UI state ---
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // --- Password state ---
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // --- Profile fields ---
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [commissionRate, setCommissionRate] = useState('');

    // --- Email change state ---
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');

    // --- Load profile data ---
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setNickname(profile.nickname || '');
            setPhone(normalizePhoneE164(profile.phone || ''));
            setAvatarUrl(profile.avatar_url || null);
            setCommissionRate(profile.commission_rate != null ? String(profile.commission_rate) : '');
        }
    }, [profile]);

    // --- Memoized validations ---
    const passwordRequirements = useMemo(() => ({
        minLength: newPassword.length >= 6,
        hasLowercase: /[a-z]/.test(newPassword),
        hasUppercase: /[A-Z]/.test(newPassword),
        hasDigit: /\d/.test(newPassword),
    }), [newPassword]);

    const isPasswordValid = useMemo(
        () => Object.values(passwordRequirements).every(Boolean),
        [passwordRequirements],
    );

    // --- Memoized display strings ---
    const initials = useMemo(() => {
        if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
        if (nickname) return nickname.substring(0, 2).toUpperCase();
        return profile?.email?.substring(0, 2).toUpperCase() || 'U';
    }, [firstName, lastName, nickname, profile?.email]);

    const displayName = useMemo(() => {
        if (nickname) return nickname;
        if (firstName) return firstName;
        return profile?.email?.split('@')[0] || 'Usuario';
    }, [firstName, nickname, profile?.email]);

    const fullName = useMemo(() => {
        if (firstName && lastName) return `${firstName} ${lastName}`;
        if (firstName) return firstName;
        return null;
    }, [firstName, lastName]);

    const gradient = useMemo(() => {
        const colors = [
            'from-violet-500 to-purple-600',
            'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500',
            'from-orange-500 to-amber-500',
            'from-pink-500 to-rose-500',
            'from-indigo-500 to-blue-500',
        ];
        const email = profile?.email || '';
        const colorIndex = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[colorIndex];
    }, [profile?.email]);

    // --- Stable callbacks ---
    const triggerAvatarPicker = useCallback(() => {
        fileInputRef.current?.click();
    }, [fileInputRef]);

    const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile?.id) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Por favor, selecione uma imagem.' });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'A imagem deve ter no maximo 2MB.' });
            return;
        }

        setUploadingAvatar(true);
        setMessage(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await sb.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = sb.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

            const { error: updateError } = await sb
                .from('profiles')
                .update({ avatar_url: urlWithTimestamp })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            setAvatarUrl(urlWithTimestamp);
            if (refreshProfile) await refreshProfile();
            setMessage({ type: 'success', text: 'Foto atualizada!' });
        } catch (err: unknown) {
            console.error('Upload error:', err);
            setMessage({ type: 'error', text: getErrorMessage(err) });
        } finally {
            setUploadingAvatar(false);
        }
    }, [profile?.id, sb, refreshProfile]);

    const handleRemoveAvatar = useCallback(async () => {
        if (!profile?.id) return;

        setUploadingAvatar(true);
        setMessage(null);

        try {
            await sb.storage
                .from('avatars')
                .remove([`avatars/${profile.id}.jpg`, `avatars/${profile.id}.png`, `avatars/${profile.id}.jpeg`]);

            const { error } = await sb
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', profile.id);

            if (error) throw error;

            setAvatarUrl(null);
            if (refreshProfile) await refreshProfile();
            setMessage({ type: 'success', text: 'Foto removida!' });
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(err) });
        } finally {
            setUploadingAvatar(false);
        }
    }, [profile?.id, sb, refreshProfile]);

    const handleSaveProfile = useCallback(async () => {
        setSavingProfile(true);
        setMessage(null);

        try {
            const normalizedPhone = normalizePhoneE164(phone);
            if (normalizedPhone && !isE164(normalizedPhone)) {
                setMessage({
                    type: 'error',
                    text: 'Telefone invalido. Use o formato E.164 (ex.: +5511999999999).',
                });
                return;
            }

            const isAdminOrDiretor = profile?.role === 'admin' || profile?.role === 'diretor';
            let parsedCommissionRate: number | null = null;
            if (isAdminOrDiretor && commissionRate.trim() !== '') {
                parsedCommissionRate = parseFloat(commissionRate);
                if (isNaN(parsedCommissionRate) || parsedCommissionRate < 0 || parsedCommissionRate > 100) {
                    setMessage({
                        type: 'error',
                        text: 'Taxa de comissao deve ser um numero entre 0 e 100.',
                    });
                    return;
                }
            }

            const updatePayload: Record<string, string | number | null> = {
                first_name: firstName.trim() || null,
                last_name: lastName.trim() || null,
                nickname: nickname.trim() || null,
                phone: normalizedPhone || null,
            };
            if (isAdminOrDiretor) {
                updatePayload.commission_rate = commissionRate.trim() !== '' ? parsedCommissionRate : null;
            }

            const { error } = await sb
                .from('profiles')
                .update(updatePayload)
                .eq('id', profile?.id);

            if (error) throw error;

            if (refreshProfile) await refreshProfile();

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setIsEditingProfile(false);
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(err) });
        } finally {
            setSavingProfile(false);
        }
    }, [phone, profile?.role, profile?.id, commissionRate, firstName, lastName, nickname, sb, refreshProfile]);

    const handleChangePassword = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas nao coincidem.' });
            return;
        }

        if (!isPasswordValid) {
            setMessage({ type: 'error', text: 'A senha nao atende aos requisitos minimos.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await sb.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setIsChangingPassword(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(err) });
        } finally {
            setLoading(false);
        }
    }, [newPassword, confirmPassword, isPasswordValid, sb]);

    const handleChangeEmail = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        try {
            const { error } = await sb.auth.updateUser({ email: newEmail });
            if (error) throw error;

            setMessage({ type: 'success', text: 'E-mail de confirmacao enviado para o novo endereco!' });
            setIsChangingEmail(false);
            setNewEmail('');
        } catch (err: unknown) {
            setMessage({ type: 'error', text: getErrorMessage(err) });
        } finally {
            setLoading(false);
        }
    }, [newEmail, sb]);

    const handleCancelEdit = useCallback(() => {
        setIsEditingProfile(false);
        setFirstName(profile?.first_name || '');
        setLastName(profile?.last_name || '');
        setNickname(profile?.nickname || '');
        setPhone(normalizePhoneE164(profile?.phone || ''));
        setCommissionRate(profile?.commission_rate != null ? String(profile.commission_rate) : '');
        setMessage(null);
    }, [profile]);

    const handleCancelPasswordChange = useCallback(() => {
        setIsChangingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setMessage(null);
    }, []);

    const handleCancelEmailChange = useCallback(() => {
        setIsChangingEmail(false);
        setNewEmail('');
    }, []);

    return {
        // UI state
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

        // Password
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        passwordRequirements,
        isPasswordValid,

        // Profile fields
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

        // Email change
        isChangingEmail,
        setIsChangingEmail,
        newEmail,
        setNewEmail,

        // Derived
        initials,
        displayName,
        fullName,
        gradient,

        // Actions
        triggerAvatarPicker,
        handleAvatarUpload,
        handleRemoveAvatar,
        handleSaveProfile,
        handleChangePassword,
        handleChangeEmail,
        handleCancelEdit,
        handleCancelPasswordChange,
        handleCancelEmailChange,
    };
}
