import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment, Client, Service } from '../lib/types';
import { Calendar as CalendarIcon, Clock, User, Plus, Loader2, Send, Trash2, Edit2, Search, DollarSign, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addMinutes, parseISO, isWithinInterval } from 'date-fns';
import { useAuthStore } from '../store/authStore';

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [businessHours, setBusinessHours] = useState({
    start: '08:00',
    end: '20:00',
  });
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
      setIsModalOpen(false); // Fecha o modal principal também
      setSelectedAppointment(null); // Limpa o appointment selecionado
      setIsEditMode(false); // Reseta o modo de edição
      clearAppointmentForm(); // Limpa o formulário
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
  const handleDateSelect = (selectInfo: any) => {
    clearAppointmentForm(); // Limpar campos antes de abrir
    setNewAppointment({
      client_id: '',
      service_id: '',
      service: '',
      date: format(selectInfo.start, 'yyyy-MM-dd'),
      time: format(selectInfo.start, 'HH:mm'),
      price: '0.00',
    });
    setIsEditMode(false);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    const appointment = appointments?.find(apt => apt.id === event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setNewAppointment({
        client_id: appointment.client_id,
        service_id: appointment.service_id,
        service: appointment.service,
        date: appointment.date,
        time: appointment.time,
        price: appointment.price?.toString() || '0.00',
      });
      setIsEditMode(true);
      setIsModalOpen(true);
    }
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
        setIsModalOpen(false);
        setSelectedAppointment(null);
        setIsEditMode(false);
        clearAppointmentForm();
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

  // Calendar events
  const events = appointments?.map(appointment => {
    const startTime = parseISO(`${appointment.date}T${appointment.time}`);
    const service = services?.find(s => s.id === appointment.service_id);
    const endTime = service ? addMinutes(startTime, parseInt(service.duration)) : startTime;

    return {
      id: appointment.id,
      title: `${appointment.client?.name} - ${appointment.service_details?.name}`,
      start: startTime,
      end: endTime,
      className: `status-${appointment.status}`,
      extendedProps: {
        appointment,
      },
    };
  }) || [];

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
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Agenda</h2>
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
        <div className="h-[400px] sm:h-[600px]">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            slotMinTime={businessHours.start}
            slotMaxTime={businessHours.end}
            locale="pt-br"
            allDaySlot={false}
            editable={false}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            businessHours={{
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              startTime: businessHours.start,
              endTime: businessHours.end,
            }}
            height="100%"
          />
        </div>
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              {isEditMode && selectedAppointment && (
                <button
                  onClick={() => handleDelete(selectedAppointment.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Excluir agendamento"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
            
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

      <style>{`
        .status-pending { background-color: #FEF3C7; border-color: #F59E0B; color: #000000 !important; }
        .status-confirmed { background-color: #D1FAE5; border-color: #10B981; color: #000000 !important; }
        .status-cancelled { background-color: #FEE2E2; border-color: #EF4444; color: #000000 !important; }

        .dark .status-pending { background-color: #78350F; border-color: #F59E0B; color: #FFFFFF !important; }
        .dark .status-confirmed { background-color: #064E3B; border-color: #10B981; color: #FFFFFF !important; }
        .dark .status-cancelled { background-color: #7F1D1D; border-color: #EF4444; color: #FFFFFF !important; }

        /* Force text color for all FullCalendar event elements */
        .fc-event-title { color: #000000 !important; }
        .fc-event-time { color: #000000 !important; }
        .fc-event { color: #000000 !important; }
        .dark .fc-event-title { color: #FFFFFF !important; }
        .dark .fc-event-time { color: #FFFFFF !important; }
        .dark .fc-event { color: #FFFFFF !important; }

        .fc { height: 100%; }
        .fc-theme-standard td { border: 1px solid #E5E7EB; }
        .dark .fc-theme-standard td { border-color: #374151; }
        .fc-theme-standard th { border: 1px solid #E5E7EB; background: #F3F4F6; }
        .dark .fc-theme-standard th { border-color: #374151; background: #1F2937; }
        .fc-theme-standard .fc-scrollgrid { border: 1px solid #E5E7EB; }
        .dark .fc-theme-standard .fc-scrollgrid { border-color: #374151; }
        .fc-theme-standard td.fc-today { background: #EFF6FF; }
        .dark .fc-theme-standard td.fc-today { background: #1E3A8A; }
        .fc-day-today { background: #EFF6FF !important; }
        .dark .fc-day-today { background: #1E3A8A !important; }
        .fc-button { background: #F3F4F6 !important; border: 1px solid #E5E7EB !important; color: #374151 !important; }
        .dark .fc-button { background: #374151 !important; border-color: #4B5563 !important; color: #F3F4F6 !important; }
        .fc-button-active { background: #2563EB !important; color: white !important; }
        .dark .fc-button-active { background: #1D4ED8 !important; }
        .fc-timegrid-slot { height: 48px !important; }
      `}</style>
    </div>
  );
}

export default Dashboard;