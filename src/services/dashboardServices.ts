// src/services/dashboardServices.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment, Client, Service } from '../lib/types';
import { format, addMinutes, parseISO, startOfDay, endOfDay, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

// Types essenciais
export interface EstatisticasDashboard {
  totalAgendamentos: number;
  agendamentosHoje: number;
  agendamentosAmanha: number;
  receitaTotal: number;
  agendamentosPendentes: number;
  agendamentosCompletos: number;
  agendamentosCancelados: number;
}

export interface DadosFormularioAgendamento {
  client_id: string;
  service_id: string;
  service?: any;
  date: string;
  time: string;
  price: string;
}

// Serviços de estatísticas (compatível com status do banco)
export const servicoEstatisticasDashboard = {
  obterAgendamentosPorPeriodo(agendamentos: Appointment[], periodo: 'hoje' | 'semana' | 'mes' | 'dia', dataReferencia?: Date): Appointment[] {
    const hoje = dataReferencia || new Date();
    
    return agendamentos.filter(apt => {
      const dataAgendamento = new Date(apt.date);
      
      switch (periodo) {
        case 'hoje':
        case 'dia':
          return format(dataAgendamento, 'yyyy-MM-dd') === format(hoje, 'yyyy-MM-dd');
          
        case 'semana':
          const inicioSemana = startOfDay(hoje);
          inicioSemana.setDate(hoje.getDate() - hoje.getDay());
          const fimSemana = endOfDay(new Date(inicioSemana));
          fimSemana.setDate(inicioSemana.getDate() + 6);
          return dataAgendamento >= inicioSemana && dataAgendamento <= fimSemana;
          
        case 'mes':
          return dataAgendamento.getMonth() === hoje.getMonth() && 
                 dataAgendamento.getFullYear() === hoje.getFullYear();
                 
        default:
          return true;
      }
    });
  },

  obterAgendamentosHoje(agendamentos: Appointment[]): Appointment[] {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    
    return agendamentos.filter(apt => apt.date === hoje);
    
  }
};

// Hook principal
export const useDashboardCompleto = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Estados
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [isModoEdicao, setIsModoEdicao] = useState(false);
  const [isModalExclusaoAberto, setIsModalExclusaoAberto] = useState(false);
  const [isModalHorarioAberto, setIsModalHorarioAberto] = useState(false);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<string | null>(null);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Appointment | null>(null);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [isDropdownClienteAberto, setIsDropdownClienteAberto] = useState(false);
  const [filtroTempo, setFiltroTempo] = useState<'hoje' | 'semana' | 'mes' | 'dia'>('mes');
  const [novoAgendamento, setNovoAgendamento] = useState<DadosFormularioAgendamento>({
    client_id: '', service_id: '', service: null, date: '', time: '', price: '0.00',
  });
  const [configuracaoHorario, setConfiguracaoHorario] = useState({
    horario_inicio: '08:00', horario_fim: '18:00',
  });

  // Queries
  const agendamentos = useQuery({
    queryKey: ['agendamentos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('user_id', user?.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user?.id,
  });

  const clientes = useQuery({
    queryKey: ['clientes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user?.id,
  });

  const servicos = useQuery({
    queryKey: ['servicos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
    enabled: !!user?.id,
  });

  const configuracaoHorarioQuery = useQuery({
    queryKey: ['configuracao_horario', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('setting_key', 'horario_funcionamento')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.setting_value) {
        return JSON.parse(data.setting_value);
      }
      return { horario_inicio: '08:00', horario_fim: '18:00' };
    },
    enabled: !!user?.id,
  });

  // Mutations
  const criarAgendamento = useMutation({
    mutationFn: async (dados: DadosFormularioAgendamento) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{ 
          ...dados, 
          user_id: user?.id,
          status: 'pending',
          price: parseFloat(dados.price),
          is_synced_to_google: false
        }])
        .select('*, client:clients(*), service_details:services(*)')
        .single();
      if (error) throw error;

      // Sync with Google Calendar
      try {
        await syncWithGoogleCalendar(data, 'create');
      } catch (error) {
        console.error('Failed to sync with Google Calendar:', error);
        toast.error('Agendamento criado, mas falhou ao sincronizar com Google Calendar');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos', user?.id] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const atualizarAgendamento = useMutation({
    mutationFn: async (dados: Partial<Appointment> & { id: string }) => {
      // Buscar appointment original para preservar dados de sincronização
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('id', dados.id)
        .single();

      if (fetchError) throw fetchError;

      const updateData = { ...dados };
      if (dados.price) {
        updateData.price = parseFloat(dados.price.toString());
      }
      
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', dados.id)
        .select('*, client:clients(*), service_details:services(*)')
        .single();
      if (error) throw error;

      // Sync with Google Calendar apenas se estiver sincronizado
      if (originalAppointment.is_synced_to_google && originalAppointment.google_event_id) {
        const appointmentForSync = {
          ...data,
          google_event_id: originalAppointment.google_event_id,
          is_synced_to_google: originalAppointment.is_synced_to_google
        };

        try {
          await syncWithGoogleCalendar(appointmentForSync, 'update');
        } catch (error) {
          console.error('Failed to sync with Google Calendar:', error);
          toast.error('Agendamento atualizado, mas falhou ao sincronizar com Google Calendar');
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos', user?.id] });
      toast.success('Agendamento atualizado com sucesso!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const excluirAgendamento = useMutation({
    mutationFn: async (id: string) => {
      // Buscar appointment original para preservar dados de sincronização
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Sync with Google Calendar first (apenas se sincronizado)
      if (originalAppointment.is_synced_to_google && originalAppointment.google_event_id) {
        try {
          await syncWithGoogleCalendar(originalAppointment, 'delete');
        } catch (error) {
          console.error('Failed to sync deletion with Google Calendar:', error);
          toast.error('Erro ao remover evento do Google Calendar');
        }
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos', user?.id] });
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Função de sincronização com Google Calendar
  const syncWithGoogleCalendar = async (appointment: any, operation: 'create' | 'update' | 'delete') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found, skipping Google Calendar sync');
        return;
      }

      // Para operações update/delete, verificar se está sincronizado
      if ((operation === 'update' || operation === 'delete') && !appointment.is_synced_to_google) {
        console.warn(`Appointment ${appointment.id} is not synced to Google Calendar, skipping ${operation}`);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-calendar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment,
          operation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${operation} event in Google Calendar`);
      }

      return response.json();
    } catch (error) {
      console.error(`Error syncing ${operation} with Google Calendar:`, error);
      throw error;
    }
  };

  const salvarConfiguracaoHorario = useMutation({
    mutationFn: async (config: { horario_inicio: string; horario_fim: string }) => {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          setting_key: 'horario_funcionamento',
          setting_value: JSON.stringify(config),
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao_horario', user?.id] });
      toast.success('Horário atualizado!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const enviarMensagem = useMutation({
    mutationFn: async (dados: { id: string; type: string }) => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      });
      if (!response.ok) throw new Error('Erro ao enviar mensagem');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos', user?.id] });
      const tipo = data.type === 'confirmation' ? 'confirmação' : 'lembrete';
      toast.success(`Mensagem de ${tipo} enviada!`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Funções utilitárias
 const calcularEstatisticas = (appointments: Appointment[], filtro: 'hoje' | 'semana' | 'mes' | 'dia' = 'mes'): EstatisticasDashboard => {
  const agendamentosFiltrados = servicoEstatisticasDashboard.obterAgendamentosPorPeriodo(appointments, filtro);
  
  // Usar função específica para hoje
  const agendamentosHoje = servicoEstatisticasDashboard.obterAgendamentosHoje(appointments);
  
  // Calcular amanhã com string de data
  const amanha = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const agendamentosAmanha = appointments.filter(apt => apt.date === amanha);

  return {
    totalAgendamentos: agendamentosFiltrados.length,
    agendamentosHoje: agendamentosHoje.length,
    agendamentosAmanha: agendamentosAmanha.length,
    // CORREÇÃO: Receita Total sem filtro (todos os agendamentos confirmados)
    receitaTotal: agendamentosFiltrados.filter(apt => apt.status === 'confirmed').reduce((sum, apt) => sum + parseFloat(apt.price?.toString() || '0'), 0),
    agendamentosPendentes: agendamentosFiltrados.filter(apt => apt.status === 'pending').length,
    agendamentosCompletos: agendamentosFiltrados.filter(apt => apt.status === 'confirmed').length,
    agendamentosCancelados: agendamentosFiltrados.filter(apt => apt.status === 'cancelled').length,
  };
};
  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const calcularHorarioTermino = (horario: string, duracao: string) => {
    if (!horario || !duracao) return '';
    const [h, m] = horario.split(':').map(Number);
    const total = h * 60 + m + parseInt(duracao);
    const hFim = Math.floor(total / 60);
    const mFim = total % 60;
    return `${hFim.toString().padStart(2, '0')}:${mFim.toString().padStart(2, '0')}`;
  };

 const eventosCalendario = agendamentos.data && servicos.data ? 
  agendamentos.data.map(apt => {
    const inicio = parseISO(`${apt.date}T${apt.time}`);
    const servico = servicos.data?.find(s => s.id === apt.service_id);
    const fim = servico ? addMinutes(inicio, parseInt(servico.duration)) : inicio;
    
    // Corrigir nome do serviço para o título
    const serviceName = apt.service?.name || apt.service_details?.name || apt.service || 'Serviço';
    
    return {
      id: apt.id,
      title: `${apt.client?.name} - ${serviceName}`,
      start: inicio,
      end: fim,
      backgroundColor: apt.status === 'pending' ? '#3b82f6' : 
                      apt.status === 'confirmed' ? '#10b981' : '#ef4444',
      borderColor: apt.status === 'pending' ? '#2563eb' : 
                   apt.status === 'confirmed' ? '#059669' : '#dc2626',
      extendedProps: { appointment: apt },
    };
  }) : [];

  const clientesFiltrados = clientes.data?.filter(c => 
    c.name.toLowerCase().includes(filtroCliente.toLowerCase())
  ) || [];

  const agendamentosHoje = agendamentos.data ? 
    servicoEstatisticasDashboard.obterAgendamentosHoje(agendamentos.data) : [];

  return {
    // Estados
    isModalAberto, setIsModalAberto,
    isModoEdicao, setIsModoEdicao,
    isModalExclusaoAberto, setIsModalExclusaoAberto,
    isModalHorarioAberto, setIsModalHorarioAberto,
    agendamentoParaExcluir, setAgendamentoParaExcluir,
    agendamentoSelecionado, setAgendamentoSelecionado,
    filtroCliente, setFiltroCliente,
    isDropdownClienteAberto, setIsDropdownClienteAberto,
    filtroTempo, setFiltroTempo,
    novoAgendamento, setNovoAgendamento,
    configuracaoHorario, setConfiguracaoHorario,
    
    // Dados
    agendamentos,
    clientes,
    servicos,
    
    // Mutations
    criarAgendamento,
    atualizarAgendamento,
    excluirAgendamento,
    salvarConfiguracaoHorario,
    enviarMensagem,
    
    // Dados processados
    estatisticas: agendamentos.data ? calcularEstatisticas(agendamentos.data, filtroTempo) : null,
    eventosCalendario,
    clientesFiltrados,
    agendamentosHoje,
    horarioComercial: configuracaoHorarioQuery.data || { horario_inicio: '08:00', horario_fim: '18:00' },
    
    // Utilitários
    utilitarios: {
      formatarMoeda,
      calcularHorarioTermino,
      limparFormularioAgendamento: () => ({
        client_id: '', service_id: '', service: null, date: '', time: '', price: '0.00',
      }),
    },
  };
};