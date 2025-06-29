import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh token: ${errorData.error_description || errorData.error}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function syncAppointmentToGoogle(
  appointment: any,
  accessToken: string,
  operation: 'create' | 'update' | 'delete'
) {
  // Validação para operações que requerem google_event_id
  if ((operation === 'update' || operation === 'delete') && !appointment.google_event_id) {
    throw new Error(`Google event ID is required for ${operation} operation`);
  }

  // Para operações de delete, só precisamos do ID
  if (operation === 'delete') {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      throw new Error(`Failed to delete event: ${errorData?.error?.message || 'Unknown error'}`);
    }

    return null;
  }

  // Calcular horários para create/update
  const startDateTime = `${appointment.date}T${appointment.time}:00`;
  const startDate = new Date(`${appointment.date}T${appointment.time}`);
  
  // Verificar se service_details existe e tem duration
  if (!appointment.service_details || !appointment.service_details.duration) {
    throw new Error('Service details with duration are required');
  }

  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + parseInt(appointment.service_details.duration));
  
  const endDateTime = endDate.toISOString().substring(0, 19);

  const eventData = {
    summary: `${appointment.client?.name || 'Cliente'} - ${appointment.service_details.name}`,
    description: `Agendamento via Agenda Pro\n\nCliente: ${appointment.client?.name || 'Nome não informado'}\nServiço: ${appointment.service_details.name}\nDuração: ${appointment.service_details.duration} minutos\nPreço: R$ ${appointment.price || '0,00'}`,
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Sao_Paulo',
    },
  };

  const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  let response;

  switch (operation) {
    case 'create':
      response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData),
      });
      break;

    case 'update':
      response = await fetch(`${baseUrl}/${appointment.google_event_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(eventData),
      });
      break;
  }

  if (!response?.ok) {
    const errorData = await response?.json();
    
    // Se for erro 404 no update, tentar recriar o evento
    if (operation === 'update' && response?.status === 404) {
      console.log('Event not found on Google Calendar, creating new one...');
      
      // Criar novo evento
      const createResponse = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData),
      });

      if (!createResponse.ok) {
        const createErrorData = await createResponse.json();
        throw new Error(`Failed to recreate event: ${createErrorData?.error?.message || 'Unknown error'}`);
      }

      return createResponse.json();
    }

    throw new Error(`Failed to ${operation} event in Google Calendar: ${errorData?.error?.message || 'Unknown error'}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointment, operation } = await req.json();
    
    // Validação básica
    if (!appointment || !operation) {
      throw new Error('Missing appointment or operation parameter');
    }

    if (!['create', 'update', 'delete'].includes(operation)) {
      throw new Error('Invalid operation. Must be create, update, or delete');
    }

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

    // Get user's Google token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Google Calendar not connected');
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    if (new Date(tokenData.expires_at) <= new Date()) {
      console.log('Token expired, refreshing...');
      
      const { accessToken: newToken, expiresIn } = await refreshGoogleToken(
        tokenData.refresh_token
      );
      
      accessToken = newToken;
      
      // Update token in database
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      const { error: updateError } = await supabase
        .from('user_google_tokens')
        .update({
          access_token: newToken,
          expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update token:', updateError);
        throw new Error('Failed to update token');
      }
    }

    // Sync with Google Calendar
    const result = await syncAppointmentToGoogle(
      appointment,
      accessToken,
      operation
    );

    // Update appointment with Google event ID if created or recreated
    if ((operation === 'create' || (operation === 'update' && result?.id)) && result?.id) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          google_event_id: result.id,
          is_synced_to_google: true,
        })
        .eq('id', appointment.id);

      if (updateError) {
        console.error('Failed to update appointment with Google event ID:', updateError);
        throw new Error('Failed to update appointment with Google event ID');
      }
    }

    // Se for delete, marcar como não sincronizado
    if (operation === 'delete') {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          google_event_id: null,
          is_synced_to_google: false,
        })
        .eq('id', appointment.id);

      if (updateError) {
        console.error('Failed to update appointment sync status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});