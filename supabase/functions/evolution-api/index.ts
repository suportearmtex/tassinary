import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

async function checkInstanceStatus(instanceName: string) {
  try {
    const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Instance not found');
      }
      throw new Error('Failed to check instance status');
    }

    const data = await response.json();
    return data.instance?.state === 'open' ? 'connected' : 'disconnected';
  } catch (error) {
    console.error('Error checking instance status:', error);
    throw error;
  }
}

async function refreshQrCode(instanceName: string) {
  try {
    console.log(`Attempting to refresh QR code for instance: ${instanceName}`);

    const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to refresh QR code for ${instanceName}:`, errorText);
      throw new Error('Failed to refresh QR code');
    }

    const data = await response.json();
    console.log('Refresh QR code response:', data);

    // ✅ CORREÇÃO: Verificar múltiplos formatos possíveis do QR code
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
    return null;
  }
}

async function createEvolutionInstance(userId: string, userEmail: string) {
  try {
    const instanceName = `tssaas-${userEmail}`;

    const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        token: evolutionApiKey,
        webhook: {
          url: `${supabaseUrl}/functions/v1/whatsapp-webhook`,
          events: ['messages.upsert'],
          webhook_by_events: true
        }
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Evolution API create error:', errorText);
      throw new Error('Failed to create Evolution instance');
    }

    const createData = await createResponse.json();
    console.log('Evolution API create response:', createData);

    // ✅ CORREÇÃO: Tentar usar o QR code da resposta de criação primeiro
    let qrCode = null;

    // Opção 1: QR code diretamente da resposta de criação
    if (createData.qrcode && createData.qrcode.base64) {
      qrCode = createData.qrcode.base64;
      console.log('QR Code obtained from create response');
    }
    // Opção 2: QR code em formato alternativo
    else if (createData.qrcode && typeof createData.qrcode === 'string') {
      qrCode = createData.qrcode;
      console.log('QR Code obtained from create response (string format)');
    }
    // Opção 3: Buscar QR code com delay após criação
    else {
      console.log('QR Code not in create response, trying to fetch after delay...');

      // Aguardar um pouco para a instância ficar pronta
      await new Promise(resolve => setTimeout(resolve, 2000));

      qrCode = await refreshQrCode(instanceName);
      console.log('QR Code obtained from refresh:', qrCode ? 'success' : 'null');
    }

    const { error: insertError } = await supabase
      .from('evolution_instances')
      .insert([{
        user_id: userId,  // ✅ Corrigido
        instance_name: instanceName,
        qr_code: qrCode,
        status: 'created',
      }]);

    if (insertError) {
      console.error('Database insertion error:', insertError);
      throw new Error('Failed to store instance information');
    }

    return { success: true, instanceName, qrCode };
  } catch (error) {
    console.error('Error creating Evolution instance:', error);
    throw error;
  }
}

async function deleteEvolutionInstance(instanceName: string) {
  try {
    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete Evolution instance');
    }

    return true;
  } catch (error) {
    console.error('Error deleting Evolution instance:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      const { data: existingInstance } = await supabase
        .from('evolution_instances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!existingInstance) {
        throw new Error('No instance found');
      }

      await deleteEvolutionInstance(existingInstance.instance_name);

      const { error: deleteError } = await supabase
        .from('evolution_instances')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error('Failed to delete instance record');
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle POST request (create or refresh)
    if (req.method === 'POST') {
      const body = await req.json();

      if (body.type === 'create') {
        // Create new instance
        const result = await createEvolutionInstance(user.id, user.email!);

        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (body.type === 'refresh') {
        // Refresh QR code for existing instance
        const { data: existingInstance } = await supabase
          .from('evolution_instances')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!existingInstance) {
          throw new Error('No instance found');
        }

        const qrCode = await refreshQrCode(existingInstance.instance_name);

        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({
            qr_code: qrCode,
          })
          .eq('id', existingInstance.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error('Failed to update QR code');
        }

        return new Response(
          JSON.stringify({ ...existingInstance, qr_code: qrCode }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Handle GET request (check status and update)
    const { data: existingInstance } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingInstance) {
      try {
        const currentStatus = await checkInstanceStatus(existingInstance.instance_name);

        const updateData: any = {
          status: currentStatus,
        };

        // If disconnected and no QR code, try to get one
        if (currentStatus === 'disconnected' && !existingInstance.qr_code) {
          const qrCode = await refreshQrCode(existingInstance.instance_name);
          if (qrCode) {
            updateData.qr_code = qrCode;
          }
        }

        // Always update status in database if it changed
        if (currentStatus !== existingInstance.status || updateData.qr_code) {
          const { error: updateError } = await supabase
            .from('evolution_instances')
            .update(updateData)
            .eq('id', existingInstance.id);

          if (updateError) {
            console.error('Database update error:', updateError);
          }
        }

        return new Response(
          JSON.stringify({ ...existingInstance, ...updateData }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      } catch (error) {
        if (error instanceof Error && error.message === 'Instance not found') {
          // If instance doesn't exist in Evolution API but exists in our database,
          // delete the database record and return 404
          const { error: deleteError } = await supabase
            .from('evolution_instances')
            .delete()
            .eq('user_id', user.id);

          if (deleteError) {
            console.error('Database deletion error:', deleteError);
          }

          return new Response(
            JSON.stringify({ error: 'Instance not found' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // For other errors, return the existing instance data
        return new Response(
          JSON.stringify(existingInstance),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ message: 'No instance found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: error instanceof Error && error.message === 'Instance not found' ? 404 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});