// Arquivo: supabase/functions/api-keys/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização necessário');
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    if (req.method === 'GET') {
      // Listar API keys do usuário
      const { data: apiKeys, error } = await supabase
        .from('user_api_keys')
        .select('id, name, api_key, is_active, created_at, last_used_at, usage_count')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Erro ao buscar API keys: ${error.message}`);

      return new Response(JSON.stringify({
        success: true,
        data: apiKeys
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (req.method === 'POST') {
      // Criar nova API key
      const { name = 'WhatsApp Integration' } = await req.json();

      // 🔥 CORRIGIDO: Verificar se já existe API key ativa
      const { data: existingKeys, error: checkError } = await supabase
        .from('user_api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (checkError) throw new Error('Erro ao verificar API keys existentes');

      if (existingKeys && existingKeys.length > 0) {
        // Desativar API keys existentes
        await supabase
          .from('user_api_keys')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      // Gerar API key única
      const { data: apiKeyResult, error: keyError } = await supabase
        .rpc('generate_api_key');

      if (keyError) throw new Error('Erro ao gerar API key');

      // Salvar no banco
      const { data: newApiKey, error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          api_key: apiKeyResult,
          name: name,
          is_active: true
        })
        .select('*')
        .single();

      if (error) throw new Error(`Erro ao criar API key: ${error.message}`);

      return new Response(JSON.stringify({
        success: true,
        data: newApiKey,
        message: 'API key criada com sucesso (keys anteriores foram desativadas)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    if (req.method === 'DELETE') {
      // Deletar API key
      const url = new URL(req.url);
      const apiKeyId = url.searchParams.get('id');

      if (!apiKeyId) {
        throw new Error('ID da API key é obrigatório');
      }

      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', apiKeyId)
        .eq('user_id', user.id);

      if (error) throw new Error(`Erro ao deletar API key: ${error.message}`);

      return new Response(JSON.stringify({
        success: true,
        message: 'API key deletada com sucesso'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Método não permitido');

  } catch (error) {
    console.error('Erro no endpoint de API keys:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});