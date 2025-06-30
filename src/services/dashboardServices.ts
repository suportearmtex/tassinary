// src/services/dashboardServices.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment, Client, Service } from '../lib/types';
import { format, addMinutes, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
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
  service: string;
  date: string;
  time: string;
  price: string;
}

// Hook principal simplificado
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
  const [novoAgendamento, setNovoAgendamento] = useState<DadosFormularioAgendamento>({
    client_id: '', service_id: '', service: '', date: '', time: '', price: '0.00',
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
        .insert([{ ...dados, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('appointments')
        .update(dados)
        .eq('id', dados.id)
        .select()
        .single();
      if (error) throw error;
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
  const calcularEstatisticas = (appointments: Appointment[]): EstatisticasDashboard => {
    const hoje = new Date();
    const amanha = addDays(hoje, 1);
    
    const agendamentosHoje = appointments.filter(apt => {
      const data = new Date(apt.date);
      return data >= startOfDay(hoje) && data <= endOfDay(hoje);
    });
    
    const agendamentosAmanha = appointments.filter(apt => {
      const data = new Date(apt.date);
      return data >= startOfDay(amanha) && data <= endOfDay(amanha);
    });

    return {
      totalAgendamentos: appointments.length,
      agendamentosHoje: agendamentosHoje.length,
      agendamentosAmanha: agendamentosAmanha.length,
      receitaTotal: appointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + parseFloat(apt.price?.toString() || '0'), 0),
      agendamentosPendentes: appointments.filter(apt => apt.status === 'scheduled').length,
      agendamentosCompletos: appointments.filter(apt => apt.status === 'completed').length,
      agendamentosCancelados: appointments.filter(apt => apt.status === 'cancelled').length,
    };
  };

  const formatarMoeda = (valor: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const formatarIndicacaoDuracao = (horario: string, servico: Service | undefined) => {
    if (!horario || !servico?.duration) return '';
    const [h, m] = horario.split(':').map(Number);
    const total = h * 60 + m + parseInt(servico.duration);
    const hFim = Math.floor(total / 60);
    const mFim = total % 60;
    const fim = `${hFim.toString().padStart(2, '0')}:${mFim.toString().padStart(2, '0')}`;
    return `Duração: ${horario} até ${fim}`;
  };

  const eventosCalendario = agendamentos.data && servicos.data ? 
    agendamentos.data.map(apt => {
      const inicio = parseISO(`${apt.date}T${apt.time}`);
      const servico = servicos.data?.find(s => s.id === apt.service_id);
      const fim = servico ? addMinutes(inicio, parseInt(servico.duration)) : inicio;
      return {
        id: apt.id,
        title: `${apt.client?.name} - ${apt.service_details?.name}`,
        start: inicio,
        end: fim,
        className: `status-${apt.status}`,
        extendedProps: { appointment: apt },
      };
    }) : [];

  const clientesFiltrados = clientes.data?.filter(c => 
    c.name.toLowerCase().includes(filtroCliente.toLowerCase())
  ) || [];

  const agendamentosHoje = agendamentos.data ? 
    agendamentos.data.filter(apt => {
      const data = new Date(apt.date);
      const hoje = new Date();
      return data >= startOfDay(hoje) && data <= endOfDay(hoje);
    }) : [];

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
    estatisticas: agendamentos.data ? calcularEstatisticas(agendamentos.data) : null,
    eventosCalendario,
    clientesFiltrados,
    agendamentosHoje,
    horarioComercial: configuracaoHorarioQuery.data || { horario_inicio: '08:00', horario_fim: '18:00' },
    
    // Utilitários
    utilitarios: {
      formatarMoeda,
      formatarIndicacaoDuracao,
      limparFormularioAgendamento: () => ({
        client_id: '', service_id: '', service: '', date: '', time: '', price: '0.00',
      }),
    },
  };
};