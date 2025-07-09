import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL'); // ✅ ADICIONADO: Webhook do N8N
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};
// ✅ FUNÇÃO CORRIGIDA: Buscar JID da instância usando fetchInstances (formato real da API)
async function fetchInstanceJid(instanceName) {
  try {
    console.log(`Fetching JID for instance: ${instanceName}`);
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
    console.log('FetchInstances response:', JSON.stringify(data, null, 2));
    // ✅ CORREÇÃO: A resposta é um array direto com objetos de instâncias
    if (Array.isArray(data)) {
      const targetInstance = data.find((instance)=>instance.name === instanceName);
      if (targetInstance) {
        // ✅ CORREÇÃO: O JID está no campo "ownerJid"
        if (targetInstance.ownerJid) {
          console.log(`JID found for ${instanceName}: ${targetInstance.ownerJid}`);
          console.log(`Connection status: ${targetInstance.connectionStatus}`);
          return targetInstance.ownerJid;
        }
        // Se não tem ownerJid, significa que não está conectado ainda
        console.log(`Instance ${instanceName} found but no JID available`);
        console.log(`Connection status: ${targetInstance.connectionStatus}`);
        return null;
      }
    }
    console.log(`Instance ${instanceName} not found in fetchInstances response`);
    return null;
  } catch (error) {
    console.error('Error fetching instance JID:', error);
    return null;
  }
}
async function checkInstanceStatus(instanceName) {
  try {
    console.log(`Checking status for instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Instance not found');
      }
      throw new Error('Failed to check instance status');
    }
    const data = await response.json();
    const status = data.instance?.state === 'open' ? 'connected' : 'disconnected';
    console.log(`Instance ${instanceName} status: ${status}`);
    return status;
  } catch (error) {
    console.error('Error checking instance status:', error);
    throw error;
  }
}
async function refreshQrCode(instanceName) {
  try {
    console.log(`Attempting to refresh QR code for instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to refresh QR code for ${instanceName}:`, errorText);
      throw new Error('Failed to refresh QR code');
    }
    const data = await response.json();
    console.log('Refresh QR code response:', JSON.stringify(data, null, 2));
    // Verificar múltiplos formatos possíveis do QR code
    let qrCode = null;
    if (data.qrcode && data.qrcode.base64) {
      qrCode = data.qrcode.base64;
    } else if (data.qrcode && typeof data.qrcode === 'string') {
      qrCode = data.qrcode;
    } else if (data.base64) {
      qrCode = data.base64;
    } else if (data.qr && data.qr.base64) {
      qrCode = data.qr.base64;
    }
    console.log('QR Code extracted:', qrCode ? 'success' : 'null');
    return qrCode;
  } catch (error) {
    console.error('Error refreshing QR code:', error);
    throw error;
  }
}
async function createEvolutionInstance(userId, userEmail) {
  try {
    // ✅ CORREÇÃO: Usar apenas o nome do usuário sem caracteres especiais
    const instanceName = `tssaas-${userEmail}`;
    console.log(`Creating Evolution instance: ${instanceName}`);
    console.log(`Evolution API URL: ${evolutionApiUrl}`);
    console.log(`Evolution API Key: ${evolutionApiKey ? 'SET' : 'NOT SET'}`);
    console.log(`N8N Webhook URL: ${n8nWebhookUrl ? 'SET' : 'NOT SET'}`);
    // ✅ ATUALIZADO: Payload com webhook N8N configurado
    const payload = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      groupsIgnore: true,
      // ✅ ADICIONADO: Configuração do webhook para N8N
      webhook: {
        url: n8nWebhookUrl,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE'
        ],
        byEvents: false,
        base64: true,
        headers: {
          "autorization": `Bearer ${evolutionApiKey}`,
          "Content-Type": "application/json"
        }
      }
    };
    console.log('Create payload:', JSON.stringify(payload, null, 2));
    const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify(payload)
    });
    console.log(`Create response status: ${createResponse.status}`);
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Evolution API create error response:', errorText);
      // ✅ ADICIONADO: Detalhes específicos do erro
      let errorMessage = 'Failed to create Evolution instance';
      if (createResponse.status === 401) {
        errorMessage = 'Invalid API key for Evolution API';
      } else if (createResponse.status === 404) {
        errorMessage = 'Evolution API endpoint not found';
      } else if (createResponse.status === 409) {
        errorMessage = 'Instance already exists';
      } else if (createResponse.status >= 500) {
        errorMessage = 'Evolution API server error';
      }
      throw new Error(`${errorMessage} (Status: ${createResponse.status})`);
    }
    const createData = await createResponse.json();
    console.log('Evolution API create success response:', JSON.stringify(createData, null, 2));
    // Extrair QR code da resposta
    let qrCode = null;
    if (createData.qrcode && createData.qrcode.base64) {
      qrCode = createData.qrcode.base64;
      console.log('QR Code obtained from create response');
    } else if (createData.qrcode && typeof createData.qrcode === 'string') {
      qrCode = createData.qrcode;
      console.log('QR Code obtained from create response (string format)');
    } else if (createData.base64) {
      qrCode = createData.base64;
      console.log('QR Code obtained from base64 field');
    } else if (createData.qr && createData.qr.base64) {
      qrCode = createData.qr.base64;
      console.log('QR Code obtained from qr.base64 field');
    } else {
      console.log('QR Code not in create response, trying to fetch after delay...');
      // Aguardar um pouco para a instância ficar pronta
      await new Promise((resolve)=>setTimeout(resolve, 3000));
      try {
        qrCode = await refreshQrCode(instanceName);
        console.log('QR Code obtained from refresh:', qrCode ? 'success' : 'null');
      } catch (refreshError) {
        console.error('Failed to refresh QR code after creation:', refreshError);
      // Não falhar a criação por causa do QR code
      }
    }
    console.log('Inserting instance into database...');
    const { error: insertError } = await supabase.from('evolution_instances').insert([
      {
        user_id: userId,
        instance_name: instanceName,
        qr_code: qrCode,
        status: 'created'
      }
    ]);
    if (insertError) {
      console.error('Database insertion error:', insertError);
      throw new Error('Failed to store instance information');
    }
    console.log('Instance created successfully with N8N webhook configured');
    console.log(`Webhook URL: ${n8nWebhookUrl}`);
    console.log('Webhook events: messages.upsert');
    console.log('Webhook base64: enabled');
    return {
      success: true,
      instanceName,
      qrCode
    };
  } catch (error) {
    console.error('Error creating Evolution instance:', error);
    throw error;
  }
}
async function deleteEvolutionInstance(instanceName) {
  try {
    console.log(`Deleting Evolution instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to delete instance ${instanceName}:`, errorText);
      throw new Error('Failed to delete Evolution instance');
    }
    console.log(`Instance ${instanceName} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting Evolution instance:', error);
    throw error;
  }
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }
    console.log(`Request from user: ${user.email}`);
    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { data: existingInstance } = await supabase.from('evolution_instances').select('*').eq('user_id', user.id).single();
      if (!existingInstance) {
        throw new Error('No instance found');
      }
      await deleteEvolutionInstance(existingInstance.instance_name);
      const { error: deleteError } = await supabase.from('evolution_instances').delete().eq('user_id', user.id);
      if (deleteError) {
        throw new Error('Failed to delete instance record');
      }
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Handle POST request (create or refresh)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('POST request body:', JSON.stringify(body, null, 2));
      if (body.type === 'create') {
        // Create new instance
        const result = await createEvolutionInstance(user.id, user.email);
        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      if (body.type === 'refresh') {
        // Refresh QR code for existing instance
        const { data: existingInstance } = await supabase.from('evolution_instances').select('*').eq('user_id', user.id).single();
        if (!existingInstance) {
          throw new Error('No instance found');
        }
        const qrCode = await refreshQrCode(existingInstance.instance_name);
        const { error: updateError } = await supabase.from('evolution_instances').update({
          qr_code: qrCode
        }).eq('id', existingInstance.id);
        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error('Failed to update QR code');
        }
        return new Response(JSON.stringify({
          ...existingInstance,
          qr_code: qrCode
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Handle GET request (check status and update)
    const { data: existingInstance } = await supabase.from('evolution_instances').select('*').eq('user_id', user.id).single();
    if (existingInstance) {
      try {
        const currentStatus = await checkInstanceStatus(existingInstance.instance_name);
        const updateData = {
          status: currentStatus
        };
        
        // ✅ REMOVIDO: Linhas que atualizavam JID automaticamente
        // JID será atualizado APENAS via webhook quando QR for escaneado
        
        // If disconnected and no QR code, try to get one
        if (currentStatus === 'disconnected' && !existingInstance.qr_code) {
          try {
            const qrCode = await refreshQrCode(existingInstance.instance_name);
            if (qrCode) {
              updateData.qr_code = qrCode;
            }
          } catch (qrError) {
            console.error('Failed to refresh QR code in GET request:', qrError);
          // Não falhar por causa do QR code
          }
        }
        // Always update status in database if it changed or if we have new data
        if (currentStatus !== existingInstance.status || updateData.qr_code) {
          const { error: updateError } = await supabase.from('evolution_instances').update(updateData).eq('id', existingInstance.id);
          if (updateError) {
            console.error('Database update error:', updateError);
          }
        }
        return new Response(JSON.stringify({
          ...existingInstance,
          ...updateData
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Instance not found') {
          // If instance doesn't exist in Evolution API but exists in our database,
          // delete the database record and return 404
          const { error: deleteError } = await supabase.from('evolution_instances').delete().eq('user_id', user.id);
          if (deleteError) {
            console.error('Database deletion error:', deleteError);
          }
          return new Response(JSON.stringify({
            error: 'Instance not found'
          }), {
            status: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        // For other errors, return the existing instance data
        console.error('Error in GET request:', error);
        return new Response(JSON.stringify(existingInstance), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    return new Response(JSON.stringify({
      message: 'No instance found'
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in main handler:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: error instanceof Error && error.message === 'Instance not found' ? 404 : 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});