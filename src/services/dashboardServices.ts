// src/pages/Dashboard.tsx
import React, { useEffect, useRef } from 'react';
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
  Eye
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDashboardCompleto, servicoEstatisticasDashboard } from '../services/dashboardServices';

// Componente de Card de Estatística
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
              <div className={`w-3 h-3 rounded-full ${
                agendamento.status === 'scheduled' ? 'bg-yellow-400' :
                agendamento.status === 'completed' ? 'bg-green-400' :
                agendamento.status === 'cancelled' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {agendamento.client?.name}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {agendamento.service_details?.name}
                  </p>
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {agendamento.time}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {utilitarios.formatarMoeda(parseFloat(agendamento.price || '0'))}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEditar(agendamento)}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onEnviarMensagem(agendamento.id, 'confirmation')}
                disabled={agendamento.messages_sent?.confirmation}
                className={`p-2 rounded-lg transition-colors ${
                  agendamento.messages_sent?.confirmation
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
                title={agendamento.messages_sent?.confirmation ? 'Mensagem enviada' : 'Enviar confirmação'}
              >
                <Send className="w-4 h-4" />
              </button>
              
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
);

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
    horarioComercial,
    // Estados do modal
    isModalAberto,
    setIsModalAberto,
    isModoEdicao,
    setIsModoEdicao,
    isModalExclusaoAberto,
    setIsModalExclusaoAberto,
    isModalHorarioAberto,
    setIsModalHorarioAberto,
    agendamentoParaExcluir,
    setAgendamentoParaExcluir,
    agendamentoSelecionado,
    setAgendamentoSelecionado,
    filtroCliente,
    setFiltroCliente,
    isDropdownClienteAberto,
    setIsDropdownClienteAberto,
    novoAgendamento,
    setNovoAgendamento,
  } = useDashboardCompleto();

  const dropdownClienteRef = useRef<HTMLDivElement>(null);

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

  // Agendamentos de hoje
  const agendamentosHoje = agendamentos.data ? 
    servicoEstatisticasDashboard.obterAgendamentosPorPeriodo(agendamentos.data, 'hoje') : [];

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
            Bem-vindo de volta! Aqui está um resumo do seu negócio hoje.
          </p>
        </div>
        <button
          onClick={() => {
            setNovoAgendamento(utilitarios.limparFormularioAgendamento());
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

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CartaoEstatistica
          titulo="Total de Agendamentos"
          valor={estatisticas?.totalAgendamentos || 0}
          mudanca="+12% este mês"
          tipoMudanca="positivo"
          icone={Calendar}
          gradiente="from-blue-500 to-blue-600"
          loading={agendamentos.isLoading}
        />
        
        <CartaoEstatistica
          titulo="Agendamentos Hoje"
          valor={estatisticas?.agendamentosHoje || 0}
          mudanca="2 confirmados"
          tipoMudanca="neutro"
          icone={Clock}
          gradiente="from-green-500 to-green-600"
          loading={agendamentos.isLoading}
        />
        
        <CartaoEstatistica
          titulo="Receita Total"
          valor={estatisticas ? utilitarios.formatarMoeda(estatisticas.receitaTotal) : 'R$ 0,00'}
          mudanca="+8% este mês"
          tipoMudanca="positivo"
          icone={DollarSign}
          gradiente="from-purple-500 to-purple-600"
          loading={agendamentos.isLoading}
        />
        
        <CartaoEstatistica
          titulo="Clientes Ativos"
          valor={clientes.data?.length || 0}
          mudanca="5 novos clientes"
          tipoMudanca="positivo"
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
              <button
                onClick={() => setIsModalHorarioAberto(true)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Ajustar Horário
              </button>
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
                slotMinTime={horarioComercial.horario_inicio}
                slotMaxTime={horarioComercial.horario_fim}
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
                  startTime: horarioComercial.horario_inicio,
                  endTime: horarioComercial.horario_fim,
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Status dos Agendamentos</h3>
            <Eye className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Agendados</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {estatisticas?.agendamentosPendentes || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Concluídos</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {estatisticas?.agendamentosCompletos || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Cancelados</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {estatisticas?.agendamentosCancelados || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Próximos Agendamentos</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {estatisticas?.agendamentosAmanha || 0}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Agendamentos para amanhã</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Serviços Populares</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {servicos.data?.slice(0, 3).map((servico, index) => (
              <div key={servico.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {servico.name}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {utilitarios.formatarMoeda(parseFloat(servico.price || '0'))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Agendamento */}
      {isModalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isModoEdicao ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button
                onClick={() => setIsModalAberto(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seleção de Cliente */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Cliente
                </label>
                {isModoEdicao ? (
                  <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{agendamentoSelecionado?.client?.name}</div>
                        {agendamentoSelecionado?.client?.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {agendamentoSelecionado.client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    {isDropdownClienteAberto && clientesFiltrados && clientesFiltrados.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {clientesFiltrados.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setNovoAgendamento({ ...novoAgendamento, client_id: client.id });
                              setFiltroCliente(client.name);
                              setIsDropdownClienteAberto(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                          >
                            <div>
                              <div className="font-medium">{client.name}</div>
                              {client.phone && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seleção de Serviço */}
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
                      price: servicoSelecionado?.price?.toString() || '0.00',
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecione um serviço</option>
                  {servicos.data?.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {utilitarios.formatarMoeda(parseFloat(service.price || '0'))}
                    </option>
                  ))}
                </select>
                
                {/* Indicação de duração */}
                {novoAgendamento.service_id && novoAgendamento.time && (
                  <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {utilitarios.formatarIndicacaoDuracao(
                      novoAgendamento.time,
                      servicos.data?.find(s => s.id === novoAgendamento.service_id)
                    )}
                  </div>
                )}
              </div>

              {/* Data e Hora */}
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Preço */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Preço
                </label>
                <input
                  type="number"
                  value={novoAgendamento.price}
                  onChange={(e) => setNovoAgendamento({ ...novoAgendamento, price: e.target.value })}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarAgendamento.isPending || atualizarAgendamento.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {(criarAgendamento.isPending || atualizarAgendamento.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isModoEdicao ? 'Atualizar' : 'Criar'
                  )}
                </button>
              </div>

              {/* Botão de Excluir (apenas no modo edição) */}
              {isModoEdicao && (
                <button
                  type="button"
                  onClick={() => handleExcluir(agendamentoSelecionado?.id || '')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center mt-2"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Agendamento
                </button>
              )}
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
                salvarConfiguracaoHorario.mutateAsync(configuracaoHorario);
                setIsModalHorarioAberto(false);
              }} 
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={configuracaoHorario.horario_inicio}
                    onChange={(e) => setConfiguracaoHorario({
                      ...configuracaoHorario,
                      horario_inicio: e.target.value
                    })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Horário de Fim
                  </label>
                  <input
                    type="time"
                    value={configuracaoHorario.horario_fim}
                    onChange={(e) => setConfiguracaoHorario({
                      ...configuracaoHorario,
                      horario_fim: e.target.value
                    })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalHorarioAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvarConfiguracaoHorario.isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {salvarConfiguracaoHorario.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isModalExclusaoAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalExclusaoAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarExclusao}
                  disabled={excluirAgendamento.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
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
        </div>
      )}
    </div>
  );
}

export default Dashboard;