const handleGoogleConnect = async () => {
  try {
    setIsConnecting(true);
    
    // Verificar se há uma sessão válida
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Erro ao obter sessão de autenticação');
    }
    
    if (!session) {
      throw new Error('Usuário não autenticado. Faça login novamente.');
    }

    if (!session.access_token) {
      throw new Error('Token de acesso não encontrado');
    }

    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-callback`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
    const state = session.access_token;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(import.meta.env.VITE_GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      authUrl,
      'google-oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    setIsConnecting(false);
    
    if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error('Erro desconhecido ao iniciar processo de conexão');
    }
  }
};