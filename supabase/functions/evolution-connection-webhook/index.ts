
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ✅ Função para buscar JID (reutilizada do evolution-api)
async function fetchInstanceJid(instanceName: string) {
  try {
    console.log(`[CONNECTION WEBHOOK] Fetching JID for instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      headers: {
        'apikey': evolutionApiKey
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch instances: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      const targetInstance = data.find((instance: any) => instance.name === instanceName);
      if (targetInstance?.ownerJid) {
        console.log(`[CONNECTION WEBHOOK] JID found: ${targetInstance.ownerJid}`);
        return targetInstance.ownerJid;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[CONNECTION WEBHOOK] Error fetching JID:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Apenas método POST é permitido');
    }

    const webhookData = await req.json();
    console.log('[CONNECTION WEBHOOK] Recebido:', JSON.stringify(webhookData, null, 2));

    // ✅ Verificar se é evento de conexão
    const eventType = webhookData.event;
    const instanceName = webhookData.instance;
    const connectionState = webhookData.data?.state;

    if (eventType !== 'CONNECTION_UPDATE' || !instanceName) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Evento ignorado - não é CONNECTION_UPDATE' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[CONNECTION WEBHOOK] Instance ${instanceName} mudou para: ${connectionState}`);

    // ✅ BUSCAR E ATUALIZAR JID QUANDO CONECTAR
    if (connectionState === 'open') {
      console.log(`[CONNECTION WEBHOOK] Instance ${instanceName} conectada! Buscando JID...`);
      
      // Aguardar um momento para garantir que o JID está disponível
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const jid = await fetchInstanceJid(instanceName);
      
      if (jid) {
        // ✅ Atualizar JID no banco de dados
        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({ 
            jid: jid,
            status: 'connected',
            updated_at: new Date().toISOString()
          })
          .eq('instance_name', instanceName);

        if (updateError) {
          console.error('[CONNECTION WEBHOOK] Erro ao atualizar JID:', updateError);
        } else {
          console.log(`[CONNECTION WEBHOOK] ✅ JID atualizado automaticamente: ${jid}`);
        }
      }
    }

    // ✅ Atualizar status de desconexão
    if (connectionState === 'close') {
      const { error: updateError } = await supabase
        .from('evolution_instances')
        .update({ 
          status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('instance_name', instanceName);

      if (updateError) {
        console.error('[CONNECTION WEBHOOK] Erro ao atualizar status:', updateError);
      } else {
        console.log(`[CONNECTION WEBHOOK] Status atualizado para disconnected`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook de conexão processado com sucesso',
      instance: instanceName,
      state: connectionState
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[CONNECTION WEBHOOK] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// ✅ ATUALIZAÇÃO: Configurar URL do webhook no createEvolutionInstance
// Substituir a URL do webhook para usar o novo endpoint especializado

const connectionWebhookUrl = `${supabaseUrl}/functions/v1/evolution-connection-webhook`;

const payload = {
  instanceName,
  qrcode: true,
  integration: 'WHATSAPP-BAILEYS',
  webhook: {
    url: connectionWebhookUrl,  // ✅ Usar webhook especializado
    events: [
      'MESSAGES_UPSERT',
      'CONNECTION_UPDATE'  // ✅ Capturar eventos de conexão
    ],
    byEvents: false, 
    base64: true,
    headers: {
      "authorization": `Bearer ${evolutionApiKey}`,
      "Content-Type": "application/json"
    }
  }
};