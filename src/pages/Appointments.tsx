// src/pages/Appointments.tsx
import React from 'react';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Send,
  DollarSign,
  Loader2,
  X
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import { useAppointmentsServices } from '../services/appointmentsServices';

// Componente de Card de Agendamento
const AppointmentCard: React.FC<{
  appointment: any;
  onEdit: (appointment: any) => void;
  onDelete: (id: string) => void;
  onSendMessage: (id: string, type: string) => void;
}> = ({ appointment, onEdit, onDelete, onSendMessage }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {appointment.client?.name}
          </h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            appointment.status === 'confirmed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : appointment.status === 'cancelled'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
          }`}>
            {appointment.status === 'confirmed' ? 'Confirmado' : 
             appointment.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{format(addDays(new Date(appointment.date), 1), 'dd/MM/yyyy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{appointment.time}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span>R$ {appointment.price?.toFixed(2) || '0.00'}</span>
          </div>
          {appointment.service_details && (
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-xs">
              {appointment.service_details.name}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onEdit(appointment)}
          className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Editar
        </button>
        <button
          onClick={() => onDelete(appointment.id)}
          className="px-3 py-2 bg-red-100 text-red-800 rounded-md text-sm font-medium hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </button>
      </div>
    </div>

    {/* Message Actions */}
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSendMessage(appointment.id, 'confirmation')}
          disabled={appointment.messages_sent?.confirmation}
          className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
            appointment.messages_sent?.confirmation
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
              : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
          }`}
        >
          <Send className="w-4 h-4" />
          {appointment.messages_sent?.confirmation ? 'Enviado' : 'Confirmação'}
        </button>
        
        <button
          onClick={() => onSendMessage(appointment.id, 'reminder_24h')}
          disabled={appointment.messages_sent?.reminder_24h}
          className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
            appointment.messages_sent?.reminder_24h
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
          }`}
        >
          <Send className="w-4 h-4" />
          {appointment.messages_sent?.reminder_24h ? 'Enviado' : 'Lembrete 24h'}
        </button>
        
        <button
          onClick={() => onSendMessage(appointment.id, 'reminder_1h')}
          disabled={appointment.messages_sent?.reminder_1h}
          className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
            appointment.messages_sent?.reminder_1h
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
              : 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50'
          }`}
        >
          <Send className="w-4 h-4" />
          {appointment.messages_sent?.reminder_1h ? 'Enviado' : 'Lembrete 1h'}
        </button>
        
        <button
          onClick={() => onSendMessage(appointment.id, 'cancellation')}
          disabled={appointment.messages_sent?.cancellation}
          className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
            appointment.messages_sent?.cancellation
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
              : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'
          }`}
        >
          <Send className="w-4 h-4" />
          {appointment.messages_sent?.cancellation ? 'Enviado' : 'Cancelamento'}
        </button>
      </div>
    </div>
  </div>
);

// Componente Principal
function Appointments() {
  const { user } = useAuthStore();
  
  const {
    // Estados
    isModalOpen,
    setIsModalOpen,
    isEditMode,
    setIsEditMode,
    isDeleteModalOpen,
    selectedAppointment,
    clientFilter,
    setClientFilter,
    isClientDropdownOpen,
    setIsClientDropdownOpen,
    newAppointment,
    setNewAppointment,
    filters,
    
    // Refs
    clientDropdownRef,
    
    // Dados
    appointments,
    clients,
    services,
    filteredClients,
    
    // Loading states
    isLoadingAppointments,
    
    // Mutations
    createAppointmentMutation,
    updateAppointmentMutation,
    deleteAppointmentMutation,
    
    // Event handlers
    handleEdit,
    handleDelete,
    confirmDelete,
    handleSubmit,
    handleSendMessage,
    clearAppointmentForm,
    updateFilter,
    clearFilters,
    
    // Utilidades
    calculateEndTime,
  } = useAppointmentsServices(user?.id);

  if (isLoadingAppointments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Agendamentos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus agendamentos e compromissos
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Agendamento</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por cliente ou serviço..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            
            {(filters.search || filters.status !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filters.search || filters.status !== 'all' 
                ? 'Nenhum agendamento encontrado' 
                : 'Nenhum agendamento cadastrado'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filters.search || filters.status !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro agendamento'
              }
            </p>
            {(!filters.search && filters.status === 'all') && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Criar Primeiro Agendamento
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSendMessage={handleSendMessage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Cliente
                </label>
                {isEditMode && selectedAppointment ? (
                  // Campo fixo para edição - cliente não pode ser alterado
                  <div className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{selectedAppointment.client?.name}</div>
                        {selectedAppointment.client?.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedAppointment.client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Campo editável para novo agendamento
                  <div className="relative" ref={clientDropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={clientFilter}
                        onChange={(e) => {
                          setClientFilter(e.target.value);
                          setIsClientDropdownOpen(true);
                        }}
                        onFocus={() => setIsClientDropdownOpen(true)}
                        placeholder="Buscar cliente..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    
                    {isClientDropdownOpen && filteredClients && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setNewAppointment({ ...newAppointment, client_id: client.id });
                              setClientFilter(client.name);
                              setIsClientDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
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

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Serviço
                </label>
                <select
                  value={newAppointment.service_id}
                  onChange={(e) => {
                    const selectedService = services.find(s => s.id === e.target.value);
                    setNewAppointment({
                      ...newAppointment,
                      service_id: e.target.value,
                      service: selectedService?.name || null,
                      price: selectedService?.price?.toString() || '0.00',
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecione um serviço</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - R$ {service.price} ({service.duration}min)
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
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
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
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
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
                  value={newAppointment.price}
                  onChange={(e) => setNewAppointment({ ...newAppointment, price: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Duration Preview */}
              {newAppointment.time && newAppointment.service_id && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Duração: {newAppointment.time} até {calculateEndTime(
                        newAppointment.time,
                        services.find(s => s.id === newAppointment.service_id)?.duration || '0'
                      )}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    clearAppointmentForm();
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending || !newAppointment.client_id}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {(createAppointmentMutation.isPending || updateAppointmentMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isEditMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteAppointmentMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteAppointmentMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;