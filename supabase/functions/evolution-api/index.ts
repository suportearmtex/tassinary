import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

// Check required environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Required environment variables SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

if (!evolutionApiKey) {
  throw new Error('Required environment variable EVOLUTION_API_KEY must be set');
}

const evolutionApiUrl = 'https://api.evolution-api.com/v1';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInstanceStatus(instanceName: string) {
  try {
    const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      console.error(`Status check failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to check instance status: ${errorText}`);
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
    const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      console.error(`QR code refresh failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to refresh QR code: ${errorText}`);
    }

    const data = await response.json();
    return data.qrcode?.base64 || null;
  } catch (error) {
    console.error('Error refreshing QR code:', error);
    return null;
  }
}

async function deleteInstance(instanceName: string) {
  try {
    console.log(`Deleting instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      console.error(`Instance deletion failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to delete instance: ${errorText}`);
    }

    console.log('Instance deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting instance:', error);
    return false;
  }
}

async function createEvolutionInstance(userId: string, userEmail: string) {
  try {
    const instanceName = `tssaas-${userEmail.split('@')[0]}`;
    
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
      }),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create Evolution instance');
    }

    const createData = await createResponse.json();
    console.log('Instance created successfully:', createData);

    // Wait a moment for the instance to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    const qrCode = await refreshQrCode(instanceName);
    if (!qrCode) {
      throw new Error('Failed to generate QR code for new instance');
    }

    const { error: insertError } = await supabase
      .from('evolution_instances')
      .insert([{
        user_id: userId,
        instance_name: instanceName,
        qr_code: qrCode,
        status: 'created',
      }]);

    if (insertError) {
      console.error('Database insertion error:', insertError);
      // Clean up the created instance if database insertion fails
      await deleteInstance(instanceName);
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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

    // Handle POST request
    if (req.method === 'POST') {
      console.log('Processing POST request');
      const body = await req.json();
      const { type } = body;

      if (!type) {
        return new Response(
          JSON.stringify({ error: 'Missing type parameter' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (type === 'create') {
        // Delete existing instance if any
        const { data: existingInstance } = await supabase
          .from('evolution_instances')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingInstance) {
          await deleteInstance(existingInstance.instance_name);
          
          const { error: deleteError } = await supabase
            .from('evolution_instances')
            .delete()
            .eq('user_id', user.id);

          if (deleteError) {
            console.error('Database deletion error:', deleteError);
          }
        }

        // Create new instance
        const result = await createEvolutionInstance(user.id, user.email!);
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (type === 'refresh') {
        console.log('Processing refresh request');
        const { data: existingInstance } = await supabase
          .from('evolution_instances')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!existingInstance) {
          return new Response(
            JSON.stringify({ error: 'No instance found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const qrCode = await refreshQrCode(existingInstance.instance_name);
        const status = await checkInstanceStatus(existingInstance.instance_name);

        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({
            status: status,
            qr_code: qrCode,
          })
          .eq('id', existingInstance.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error('Failed to update instance status');
        }

        return new Response(
          JSON.stringify({ ...existingInstance, status: status, qr_code: qrCode }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid type parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle GET request
    console.log('Processing GET request');
    const { data: existingInstance } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingInstance) {
      const currentStatus = await checkInstanceStatus(existingInstance.instance_name);
      let qrCode = existingInstance.qr_code;
      let needsUpdate = false;

      // If not connected and has QR code, check if we need to refresh
      if (currentStatus !== 'connected' && qrCode) {
        if (currentStatus === 'disconnected' || currentStatus === 'error') {
          qrCode = await refreshQrCode(existingInstance.instance_name);
          needsUpdate = true;
        }
      }

      // Update instance if status changed or QR code was refreshed
      if (currentStatus !== existingInstance.status || needsUpdate) {
        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({
            status: currentStatus,
            qr_code: qrCode,
          })
          .eq('id', existingInstance.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error('Failed to update instance status');
        }
      }

      return new Response(
        JSON.stringify({ ...existingInstance, status: currentStatus, qr_code: qrCode }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      {
        status: error.message.includes('environment variable') ? 500 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});