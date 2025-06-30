import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment, Client, Service } from '../lib/types';
import { Calendar, Clock, User, Plus, Loader2, Send, Trash2, Edit2, Search, DollarSign, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addMinutes, parseISO, isWithinInterval, addDays } from 'date-fns';
import { useAuthStore } from '../store/authStore';

function Appointments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [clientFilter, setClientFilter] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    client_id: '',
    service_id: '',
    service: '',
    date: '',
    time: '',
    price: '0.00',
  });

  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Função para limpar campos do formulário
  const clearAppointmentForm = () => {
    setNewAppointment({
      client_id: '',
      service_id: '',
      service: '',
      date: '',
      time: '',
      price: '0.00',
    });
    setClientFilter('');
    setIsClientDropdownOpen(false);
  };

  // Função para sincronizar com o Google Calendar
  const syncWithGoogleCalendar = async (appointment: any, operation: 'create' | 'update' | 'delete') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Para operações de update e delete, verificar se o appointment está sincronizado
      if ((operation === 'update' || operation === 'delete') && !appointment.google_event_id) {
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

  // Queries
  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(*),
          service_details:services(*)
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user?.id,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients', user?.id],
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

  const { data: services } = useQuery({
    queryKey: ['services', user?.id],
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

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
      const selectedService = services?.find(s => s.id === appointment.service_id);
      if (!selectedService) {
        throw new Error('Serviço não encontrado');
      }

      const startTime = parseISO(`${appointment.date}T${appointment.time}`);
      const duration = parseInt(selectedService.duration);
      const endTime = addMinutes(startTime, duration);

      // Check for overlapping appointments
      const hasOverlap = appointments?.some(existingAppointment => {
        if (existingAppointment.date !== appointment.date) return false;

        const existingStart = parseISO(`${existingAppointment.date}T${existingAppointment.time}`);
        const existingService = services?.find(s => s.id === existingAppointment.service_id);
        if (!existingService) return false;

        const existingEnd = addMinutes(existingStart, parseInt(existingService.duration));

        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        );
      });

      if (hasOverlap) {
        throw new Error('Já existe um agendamento neste horário');
      }

      const appointmentData = {
        ...appointment,
        user_id: user?.id,
        status: 'pending' as const,
        price: typeof appointment.price === 'string' ? parseFloat(appointment.price) : appointment.price,
        is_synced_to_google: false
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select(`
          *,
          client:clients(*),
          service_details:services(*)
        `)
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
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      setIsModalOpen(false);
      clearAppointmentForm();
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async (appointment: Partial<Appointment> & { id: string }) => {
      const selectedService = services?.find(s => s.id === appointment.service_id);
      if (!selectedService) {
        throw new Error('Serviço não encontrado');
      }

      const startTime = parseISO(`${appointment.date}T${appointment.time}`);
      const duration = parseInt(selectedService.duration);
      const endTime = addMinutes(startTime, duration);

      // Check for overlapping appointments
      const hasOverlap = appointments?.some(existingAppointment => {
        if (existingAppointment.id === appointment.id) return false;
        if (existingAppointment.date !== appointment.date) return false;

        const existingStart = parseISO(`${existingAppointment.date}T${existingAppointment.time}`);
        const existingService = services?.find(s => s.id === existingAppointment.service_id);
        if (!existingService) return false;

        const existingEnd = addMinutes(existingStart, parseInt(existingService.duration));

        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        );
      });

      if (hasOverlap) {
        throw new Error('Já existe um agendamento neste horário');
      }

      // Primeiro buscar o appointment original para preservar o google_event_id
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('id', appointment.id)
        .single();

      if (fetchError) throw fetchError;

      const updateData = {
        ...appointment,
        price: typeof appointment.price === 'string' ? parseFloat(appointment.price) : appointment.price
      };

      // Atualizar no banco de dados
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id)
        .select(`
          *,
          client:clients(*),
          service_details:services(*)
        `)
        .single();

      if (error) throw error;

      // Criar o objeto completo para sincronização, preservando google_event_id
      const appointmentForSync = {
        ...data,
        google_event_id: originalAppointment.google_event_id,
        is_synced_to_google: originalAppointment.is_synced_to_google
      };

      // Sync with Google Calendar apenas se estiver sincronizado
      if (originalAppointment.is_synced_to_google && originalAppointment.google_event_id) {
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
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      setIsModalOpen(false);
      setSelectedAppointment(null);
      setIsEditMode(false);
      clearAppointmentForm();
      toast.success('Agendamento atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro buscar o appointment original para preservar dados de sincronização
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!originalAppointment) throw new Error('Appointment not found');

      // Sync with Google Calendar first (apenas se sincronizado)
      if (originalAppointment.is_synced_to_google && originalAppointment.google_event_id) {
        try {
          await syncWithGoogleCalendar(originalAppointment, 'delete');
        } catch (error) {
          console.error('Failed to sync deletion with Google Calendar:', error);
          toast.error('Erro ao remover evento do Google Calendar');
        }
      }

      // Deletar do banco de dados
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      toast.error('Erro ao excluir agendamento');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'cancellation' }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: id,
          type,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return { id, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      const messageType = data.type === 'confirmation' ? 'confirmação' : 
                         data.type === 'reminder_24h' ? 'lembrete (24h)' :
                         data.type === 'reminder_1h' ? 'lembrete (1h)' : 'cancelamento';
      toast.success(`Mensagem de ${messageType} enviada com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Event handlers
  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewAppointment({
      client_id: appointment.client_id,
      service_id: appointment.service_id,
      service: appointment.service,
      date: appointment.date,
      time: appointment.time,
      price: appointment.price?.toString() || '0.00',
    });
    setClientFilter(appointment.client?.name || '');
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setAppointmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (appointmentToDelete) {
      try {
        await deleteAppointmentMutation.mutateAsync(appointmentToDelete);
        // Fecha os modais manualmente após sucesso
        setIsDeleteModalOpen(false);
        setAppointmentToDelete(null);
      } catch (error) {
        // Fecha o modal mesmo em caso de erro
        setIsDeleteModalOpen(false);
        setAppointmentToDelete(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && selectedAppointment) {
      await updateAppointmentMutation.mutateAsync({
        id: selectedAppointment.id,
        ...newAppointment,
      });
    } else {
      await createAppointmentMutation.mutateAsync(newAppointment);
    }
  };

  const handleSendMessage = async (id: string, type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'cancellation') => {
    const appointment = appointments?.find(apt => apt.id === id);
    if (!appointment?.messages_sent?.[type as keyof typeof appointment.messages_sent]) {
      await sendMessageMutation.mutateAsync({ id, type });
    }
  };

  const calculateEndTime = (startTime: string, duration: string) => {
    if (!startTime || !duration) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const durationMinutes = parseInt(duration);
    
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Filter clients based on search
  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(clientFilter.toLowerCase())
  );

  if (isLoadingAppointments) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agendamentos</h2>
            <button
              onClick={() => {
                clearAppointmentForm(); // Limpar campos antes de abrir
                setIsEditMode(false);
                setSelectedAppointment(null);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            {appointments?.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {appointment.client?.name}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
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
                      onClick={() => handleEdit(appointment)}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(appointment.id)}
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
                      onClick={() => handleSendMessage(appointment.id, 'confirmation')}
                      disabled={appointment.messages_sent?.confirmation}
                      className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
                        appointment.messages_sent?.confirmation
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      {appointment.messages_sent?.confirmation ? 'Enviado' : 'Confirmação'}
                    </button>
                    <button
                      onClick={() => handleSendMessage(appointment.id, 'reminder_24h')}
                      disabled={appointment.messages_sent?.reminder_24h}
                      className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
                        appointment.messages_sent?.reminder_24h
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      {appointment.messages_sent?.reminder_24h ? 'Enviado' : 'Lembrete (24h)'}
                    </button>
                    <button
                      onClick={() => handleSendMessage(appointment.id, 'reminder_1h')}
                      disabled={appointment.messages_sent?.reminder_1h}
                      className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
                        appointment.messages_sent?.reminder_1h
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      {appointment.messages_sent?.reminder_1h ? 'Enviado' : 'Lembrete (1h)'}
                    </button>
                    <button
                      onClick={() => handleSendMessage(appointment.id, 'cancellation')}
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
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Modal */}
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

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Serviço
                </label>
                <select
                  value={newAppointment.service_id}
                  onChange={(e) => {
                    const selectedService = services?.find(s => s.id === e.target.value);
                    setNewAppointment({
                      ...newAppointment,
                      service_id: e.target.value,
                      price: selectedService?.price?.toString() || '0.00',
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Selecione um serviço</option>
                  {services?.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.duration}min - R$ {service.price}
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
                        services?.find(s => s.id === newAppointment.service_id)?.duration || '0'
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
                    setSelectedAppointment(null);
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setAppointmentToDelete(null);
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteAppointmentMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteAppointmentMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;