// supabase/functions/sync-all-appointments/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    // Buscar todos os agendamentos do usuário
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        service_details:services(*)
      `)
      .eq('user_id', user.id)
      .eq('is_synced_to_google', false);

    if (appointmentsError) {
      throw new Error(`Failed to fetch appointments: ${appointmentsError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0, 
          message: 'Nenhum agendamento para sincronizar' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const appointment of appointments) {
      try {
        // Chamar função de sincronização individual
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-google-calendar`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appointment,
            operation: 'create',
          }),
        });

        if (syncResponse.ok) {
          syncedCount++;
        } else {
          const errorData = await syncResponse.json();
          errors.push(`Agendamento ${appointment.id}: ${errorData.error}`);
        }
      } catch (error) {
        errors.push(`Agendamento ${appointment.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        total: appointments.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Sync all appointments error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});