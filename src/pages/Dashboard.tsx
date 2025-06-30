// src/pages/Dashboard.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Loader2,
  Send,
  Trash2,
  Edit2,
  Search,
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Settings
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDashboardCompleto, servicoEstatisticasDashboard } from '../services/dashboardServices';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Componente de Card de Estatística (removido mudança e tipoMudança)
const CartaoEstatistica: React.FC<{
  titulo: string;
  valor: string | number;
  icone: React.ComponentType<{ className?: string }>;
  gradiente: string;
  loading?: boolean;
}> = ({ titulo, valor, icone: Icone, gradiente, loading = false }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradiente} p-6 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-white/80">{titulo}</p>
        {loading ? (
          <div className="mt-2 flex items-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <p className="mt-2 text-3xl font-bold">{valor}</p>
        )}
      </div>
      <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
        <Icone className="w-8 h-8" />
      </div>
    </div>

    {/* Efeito de brilho */}
    <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
  </div>
);

// Componente de Lista de Agendamentos
const ListaAgendamentosHoje: React.FC<{
  agendamentos: any[];
  onEditar: (agendamento: any) => void;
  onExcluir: (id: string) => void;
  onEnviarMensagem: (id: string, tipo: string) => void;
  utilitarios: any;
}> = ({ agendamentos, onEditar, onExcluir, onEnviarMensagem, utilitarios }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
        <Clock className="w-5 h-5 mr-2 text-blue-600" />
        Agendamentos de Hoje
      </h3>
      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium px-3 py-1 rounded-full">
        {agendamentos.length} agendamentos
      </span>
    </div>

    {/* Scrollbar melhorada */}
    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
      {agendamentos.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum agendamento para hoje</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agendamentos.map((agendamento) => (
            <div
              key={agendamento.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-3 h-3 rounded-full ${agendamento.status === 'pending' ? 'bg-yellow-400' :
                    agendamento.status === 'confirmed' ? 'bg-green-400' :
                      agendamento.status === 'cancelled' ? 'bg-red-400' : 'bg-blue-400'
                  }`}></div>

                <div className="row">
                  <div className="flex flex-col">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {agendamento.client?.name}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {agendamento.time} - {utilitarios.calcularHorarioTermino(
                        agendamento.time,
                        agendamento.service_details?.duration || '60'
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {agendamento.service_details?.name || agendamento.service || 'Serviço não informado'}
                  </p>
                </div>


              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onEditar(agendamento)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* <button
                  onClick={() => onEnviarMensagem(agendamento.id, 'confirmation')}
                  disabled={agendamento.messages_sent?.confirmation}
                  className={`p-2 rounded-lg transition-colors ${agendamento.messages_sent?.confirmation
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  title={agendamento.messages_sent?.confirmation ? 'Mensagem enviada' : 'Enviar confirmação'}
                >
                  <Send className="w-4 h-4" />
                </button> */}

                <button
                  onClick={() => onExcluir(agendamento.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// Hook para gerenciar horários de funcionamento no localStorage
const useHorarioFuncionamento = () => {
  const [horarios, setHorarios] = useState({
    inicio: '08:00',
    fim: '18:00'
  });

  useEffect(() => {
    const horariosStorage = localStorage.getItem('horarios_funcionamento');
    if (horariosStorage) {
      setHorarios(JSON.parse(horariosStorage));
    }
  }, []);

  const salvarHorarios = (novosHorarios: { inicio: string; fim: string }) => {
    setHorarios(novosHorarios);
    localStorage.setItem('horarios_funcionamento', JSON.stringify(novosHorarios));
  };

  return { horarios, salvarHorarios };
};

// Componente principal do Dashboard
function Dashboard() {
  const {
    user,
    agendamentos,
    clientes,
    servicos,
    criarAgendamento,
    atualizarAgendamento,
    excluirAgendamento,
    enviarMensagem,
    estatisticas,
    eventosCalendario,
    clientesFiltrados,
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
    filtroCliente,
    setFiltroCliente,
    isDropdownClienteAberto,
    setIsDropdownClienteAberto,
    filtroTempo,
    setFiltroTempo,
    novoAgendamento,
    setNovoAgendamento,
  } = useDashboardCompleto();

  const dropdownClienteRef = useRef<HTMLDivElement>(null);
  const [isModalHorarioAberto, setIsModalHorarioAberto] = useState(false);
  const { horarios, salvarHorarios } = useHorarioFuncionamento();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (dropdownClienteRef.current && !dropdownClienteRef.current.contains(event.target as Node)) {
        setIsDropdownClienteAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickFora);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, [setIsDropdownClienteAberto]);

  // Handlers de eventos
  const handleSelecionarData = (infoSelecao: any) => {
    setNovoAgendamento({
      ...utilitarios.limparFormularioAgendamento(),
      date: format(infoSelecao.start, 'yyyy-MM-dd'),
      time: format(infoSelecao.start, 'HH:mm'),
    });
    setFiltroCliente('');
    setIsModoEdicao(false);
    setAgendamentoSelecionado(null);
    setIsModalAberto(true);
  };

  const handleClicarEvento = (infoClique: any) => {
    const evento = infoClique.event;
    const agendamento = agendamentos.data?.find(apt => apt.id === evento.id);
    if (agendamento) {
      setAgendamentoSelecionado(agendamento);
      setNovoAgendamento({
        client_id: agendamento.client_id,
        service_id: agendamento.service_id,
        service: agendamento.service,
        date: agendamento.date,
        time: agendamento.time,
        price: agendamento.price?.toString() || '0.00',
      });
      setIsModoEdicao(true);
      setIsModalAberto(true);
    }
  };

  const handleExcluir = (id: string) => {
    setAgendamentoParaExcluir(id);
    setIsModalExclusaoAberto(true);
  };

  const confirmarExclusao = async () => {
    if (agendamentoParaExcluir) {
      try {
        await excluirAgendamento.mutateAsync(agendamentoParaExcluir);
        setIsModalExclusaoAberto(false);
        setAgendamentoParaExcluir(null);
        setIsModalAberto(false);
        setAgendamentoSelecionado(null);
        setIsModoEdicao(false);
        setNovoAgendamento(utilitarios.limparFormularioAgendamento());
      } catch (error) {
        setIsModalExclusaoAberto(false);
        setAgendamentoParaExcluir(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isModoEdicao && agendamentoSelecionado) {
      await atualizarAgendamento.mutateAsync({
        id: agendamentoSelecionado.id,
        ...novoAgendamento,
      });
    } else {
      await criarAgendamento.mutateAsync(novoAgendamento);
    }
    setIsModalAberto(false);
    setNovoAgendamento(utilitarios.limparFormularioAgendamento());
  };

  const handleEnviarMensagem = async (id: string, tipo: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'cancellation') => {
    await enviarMensagem.mutateAsync({ id, type: tipo });
  };

  // Calcular horário de término
  const calcularHorarioTermino = (horarioInicio: string, duracao: string) => {
    if (!horarioInicio || !duracao) return '';

    const [horas, minutos] = horarioInicio.split(':').map(Number);
    const duracaoMinutos = parseInt(duracao);

    const dataInicio = new Date();
    dataInicio.setHours(horas, minutos, 0, 0);

    const dataFim = addMinutes(dataInicio, duracaoMinutos);

    return format(dataFim, 'HH:mm');
  };

  // CORREÇÃO: Filtrar agendamentos de hoje usando função específica
  const agendamentosHoje = agendamentos.data ?
    servicoEstatisticasDashboard.obterAgendamentosHoje(agendamentos.data) : [];

  if (agendamentos.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Painel de Controle
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Bem-vindo de volta! Aqui está um resumo do seu negócio.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Filtros de tempo */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { key: 'dia', label: 'Hoje' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mês' }
            ].map((filtro) => (
              <button
                key={filtro.key}
                onClick={() => setFiltroTempo(filtro.key as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filtroTempo === filtro.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {filtro.label}
              </button>
            ))}
          </div>

          {/* CORREÇÃO: Botão de sincronização com py-3 */}
          <button
            onClick={async () => {
              try {
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-appointments`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (!response.ok) throw new Error('Erro na sincronização');

                const result = await response.json();
                toast.success(`${result.synced} agendamentos sincronizados!`);

                // Recarregar dados
                agendamentos.refetch();
              } catch (error) {
                toast.error('Erro ao sincronizar com Google Calendar');
                console.error(error);
              }
            }}
            className="flex items-center space-x-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200"
          >
            <Calendar className="w-4 h-4" />
            <span>Sincronizar</span>
          </button>

          {/* Botão de configurar horários */}
          <button
            onClick={() => setIsModalHorarioAberto(true)}
            className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            <span>Horários</span>
          </button>

          <button
            onClick={() => {
              setNovoAgendamento(utilitarios.limparFormularioAgendamento());
              setFiltroCliente('');
              setIsModoEdicao(false);
              setAgendamentoSelecionado(null);
              setIsModalAberto(true);
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas (removidos subtítulos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CartaoEstatistica
          titulo="Total de Agendamentos"
          valor={estatisticas?.totalAgendamentos || 0}
          icone={Calendar}
          gradiente="from-blue-500 to-blue-600"
          loading={agendamentos.isLoading}
        />

        <CartaoEstatistica
          titulo="Agendamentos Hoje"
          valor={estatisticas?.agendamentosHoje || 0}
          icone={Clock}
          gradiente="from-green-500 to-green-600"
          loading={agendamentos.isLoading}
        />

        <CartaoEstatistica
          titulo="Receita Total"
          valor={estatisticas ? utilitarios.formatarMoeda(estatisticas.receitaTotal) : 'R$ 0,00'}
          icone={DollarSign}
          gradiente="from-purple-500 to-purple-600"
          loading={agendamentos.isLoading}
        />

        <CartaoEstatistica
          titulo="Clientes Ativos"
          valor={clientes.data?.length || 0}
          icone={Users}
          gradiente="from-orange-500 to-orange-600"
          loading={clientes.isLoading}
        />
      </div>

      {/* Seção Principal - Calendário e Lista */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-blue-600" />
                Agenda
              </h2>
            </div>

            <div className="h-[500px] xl:h-[600px]">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                buttonText={{
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                  day: 'Dia'
                }}
                events={eventosCalendario}
                slotMinTime={horarios.inicio}
                slotMaxTime={horarios.fim}
                locale="pt-br"
                allDaySlot={false}
                editable={false}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                select={handleSelecionarData}
                eventClick={handleClicarEvento}
                slotDuration="00:30:00"
                snapDuration="00:15:00"
                businessHours={{
                  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                  startTime: horarios.inicio,
                  endTime: horarios.fim,
                }}
                height="100%"
                eventClassNames="cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Lista de Agendamentos de Hoje */}
        <div className="xl:col-span-1">
          <ListaAgendamentosHoje
            agendamentos={agendamentosHoje}
            onEditar={(agendamento) => {
              setAgendamentoSelecionado(agendamento);
              setNovoAgendamento({
                client_id: agendamento.client_id,
                service_id: agendamento.service_id,
                service: agendamento.service,
                date: agendamento.date,
                time: agendamento.time,
                price: agendamento.price?.toString() || '0.00',
              });
              setIsModoEdicao(true);
              setIsModalAberto(true);
            }}
            onExcluir={handleExcluir}
            onEnviarMensagem={handleEnviarMensagem}
            utilitarios={utilitarios}
          />
        </div>
      </div>

      {/* Estatísticas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Próximos Agendamentos</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {agendamentos.data?.slice(0, 5).map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{apt.client?.name}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{apt.service}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 dark:text-white text-sm font-medium">{apt.time}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{format(new Date(apt.date), 'dd/MM', { locale: ptBR })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Serviços Populares</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {servicos.data?.slice(0, 5).map((servico) => (
              <div key={servico.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{servico.name}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs">{servico.duration} min</p>
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium text-sm">
                  {utilitarios.formatarMoeda(servico.price)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clientes Recentes</h3>
            <Users className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {clientes.data?.slice(0, 5).map((cliente) => (
              <div key={cliente.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{cliente.name}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">{cliente.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Novo/Editar Agendamento */}
      {isModalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {isModoEdicao ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Cliente
                </label>
                {isModoEdicao && agendamentoSelecionado ? (
                  // Campo fixo para edição - cliente não pode ser alterado
                  <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{agendamentoSelecionado.client?.name}</div>
                        {agendamentoSelecionado.client?.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {agendamentoSelecionado.client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Campo editável para novo agendamento
                  <div className="relative" ref={dropdownClienteRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={filtroCliente}
                        onChange={(e) => {
                          setFiltroCliente(e.target.value);
                          setIsDropdownClienteAberto(true);
                        }}
                        onFocus={() => setIsDropdownClienteAberto(true)}
                        placeholder="Buscar cliente..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {isDropdownClienteAberto && clientesFiltrados && clientesFiltrados.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {clientesFiltrados.map((cliente) => (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => {
                              setNovoAgendamento({ ...novoAgendamento, client_id: cliente.id });
                              setFiltroCliente(cliente.name);
                              setIsDropdownClienteAberto(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{cliente.name}</div>
                              {cliente.phone && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">{cliente.phone}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Serviço
                </label>
                <select
                  value={novoAgendamento.service_id}
                  onChange={(e) => {
                    const servicoSelecionado = servicos.data?.find(s => s.id === e.target.value);
                    setNovoAgendamento({
                      ...novoAgendamento,
                      service_id: e.target.value,
                      service: servicoSelecionado?.name || null,
                      price: servicoSelecionado?.price?.toString() || '0.00',
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecione um serviço</option>
                  {servicos.data?.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.name} - {utilitarios.formatarMoeda(servico.price)} ({servico.duration}min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Data
                  </label>
                  <input
                    type="date"
                    value={novoAgendamento.date}
                    onChange={(e) => setNovoAgendamento({ ...novoAgendamento, date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={novoAgendamento.time}
                    onChange={(e) => setNovoAgendamento({ ...novoAgendamento, time: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={novoAgendamento.price}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, price: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Duration Preview */}
              {novoAgendamento.time && novoAgendamento.service_id && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Duração: {novoAgendamento.time} até {calcularHorarioTermino(
                        novoAgendamento.time,
                        servicos.data?.find(s => s.id === novoAgendamento.service_id)?.duration || '0'
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalAberto(false);
                    setIsModoEdicao(false);
                    setAgendamentoSelecionado(null);
                    setNovoAgendamento(utilitarios.limparFormularioAgendamento());
                    setFiltroCliente('');
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarAgendamento.isPending || atualizarAgendamento.isPending || !novoAgendamento.client_id}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {(criarAgendamento.isPending || atualizarAgendamento.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isModoEdicao ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Horário */}
      {isModalHorarioAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configurar Horário de Funcionamento
              </h3>
              <button
                onClick={() => setIsModalHorarioAberto(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const novosHorarios = {
                  inicio: formData.get('inicio') as string,
                  fim: formData.get('fim') as string,
                };
                salvarHorarios(novosHorarios);
                setIsModalHorarioAberto(false);
                toast.success('Horários atualizados!');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Horário de Início
                </label>
                <input
                  type="time"
                  name="inicio"
                  defaultValue={horarios.inicio}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Horário de Término
                </label>
                <input
                  type="time"
                  name="fim"
                  defaultValue={horarios.fim}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalHorarioAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isModalExclusaoAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Confirmar Exclusão
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsModalExclusaoAberto(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluirAgendamento.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {excluirAgendamento.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS para scrollbars melhoradas */}
      <style jsx>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        
        .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
          border-radius: 6px;
        }
        
        .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 6px;
        }
        
        .scrollbar-track-gray-100::-webkit-scrollbar-track {
          background-color: #f3f4f6;
          border-radius: 6px;
        }
        
        .dark .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background-color: #1f2937;
          border-radius: 6px;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-thumb {
          border-radius: 6px;
          background-color: #d1d5db;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background-color: #9ca3af;
        }
        
        .dark ::-webkit-scrollbar-thumb {
          background-color: #4b5563;
        }
        
        .dark ::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
        
        ::-webkit-scrollbar-track {
          background-color: #f3f4f6;
          border-radius: 6px;
        }
        
        .dark ::-webkit-scrollbar-track {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;