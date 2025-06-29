// Copie EXATAMENTE este código:
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    if (req.method !== 'POST') {
      throw new Error('Apenas método POST é permitido');
    }

    const webhookData = await req.json();
    console.log('Webhook recebido:', JSON.stringify(webhookData, null, 2));

    // Verificar se é uma mensagem
    if (!webhookData.data || !webhookData.data.messages) {
      return new Response(JSON.stringify({ success: true, message: 'Evento ignorado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const message = webhookData.data.messages[0];
    if (!message || message.fromMe) {
      return new Response(JSON.stringify({ success: true, message: 'Mensagem própria ignorada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Extrair dados da mensagem
    const instanceName = webhookData.instance;
    const fromNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text || 
                       '';

    console.log(`Mensagem de ${fromNumber}: ${messageText}`);

    // Buscar usuário pela instância do WhatsApp
    const { data: evolutionInstance, error: instanceError } = await supabase
      .from('evolution_instances')
      .select('user_id, users!evolution_instances_user_id_fkey(email)')
      .eq('instance_name', instanceName)
      .single();

    if (instanceError || !evolutionInstance) {
      console.error('Instância não encontrada:', instanceName);
      return new Response(JSON.stringify({ success: false, error: 'Instância não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Buscar API key do usuário
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', evolutionInstance.user_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (apiKeyError || !apiKey) {
      console.error('API key não encontrada para usuário:', evolutionInstance.user_id);
      return new Response(JSON.stringify({ success: false, error: 'API key não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Preparar dados para enviar ao n8n
    const n8nPayload = {
      message: {
        text: messageText,
        from: fromNumber,
        timestamp: message.messageTimestamp,
        instanceName: instanceName
      },
      user: {
        id: evolutionInstance.user_id,
        email: evolutionInstance.users.email
      },
      apiCredentials: {
        apiKey: apiKey.api_key,
        baseUrl: supabaseUrl,
        appointmentsEndpoint: `${supabaseUrl}/functions/v1/appointments-api`
      },
      webhook: {
        receivedAt: new Date().toISOString(),
        source: 'whatsapp-evolution'
      }
    };

    // Enviar para n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-WhatsApp-Webhook'
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!n8nResponse.ok) {
      throw new Error(`Erro ao enviar para n8n: ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log('Resposta do n8n:', n8nResult);

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processado e enviado para n8n',
      n8nResponse: n8nResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});