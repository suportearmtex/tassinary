// Arquivo: supabase/functions/admin-update-user/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cliente com privilégios administrativos
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autorização do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autorização necessária');
    }

    // Verificar se o usuário atual é admin usando o token normal
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se o usuário é admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'admin') {
      throw new Error('Acesso negado: apenas administradores podem executar esta ação');
    }

    const { userId, password, action } = await req.json();

    if (!userId || !action) {
      throw new Error('Parâmetros obrigatórios: userId e action');
    }

    if (action === 'update_password') {
      if (!password || password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      // Usar o cliente administrativo para atualizar a senha
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password
      });

      if (updateError) {
        throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Senha atualizada com sucesso' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'update_role') {
      const { role } = await req.json();
      
      if (!role || !['admin', 'professional', 'receptionist'].includes(role)) {
        throw new Error('Role inválido');
      }

      // Atualizar role na tabela users
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Erro ao atualizar role: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Role atualizado com sucesso' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Ação não reconhecida');

  } catch (error) {
    console.error('Erro na função admin-update-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});