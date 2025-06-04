import React, { useState, useEffect } from 'react';
import { Calendar, Bell, Smartphone, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

function Settings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: googleToken, isLoading: isLoadingToken } = useQuery({
    queryKey: ['google-token', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', user?.id)
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

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
      toast.success('Google Calendar desconectado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao desconectar Google Calendar');
    },
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'google-calendar-connected') {
        setIsConnecting(false);
        queryClient.invalidateQueries({ queryKey: ['google-token', user?.id] });
        toast.success('Google Calendar conectado com sucesso!');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient, user?.id]);

  const handleGoogleConnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
      const state = session.access_token;

      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${
        import.meta.env.VITE_GOOGLE_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      setIsConnecting(true);
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      toast.error('Erro ao iniciar processo de conexão com Google Calendar');
      setIsConnecting(false);
    }
  };

  const handleGoogleDisconnect = () => {
    if (window.confirm('Tem certeza que deseja desconectar o Google Calendar?')) {
      disconnectGoogleMutation.mutate();
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {/* Google Calendar Integration */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Google Calendar
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sincronize seus agendamentos com o Google Calendar
                  </p>
                </div>
              </div>
              {isLoadingToken ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : googleToken ? (
                <button
                  onClick={handleGoogleDisconnect}
                  disabled={disconnectGoogleMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {disconnectGoogleMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={handleGoogleConnect}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isConnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Conectar
                </button>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Bell className="w-8 h-8 text-yellow-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Notificações
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure suas preferências de notificação
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Configurar
              </button>
            </div>
          </div>

          {/* WhatsApp Settings */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Smartphone className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    WhatsApp
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gerencie suas configurações do WhatsApp
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Configurar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;