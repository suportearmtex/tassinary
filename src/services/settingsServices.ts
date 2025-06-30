// src/services/settingsServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import toast from 'react-hot-toast';
import { useState } from 'react';

// Types
export interface UserSettings {
  id?: string;
  user_id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  reminder_time_24h: boolean;
  reminder_time_1h: boolean;
  auto_confirm_appointments: boolean;
  business_hours_start: string;
  business_hours_end: string;
  timezone: string;
  language: string;
  currency: string;
}

export interface GoogleTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
}

export interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  business_address: string;
}

// Hook principal para configurações
export const useSettingsServices = () => {
  const { user } = useAuthStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const queryClient = useQueryClient();

  // Estados locais
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    business_address: ''
  });

  // Query para configurações do usuário
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserSettings;
    },
    enabled: !!user?.id,
  });

  // Query para token do Google
  const { data: googleToken, isLoading: isLoadingToken } = useQuery({
    queryKey: ['google-token', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as GoogleTokenData;
    },
    enabled: !!user?.id,
  });

  // Query para perfil do usuário
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      if (settings?.id) {
        const { data, error } = await supabase
          .from('user_settings')
          .update(newSettings)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_settings')
          .insert([{ ...newSettings, user_id: user?.id }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings', user?.id] });
      toast.success('Configurações atualizadas com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar configurações');
    },
  });

  // Mutation para conectar Google Calendar
  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      
      // Gerar state para OAuth
      const state = btoa(JSON.stringify({ userId: user?.id }));
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&` +
        `response_type=code&` +
        `scope=https://www.googleapis.com/auth/calendar&` +
        `access_type=offline&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google/callback')}&` +
        `state=${encodeURIComponent(state)}`;

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        authUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    },
    onError: (error: any) => {
      setIsConnecting(false);
      toast.error('Erro ao conectar com Google Calendar');
    },
  });

  // Mutation para desconectar Google Calendar
  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('user_google_tokens')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-token', user?.id] });
      setIsDisconnectModalOpen(false);
      toast.success('Google Calendar desconectado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao desconectar Google Calendar');
    },
  });

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (profileInfo: ProfileFormData) => {
      if (userProfile?.id) {
        const { data, error } = await supabase
          .from('user_profiles')
          .update(profileInfo)
          .eq('id', userProfile.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_profiles')
          .insert([{ ...profileInfo, user_id: user?.id }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
      setIsProfileModalOpen(false);
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar perfil');
    },
  });

  // Funções de controle
  const updateSetting = (key: keyof UserSettings, value: any) => {
    const newSettings = { [key]: value };
    updateSettingsMutation.mutate(newSettings);
  };

  const openProfileModal = () => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || user?.email || '',
        phone: userProfile.phone || '',
        business_name: userProfile.business_name || '',
        business_address: userProfile.business_address || ''
      });
    }
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setProfileData({
      full_name: '',
      email: '',
      phone: '',
      business_name: '',
      business_address: ''
    });
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleGoogleConnect = () => {
    connectGoogleMutation.mutate();
  };

  const handleGoogleDisconnect = () => {
    setIsDisconnectModalOpen(true);
  };

  const confirmGoogleDisconnect = () => {
    disconnectGoogleMutation.mutate();
  };

  // Configurações padrão se não existirem
  const currentSettings: UserSettings = settings || {
    user_id: user?.id || '',
    notifications_enabled: true,
    email_notifications: true,
    whatsapp_notifications: true,
    reminder_time_24h: true,
    reminder_time_1h: true,
    auto_confirm_appointments: false,
    business_hours_start: '09:00',
    business_hours_end: '18:00',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    currency: 'BRL'
  };

  // Verificar status das integrações
  const integrationStatus = {
    googleCalendar: !!googleToken,
    whatsapp: false, // TODO: implementar verificação
    notifications: currentSettings.notifications_enabled
  };

  return {
    // Data
    settings: currentSettings,
    googleToken,
    userProfile,
    profileData,
    setProfileData,
    integrationStatus,
    
    // Loading states
    isLoadingSettings,
    isLoadingToken,
    isLoadingProfile,
    isConnecting,
    
    // Modal states
    isProfileModalOpen,
    isDisconnectModalOpen,
    
    // Theme
    isDarkMode,
    toggleTheme,
    
    // Actions
    updateSetting,
    openProfileModal,
    closeProfileModal,
    handleProfileSubmit,
    handleGoogleConnect,
    handleGoogleDisconnect,
    confirmGoogleDisconnect,
    setIsDisconnectModalOpen,
    
    // Mutations
    isUpdatingSettings: updateSettingsMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isConnectingGoogle: connectGoogleMutation.isPending,
    isDisconnectingGoogle: disconnectGoogleMutation.isPending,
  };
};