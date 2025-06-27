import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * Função para gerar API Key a partir do JID do WhatsApp
 * 
 * @param {string} jid - JID do WhatsApp (ex: 5511999999999@s.whatsapp.net)
 * @returns {object} - Objeto com success, apiKey e informações do usuário
 */
async function generateApiKeyFromJid(jid) {
  try {
    console.log(`🔍 Buscando usuário pelo JID: ${jid}`);

    // 1. Buscar usuário pela evolution instance com o JID
    const { data: evolutionInstance, error: instanceError } = await supabase
      .from('evolution_instances')
      .select(`
        user_id,
        instance_name,
        jid,
        status
      `)
      .eq('jid', jid)
      .single();

    if (instanceError || !evolutionInstance) {
      console.error('❌ Instância não encontrada para JID:', jid);
      throw new Error(`Usuário não encontrado para o JID: ${jid}`);
    }

    console.log(`✅ Instância encontrada: ${evolutionInstance.instance_name} (User: ${evolutionInstance.user_id})`);

    // 2. Verificar se já existe API key ativa para o usuário
    const { data: existingApiKey, error: existingError } = await supabase
      .from('user_api_keys')
      .select('api_key, name, created_at, usage_count')
      .eq('user_id', evolutionInstance.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Se já existe API key ativa, retornar ela
    if (existingApiKey && !existingError) {
      console.log(`✅ API key existente encontrada para usuário: ${evolutionInstance.user_id}`);
      
      // Atualizar estatísticas de uso
      await supabase
        .from('user_api_keys')
        .update({ 
          last_used_at: new Date().toISOString(),
          usage_count: existingApiKey.usage_count + 1
        })
        .eq('api_key', existingApiKey.api_key);

      return {
        success: true,
        apiKey: existingApiKey.api_key,
        isNew: false,
        user: {
          id: evolutionInstance.user_id,
          instance_name: evolutionInstance.instance_name,
          jid: evolutionInstance.jid,
          status: evolutionInstance.status
        },
        apiKeyInfo: {
          name: existingApiKey.name,
          created_at: existingApiKey.created_at,
          usage_count: existingApiKey.usage_count + 1
        },
        endpoints: {
          appointments: `${supabaseUrl}/functions/v1/appointments-api`,
          usage: {
            list: 'GET with X-API-Key header and ?action=list',
            create: 'POST with X-API-Key header and action=create',
            update: 'PUT with X-API-Key header and action=update',
            delete: 'DELETE with X-API-Key header and action=delete'
          }
        }
      };
    }

    // 3. Desativar todas as API keys existentes do usuário (caso existam inativas)
    await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('user_id', evolutionInstance.user_id)
      .eq('is_active', true);

    // 4. Gerar nova API key
    const { data: newApiKeyValue, error: keyGenerationError } = await supabase
      .rpc('generate_api_key');

    if (keyGenerationError) {
      console.error('❌ Erro ao gerar API key:', keyGenerationError);
      throw new Error('Erro ao gerar nova API key');
    }

    console.log(`🔑 Nova API key gerada para usuário: ${evolutionInstance.user_id}`);

    // 5. Salvar nova API key no banco
    const { data: savedApiKey, error: saveError } = await supabase
      .from('user_api_keys')
      .insert({
        user_id: evolutionInstance.user_id,
        api_key: newApiKeyValue,
        name: `WhatsApp Integration - ${jid}`,
        is_active: true,
        usage_count: 1,
        last_used_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (saveError) {
      console.error('❌ Erro ao salvar API key:', saveError);
      throw new Error('Erro ao salvar API key no banco de dados');
    }

    console.log(`✅ API key criada e salva com sucesso: ${savedApiKey.id}`);

    return {
      success: true,
      apiKey: savedApiKey.api_key,
      isNew: true,
      user: {
        id: evolutionInstance.user_id,
        instance_name: evolutionInstance.instance_name,
        jid: evolutionInstance.jid,
        status: evolutionInstance.status
      },
      apiKeyInfo: {
        name: savedApiKey.name,
        created_at: savedApiKey.created_at,
        usage_count: savedApiKey.usage_count
      },
      endpoints: {
        appointments: `${supabaseUrl}/functions/v1/appointments-api`,
        usage: {
          list: 'GET with X-API-Key header and ?action=list',
          create: 'POST with X-API-Key header and action=create',
          update: 'PUT with X-API-Key header and action=update',
          delete: 'DELETE with X-API-Key header and action=delete'
        }
      }
    };

  } catch (error) {
    console.error('❌ Erro na função generateApiKeyFromJid:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`📥 ${req.method} request to JID-to-API-Key endpoint`);

    if (req.method === 'POST') {
      const { jid } = await req.json();

      if (!jid) {
        throw new Error('JID é obrigatório no body da requisição');
      }

      // Validar formato do JID
      if (!jid.includes('@s.whatsapp.net') && !jid.includes('@c.us')) {
        throw new Error('Formato de JID inválido. Deve ser no formato: numero@s.whatsapp.net');
      }

      console.log(`🔄 Processando JID: ${jid}`);

      const result = await generateApiKeyFromJid(jid);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (req.method === 'GET') {
      // Endpoint para obter JID da query string
      const url = new URL(req.url);
      const jid = url.searchParams.get('jid');

      if (!jid) {
        throw new Error('Parâmetro JID é obrigatório na query string (?jid=numero@s.whatsapp.net)');
      }

      console.log(`🔄 Processando JID via GET: ${jid}`);

      const result = await generateApiKeyFromJid(jid);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error('Método não permitido. Use POST ou GET.');

  } catch (error) {
    console.error('❌ Erro no endpoint JID-to-API-Key:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});