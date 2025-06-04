import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const evolutionApiUrl = 'https://evapi.armtexapi.org';
const evolutionApiKey = 'f466697bcf9be76a260709b1fba28464';

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
      throw new Error('Failed to check instance status');
    }

    const data = await response.json();
    return data.state || 'disconnected';
  } catch (error) {
    console.error('Error checking instance status:', error);
    return 'error';
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
      throw new Error('Failed to refresh QR code');
    }

    const data = await response.json();
    return data.base64;
  } catch (error) {
    console.error('Error refreshing QR code:', error);
    return null;
  }
}

async function deleteInstance(instanceName: string) {
  try {
    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete instance');
    }

    return true;
  } catch (error) {
    console.error('Error deleting instance:', error);
    return false;
  }
}

async function createEvolutionInstance(userId: string, userEmail: string) {
  try {
    const timestamp = new Date().getTime();
    const instanceName = `tssaas-${userEmail.split('@')[0]}-${timestamp}`;
    
    const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        number: '5511999999999',
        token: evolutionApiKey,
      }),
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create Evolution instance');
    }

    const qrCode = await refreshQrCode(instanceName);

    const { error: insertError } = await supabase
      .from('evolution_instances')
      .insert([{
        user_id: userId,
        instance_name: instanceName,
        qr_code: qrCode,
        status: 'created',
      }]);

    if (insertError) {
      throw new Error('Failed to store instance information');
    }

    return { instanceName, qrCode };
  } catch (error) {
    console.error('Error creating Evolution instance:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

      if (existingInstance) {
        await deleteInstance(existingInstance.instance_name);
        
        const { error: deleteError } = await supabase
          .from('evolution_instances')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          throw new Error('Failed to delete instance record');
        }
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
      const body = await req.json();
      const { type } = body;

      if (!type) {
        throw new Error('Missing type parameter');
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
            throw new Error('Failed to delete existing instance');
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
        const { data: existingInstance } = await supabase
          .from('evolution_instances')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!existingInstance) {
          throw new Error('No instance found');
        }

        const qrCode = await refreshQrCode(existingInstance.instance_name);
        const status = await checkInstanceStatus(existingInstance.instance_name);

        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({
            qr_code: qrCode,
            status,
          })
          .eq('id', existingInstance.id);

        if (updateError) {
          throw new Error('Failed to update instance');
        }

        return new Response(
          JSON.stringify({ ...existingInstance, qr_code: qrCode, status }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error('Invalid type parameter');
    }

    // Handle GET request
    const { data: existingInstance } = await supabase
      .from('evolution_instances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingInstance) {
      const status = await checkInstanceStatus(existingInstance.instance_name);
      
      if (status !== existingInstance.status) {
        const { error: updateError } = await supabase
          .from('evolution_instances')
          .update({ status })
          .eq('id', existingInstance.id);

        if (updateError) {
          throw new Error('Failed to update instance status');
        }
      }

      return new Response(
        JSON.stringify({ ...existingInstance, status }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify(null),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});