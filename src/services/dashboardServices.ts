// src/services/dashboardServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { format, isToday, isTomorrow, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

// Tipos
interface Agendamento {
  id: string;
  client_id: string;
  service_id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  price: number;
  messages_sent?: {
    confirmation?: boolean;
    reminder_24h?: boolean;
    reminder_1h?: boolean;
    cancellation?: boolean;
  };
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  service?: {
    id: string;
    name: string;
    duration: string;
    price: string;
  };
}

interface NovoAgendamento {
  client_id: string;
  service_id: string;
  service?: any;
  date: string;
  time: string;
  price: string;
}

interface Estatisticas {
  totalAgendamentos: number;
  agendamentosHoje: number;
  agendamentosAmanha: number;
  receitaTotal: number;
  agendamentosPendentes: number;
  agendamentosCompletos: number;
  agendamentosCancelados: number;
}

// Serviços de estatísticas
export const servicoEstatisticasDashboard = {
  calcularEstatisticas(agendamentos: Agendamento[]): Estatisticas {
    const hoje = new Date();
    const agendamentosHoje = agendamentos.filter(apt => isToday(new Date(apt.date)));
    const agendamentosAmanha = agendamentos.filter(apt => isTomorrow(new Date(apt.date)));
    
    return {
      totalAgendamentos: agendamentos.length,
      agendamentosHoje: agendamentosHoje.length,
      agendamentosAmanha: agendamentosAmanha.length,
      receitaTotal: agendamentos
        .filter(apt => apt.status === 'confirmed')
        .reduce((total, apt) => total + (apt.price || 0), 0),
      agendamentosPendentes: agendamentos.filter(apt => apt.status === 'pending').length,
      agendamentosCompletos: agendamentos.filter(apt => apt.status === 'confirmed').length,
      agendamentosCancelados: agendamentos.filter(apt => apt.status === 'cancelled').length,
    };
  },

  obterAgendamentosPorPeriodo(agendamentos: Agendamento[], periodo: 'hoje' | 'amanha'): Agendamento[] {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const amanha = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    return agendamentos.filter(apt => {
      return periodo === 'hoje' ? apt.date === hoje : apt.date === amanha;
    });
  },

  formatarEventosCalendario(agendamentos: Agendamento[]) {
    return agendamentos.map(apt => ({
      id: apt.id,
      title: `${apt.client?.name} - ${apt.service?.name}`,
      start: `${apt.date}T${apt.time}`,
      end: apt.service?.duration ? 
        `${apt.date}T${format(addMinutes(new Date(`${apt.date}T${apt.time}`), parseInt(apt.service.duration)), 'HH:mm')}` :
        `${apt.date}T${apt.time}`,
      backgroundColor: apt.status === 'pending' ? '#3b82f6' : 
                     apt.status === 'confirmed' ? '#10b981' : '#ef4444',
      borderColor: apt.status === 'pending' ? '#2563eb' : 
                   apt.status === 'confirmed' ? '#059669' : '#dc2626',
    }));
  }
};

// Utilitários
export const utilitarios = {
  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  },

  formatarData(data: string): string {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  },

  formatarHora(hora: string): string {
    return hora.substring(0, 5);
  },

  calcularHorarioTermino(horarioInicio: string, duracao: string): string {
    if (!horarioInicio || !duracao) return '';
    
    const [horas, minutos] = horarioInicio.split(':').map(Number);
    const duracaoMinutos = parseInt(duracao);
    
    const dataInicio = new Date();
    dataInicio.setHours(horas, minutos, 0, 0);
    
    const dataFim = addMinutes(dataInicio, duracaoMinutos);
    
    return format(dataFim, 'HH:mm');
  },

  limparFormularioAgendamento(): NovoAgendamento {
    return {
      client_id: '',
      service_id: '',
      service: null,
      date: '',
      time: '',
      price: '0.00',
    };
  },
};

// Hook para buscar agendamentos
const useAgendamentos = (userId?: string) => {
  return useQuery({
    queryKey: ['appointments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(*),
          service:services(*)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      return data as Agendamento[];
    },
    enabled: !!userId,
  });
};

// Hook para buscar clientes
const useClientes = (userId?: string) => {
  return useQuery({
    queryKey: ['clients', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

// Hook para buscar serviços
const useServicos = (userId?: string) => {
  return useQuery({
    queryKey: ['services', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

// Hook para criar agendamento
const useCriarAgendamento = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (novoAgendamento: NovoAgendamento) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          ...novoAgendamento,
          user_id: user?.id,
          status: 'pending',
          price: parseFloat(novoAgendamento.price),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Hook para atualizar agendamento
const useAtualizarAgendamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & Partial<NovoAgendamento>) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...updateData,
          price: updateData.price ? parseFloat(updateData.price) : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Hook para excluir agendamento
const useExcluirAgendamento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Hook para enviar mensagem
const useEnviarMensagem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const { error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: { appointmentId: id, messageType: type }
      });

      if (error) throw error;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      const messageType = type === 'confirmation' ? 'confirmação' : 
                         type === 'reminder_24h' ? 'lembrete (24h)' :
                         type === 'reminder_1h' ? 'lembrete (1h)' : 'cancelamento';
      toast.success(`Mensagem de ${messageType} enviada com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Hook principal que combina todos os dados e funções
export const useDashboardCompleto = () => {
  const { user } = useAuthStore();
  
  // Estados para modais
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [isModoEdicao, setIsModoEdicao] = useState(false);
  const [isModalExclusaoAberto, setIsModalExclusaoAberto] = useState(false);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<string | null>(null);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  
  // Estados para formulário
  const [filtroCliente, setFiltroCliente] = useState('');
  const [isDropdownClienteAberto, setIsDropdownClienteAberto] = useState(false);
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>(
    utilitarios.limparFormularioAgendamento()
  );

  // Queries
  const agendamentos = useAgendamentos(user?.id);
  const clientes = useClientes(user?.id);
  const servicos = useServicos(user?.id);

  // Mutations
  const criarAgendamento = useCriarAgendamento();
  const atualizarAgendamento = useAtualizarAgendamento();
  const excluirAgendamento = useExcluirAgendamento();
  const enviarMensagem = useEnviarMensagem();

  // Dados calculados
  const estatisticas = useMemo(() => {
    if (!agendamentos.data) return null;
    return servicoEstatisticasDashboard.calcularEstatisticas(agendamentos.data);
  }, [agendamentos.data]);

  const eventosCalendario = useMemo(() => {
    if (!agendamentos.data) return [];
    return servicoEstatisticasDashboard.formatarEventosCalendario(agendamentos.data);
  }, [agendamentos.data]);

  const clientesFiltrados = useMemo(() => {
    if (!clientes.data || !filtroCliente) return [];
    return clientes.data.filter(cliente =>
      cliente.name.toLowerCase().includes(filtroCliente.toLowerCase())
    );
  }, [clientes.data, filtroCliente]);

  return {
    // Dados do usuário
    user,
    
    // Queries
    agendamentos,
    clientes,
    servicos,
    
    // Mutations
    criarAgendamento,
    atualizarAgendamento,
    excluirAgendamento,
    enviarMensagem,
    
    // Dados calculados
    estatisticas,
    eventosCalendario,
    clientesFiltrados,
    
    // Utilitários
    utilitarios,
    
    // Estados do modal
    isModalAberto,
    setIsModalAberto,
    isModoEdicao,
    setIsModoEdicao,
    isModalExclusaoAberto,
    setIsModalExclusaoAberto,
    agendamentoParaExcluir,
    setAgendamentoParaExcluir,
    agendamentoSelecionado,
    setAgendamentoSelecionado,
    
    // Estados do formulário
    filtroCliente,
    setFiltroCliente,
    isDropdownClienteAberto,
    setIsDropdownClienteAberto,
    novoAgendamento,
    setNovoAgendamento,
  };
};