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
    console.log(`Checking status for instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      console.error(`Status check failed with status: ${response.status}`);
      throw new Error('Failed to check instance status');
    }

    const data = await response.json();
    console.log(`Instance status: ${data.state}`);
    return data.state || 'disconnected';
  } catch (error) {
    console.error('Error checking instance status:', error);
    return 'error';
  }
}

async function refreshQrCode(instanceName: string) {
  try {
    console.log(`Refreshing QR code for instance: ${instanceName}`);
    const response = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      console.error(`QR code refresh failed with status: ${response.status}`);
      throw new Error('Failed to refresh QR code');
    }

    const data = await response.json();
    console.log('QR code refreshed successfully');
    return data.base64;
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
      throw new Error('Failed to delete instance');
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
    console.log(`Creating instance for user: ${userEmail}`);
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
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        groups_ignore: true,
      }),
    });

    if (!createResponse.ok) {
      console.error(`Instance creation failed with status: ${createResponse.status}`);
      const errorText = await createResponse.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to create Evolution instance: ${errorText}`);
    }

    console.log('Instance created successfully');
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
      console.error('Database insertion error:', insertError);
      throw new Error('Failed to store instance information');
    }

    console.log('Instance information stored in database');
    return { instanceName, qrCode };
  } catch (error) {
    console.error('Error in createEvolutionInstance:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Handling ${req.method} request`);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication error:', authError);
      throw new Error('Invalid authorization');
    }

    // Handle DELETE request
    if (req.method === 'DELETE') {
      console.log('Processing DELETE request');
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
      console.log('Processing POST request');
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
            console.error('Database deletion error:', deleteError);
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
        console.log('Processing refresh request');
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
          console.error('Database update error:', updateError);
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
    console.log('Processing GET request');
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
          console.error('Database update error:', updateError);
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
    console.error('Request handling error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});