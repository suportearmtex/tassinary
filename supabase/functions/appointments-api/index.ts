// Arquivo: supabase/functions/appointments-api/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Configurações padrão de horário
const DEFAULT_BUSINESS_HOURS = {
  monday: { start: '09:00', end: '18:00', enabled: true },
  tuesday: { start: '09:00', end: '18:00', enabled: true },
  wednesday: { start: '09:00', end: '18:00', enabled: true },
  thursday: { start: '09:00', end: '18:00', enabled: true },
  friday: { start: '09:00', end: '18:00', enabled: true },
  saturday: { start: '09:00', end: '14:00', enabled: false },
  sunday: { start: '09:00', end: '14:00', enabled: false }
};

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Função para verificar conflitos de horário
async function checkTimeConflict(userId: string, date: string, time: string, duration: number, excludeId?: string) {
  const startTime = new Date(`${date}T${time}`);
  const endTime = new Date(startTime.getTime() + duration * 60000);

  let query = supabase
    .from('appointments')
    .select('id, date, time, service_details:services(duration)')
    .eq('user_id', userId)
    .eq('date', date)
    .neq('status', 'cancelled');

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: existingAppointments, error } = await query;
  if (error) throw new Error('Erro ao verificar conflitos');

  for (const appointment of existingAppointments) {
    const existingStart = new Date(`${appointment.date}T${appointment.time}`);
    const existingDuration = appointment.service_details?.duration || 60;
    const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

    if (
      (startTime >= existingStart && startTime < existingEnd) ||
      (endTime > existingStart && endTime <= existingEnd) ||
      (startTime <= existingStart && endTime >= existingEnd)
    ) {
      return true;
    }
  }
  return false;
}

// Função para gerar slots de tempo
function generateTimeSlots(startTime: string, endTime: string, duration: number, interval: number = 30): string[] {
  const slots: string[] = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  let current = new Date(start);
  
  while (current.getTime() + (duration * 60000) <= end.getTime()) {
    const timeString = current.toTimeString().slice(0, 5);
    slots.push(timeString);
    current = new Date(current.getTime() + (interval * 60000));
  }
  
  return slots;
}

// Função para verificar se um slot está ocupado
function isSlotOccupied(slot: string, appointments: any[], duration: number): boolean {
  const slotStart = new Date(`2000-01-01T${slot}:00`);
  const slotEnd = new Date(slotStart.getTime() + (duration * 60000));

  return appointments.some(appointment => {
    const appointmentStart = new Date(`2000-01-01T${appointment.time}:00`);
    const appointmentDuration = parseInt(appointment.service_details?.duration || '60');
    const appointmentEnd = new Date(appointmentStart.getTime() + (appointmentDuration * 60000));

    return (
      (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
      (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
      (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
    );
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔐 AUTENTICAÇÃO HÍBRIDA: JWT ou API Key
    const authHeader = req.headers.get('Authorization');
    const apiKeyHeader = req.headers.get('X-API-Key');
    
    let user: any = null;

    console.log('Headers recebidos:', {
      hasAuth: !!authHeader,
      hasApiKey: !!apiKeyHeader,
      apiKeyPrefix: apiKeyHeader ? apiKeyHeader.substring(0, 10) + '...' : null
    });

    if (apiKeyHeader) {
      console.log('🔑 Tentando autenticar com API key:', apiKeyHeader.substring(0, 10) + '...');
      
      // Autenticação via API Key (para n8n) - VERSÃO SIMPLIFICADA
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('user_api_keys')
        .select('user_id, usage_count')
        .eq('api_key', apiKeyHeader)
        .eq('is_active', true)
        .single();

      console.log('Resultado da busca API key:', { 
        found: !!apiKeyData, 
        error: apiKeyError?.message,
        userId: apiKeyData?.user_id 
      });

      if (apiKeyError || !apiKeyData) {
        console.error('❌ API key não encontrada ou inativa:', apiKeyError);
        throw new Error('API Key inválida ou inativa');
      }

      // Buscar dados do usuário separadamente
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', apiKeyData.user_id)
        .single();

      if (userError || !userData) {
        console.log('ℹ️ Usuário não encontrado na tabela users, usando dados básicos');
        // Se não encontrar na tabela users, usar dados básicos
        user = {
          id: apiKeyData.user_id,
          email: `user-${apiKeyData.user_id}@system.local`
        };
      } else {
        user = userData;
      }

      // Atualizar estatísticas de uso
      try {
        await supabase
          .from('user_api_keys')
          .update({ 
            last_used_at: new Date().toISOString(),
            usage_count: apiKeyData.usage_count + 1
          })
          .eq('api_key', apiKeyHeader);
      } catch (updateError) {
        console.warn('⚠️ Erro ao atualizar estatísticas da API key:', updateError);
      }

      console.log('✅ Usuário autenticado via API key:', user.id);

    } else if (authHeader) {
      console.log('🎫 Tentando autenticar com JWT');
      
      // Autenticação via JWT (usuário normal)
      if (!authHeader.startsWith('Bearer ')) {
        throw new Error('Formato de token inválido. Use: Bearer <token>');
      }

      const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user: jwtUser }, error: authError } = await supabaseUser.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !jwtUser) {
        console.error('❌ Token JWT inválido:', authError);
        throw new Error('Token JWT inválido ou expirado');
      }

      user = jwtUser;
      console.log('✅ Usuário autenticado via JWT:', user.id);
      
    } else {
      console.error('❌ Nenhum método de autenticação fornecido');
      throw new Error('Autenticação necessária. Use Authorization: Bearer <token> ou X-API-Key: <api_key>');
    }

    // Pegar ação do header ou URL
    const url = new URL(req.url);
    const action = req.headers.get('x-action') || url.searchParams.get('action');

    console.log(`🎯 Executando ação: ${action} para usuário: ${user.id}`);

    // 🔥 ROTEAMENTO POR AÇÃO
    switch (action) {
      
      // ===============================================
      // 📅 CONSULTAR REUNIÕES
      // ===============================================
      case 'query':
      case 'list': {
        if (req.method === 'GET') {
          const days = parseInt(url.searchParams.get('days') || '30');
          const startDate = url.searchParams.get('start_date');
          const endDate = url.searchParams.get('end_date');
          const status = url.searchParams.get('status');

          let query = supabase
            .from('appointments')
            .select(`
              *,
              client:clients(*),
              service_details:services(*)
            `)
            .eq('user_id', user.id);

          if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
          } else {
            const today = new Date().toISOString().split('T')[0];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            query = query.gte('date', today).lte('date', futureDateStr);
          }

          if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
            query = query.eq('status', status);
          }

          query = query.order('date', { ascending: true }).order('time', { ascending: true });

          const { data: appointments, error } = await query;
          if (error) throw new Error(`Erro ao consultar agendamentos: ${error.message}`);

          console.log(`📋 Encontrados ${appointments.length} agendamentos`);

          return new Response(JSON.stringify({
            success: true,
            data: appointments,
            count: appointments.length,
            period: { days, startDate, endDate }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        if (req.method === 'POST') {
          const { filters } = await req.json();

          let query = supabase
            .from('appointments')
            .select(`
              *,
              client:clients(*),
              service_details:services(*)
            `)
            .eq('user_id', user.id);

          if (filters) {
            if (filters.client_name) {
              query = query.ilike('clients.name', `%${filters.client_name}%`);
            }
            if (filters.service_id) {
              query = query.eq('service_id', filters.service_id);
            }
            if (filters.date_from) {
              query = query.gte('date', filters.date_from);
            }
            if (filters.date_to) {
              query = query.lte('date', filters.date_to);
            }
            if (filters.status) {
              query = query.eq('status', filters.status);
            }
            if (filters.price_min) {
              query = query.gte('price', filters.price_min);
            }
            if (filters.price_max) {
              query = query.lte('price', filters.price_max);
            }
          }

          query = query.order('date', { ascending: true }).order('time', { ascending: true });

          const { data: appointments, error } = await query;
          if (error) throw new Error(`Erro ao consultar agendamentos: ${error.message}`);

          return new Response(JSON.stringify({
            success: true,
            data: appointments,
            count: appointments.length,
            filters
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        break;
      }

      // ===============================================
      // ✏️ MARCAR NOVA REUNIÃO
      // ===============================================
      case 'create':
      case 'book': {
        if (req.method !== 'POST') throw new Error('Método deve ser POST para criar agendamento');

        const { client_id, service_id, date, time, status = 'pending', price } = await req.json();

        if (!client_id || !service_id || !date || !time) {
          throw new Error('Campos obrigatórios: client_id, service_id, date, time');
        }

        // Verificar serviço
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', service_id)
          .eq('user_id', user.id)
          .single();

        if (serviceError || !service) {
          throw new Error('Serviço não encontrado ou não pertence ao usuário');
        }

        // Verificar cliente
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', client_id)
          .eq('user_id', user.id)
          .single();

        if (clientError || !client) {
          throw new Error('Cliente não encontrado ou não pertence ao usuário');
        }

        // Verificar conflitos
        const hasConflict = await checkTimeConflict(user.id, date, time, parseInt(service.duration));
        if (hasConflict) {
          throw new Error('Já existe um agendamento neste horário');
        }

        // Criar agendamento
        const appointmentData = {
          client_id,
          service_id,
          service: service.name,
          date,
          time,
          status,
          price: price || service.price || 0,
          user_id: user.id,
          is_synced_to_google: false
        };

        const { data: newAppointment, error } = await supabase
          .from('appointments')
          .insert(appointmentData)
          .select(`
            *,
            client:clients(*),
            service_details:services(*)
          `)
          .single();

        if (error) throw new Error(`Erro ao criar agendamento: ${error.message}`);

        return new Response(JSON.stringify({
          success: true,
          data: newAppointment,
          message: 'Agendamento criado com sucesso'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      // ===============================================
      // 🔄 REMARCAR REUNIÃO
      // ===============================================
      case 'update':
      case 'reschedule': {
        if (req.method !== 'PUT') throw new Error('Método deve ser PUT para remarcar agendamento');

        const { appointment_id, date, time, service_id, status, price } = await req.json();

        if (!appointment_id) {
          throw new Error('appointment_id é obrigatório');
        }

        // Verificar agendamento existente
        const { data: existingAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*, service_details:services(*)')
          .eq('id', appointment_id)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !existingAppointment) {
          throw new Error('Agendamento não encontrado');
        }

        const updateData: any = {};

        // Verificar conflitos se mudou data/hora
        if (date || time) {
          const newDate = date || existingAppointment.date;
          const newTime = time || existingAppointment.time;
          
          let duration = parseInt(existingAppointment.service_details?.duration || '60');
          
          if (service_id) {
            const { data: newService, error: serviceError } = await supabase
              .from('services')
              .select('*')
              .eq('id', service_id)
              .eq('user_id', user.id)
              .single();

            if (serviceError || !newService) {
              throw new Error('Novo serviço não encontrado');
            }

            duration = parseInt(newService.duration);
            updateData.service_id = service_id;
            updateData.service = newService.name;
            updateData.price = price !== undefined ? price : newService.price;
          }

          const hasConflict = await checkTimeConflict(user.id, newDate, newTime, duration, appointment_id);
          if (hasConflict) {
            throw new Error('Novo horário conflita com agendamento existente');
          }

          updateData.date = newDate;
          updateData.time = newTime;
        }

        if (status) updateData.status = status;
        if (price !== undefined) updateData.price = price;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', appointment_id)
          .eq('user_id', user.id)
          .select(`
            *,
            client:clients(*),
            service_details:services(*)
          `)
          .single();

        if (updateError) throw new Error(`Erro ao atualizar agendamento: ${updateError.message}`);

        return new Response(JSON.stringify({
          success: true,
          data: updatedAppointment,
          message: 'Agendamento atualizado com sucesso'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // ===============================================
      // ❌ CANCELAR/DELETAR REUNIÃO
      // ===============================================
      case 'cancel':
      case 'delete': {
        if (req.method !== 'DELETE') throw new Error('Método deve ser DELETE para cancelar/deletar agendamento');

        const appointmentId = url.searchParams.get('appointment_id');
        const deleteType = url.searchParams.get('type') || 'cancel'; // 'cancel' ou 'delete'

        if (!appointmentId) {
          throw new Error('appointment_id é obrigatório');
        }

        // Verificar agendamento existente
        const { data: existingAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !existingAppointment) {
          throw new Error('Agendamento não encontrado');
        }

        if (deleteType === 'delete') {
          // Deletar permanentemente
          const { error: deleteError } = await supabase
            .from('appointments')
            .delete()
            .eq('id', appointmentId)
            .eq('user_id', user.id);

          if (deleteError) throw new Error(`Erro ao deletar agendamento: ${deleteError.message}`);

          return new Response(JSON.stringify({
            success: true,
            message: 'Agendamento deletado com sucesso'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          // Cancelar (status = cancelled)
          const { data: cancelledAppointment, error: cancelError } = await supabase
            .from('appointments')
            .update({ 
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId)
            .eq('user_id', user.id)
            .select(`
              *,
              client:clients(*),
              service_details:services(*)
            `)
            .single();

          if (cancelError) throw new Error(`Erro ao cancelar agendamento: ${cancelError.message}`);

          return new Response(JSON.stringify({
            success: true,
            data: cancelledAppointment,
            message: 'Agendamento cancelado com sucesso'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      // ===============================================
      // 🕐 HORÁRIOS DISPONÍVEIS
      // ===============================================
      case 'available':
      case 'slots': {
        const date = url.searchParams.get('date');
        const serviceId = url.searchParams.get('service_id');
        const days = parseInt(url.searchParams.get('days') || '7');

        const businessHours = DEFAULT_BUSINESS_HOURS;
        let targetDates: string[] = [];
        
        if (date) {
          targetDates = [date];
        } else {
          const today = new Date();
          for (let i = 0; i < days; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            targetDates.push(targetDate.toISOString().split('T')[0]);
          }
        }

        const availableSlots: { [date: string]: string[] } = {};

        for (const targetDate of targetDates) {
          const dayOfWeek = DAYS_OF_WEEK[new Date(targetDate).getDay()];
          const dayConfig = businessHours[dayOfWeek as keyof typeof businessHours];

          if (!dayConfig.enabled) {
            availableSlots[targetDate] = [];
            continue;
          }

          // Buscar agendamentos da data
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
              *,
              service_details:services(duration)
            `)
            .eq('user_id', user.id)
            .eq('date', targetDate)
            .neq('status', 'cancelled');

          if (error) throw new Error(`Erro ao buscar agendamentos: ${error.message}`);

          // Determinar duração do serviço
          let serviceDuration = 60;
          if (serviceId) {
            const { data: service, error: serviceError } = await supabase
              .from('services')
              .select('duration')
              .eq('id', serviceId)
              .eq('user_id', user.id)
              .single();

            if (!serviceError && service) {
              serviceDuration = parseInt(service.duration);
            }
          }

          // Gerar e filtrar slots
          const allSlots = generateTimeSlots(dayConfig.start, dayConfig.end, serviceDuration);
          const availableSlotsForDay = allSlots.filter(slot => 
            !isSlotOccupied(slot, appointments, serviceDuration)
          );

          availableSlots[targetDate] = availableSlotsForDay;
        }

        return new Response(JSON.stringify({
          success: true,
          data: availableSlots,
          business_hours: businessHours,
          service_duration: serviceId ? serviceDuration : null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      default:
        throw new Error(`Ação não reconhecida: ${action}. Use: query, create, update, cancel, delete, available`);
    }

  } catch (error) {
    console.error('❌ Erro na API de agendamentos:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});