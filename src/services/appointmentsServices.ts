// src/services/appointmentsServices.ts
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, addMinutes, format, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Appointment, Client, Service } from '../lib/types';
import toast from 'react-hot-toast';

// Função para sincronizar com Google Calendar
const syncWithGoogleCalendar = async (appointment: any, operation: 'create' | 'update' | 'delete') => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No session');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-google-calendar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointment, operation }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync with Google Calendar');
  }

  return response.json();
};

// Tipos específicos para appointments
interface FormAppointment {
  client_id: string;
  service_id: string;
  service: string | null;
  date: string;
  time: string;
  price: string;
}

interface AppointmentFilters {
  search: string;
  status: 'all' | 'pending' | 'confirmed' | 'cancelled';
  dateRange: {
    start: string;
    end: string;
  };
}

// Hook principal para appointments
export const useAppointmentsServices = (userId?: string) => {
  const queryClient = useQueryClient();
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Estados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState<FormAppointment>({
    client_id: '',
    service_id: '',
    service: null,
    date: '',
    time: '',
    price: '0.00',
  });

  const [filters, setFilters] = useState<AppointmentFilters>({
    search: '',
    status: 'all',
    dateRange: {
      start: '',
      end: '',
    },
  });

  // Queries
  const appointments = useQuery({
    queryKey: ['appointments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!userId,
  });

  const clients = useQuery({
    queryKey: ['clients', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!userId,
  });

  const services = useQuery({
    queryKey: ['services', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!userId,
  });

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
      const selectedService = services.data?.find(s => s.id === appointment.service_id);
      if (!selectedService) {
        throw new Error('Serviço não encontrado');
      }

      const startTime = parseISO(`${appointment.date}T${appointment.time}`);
      const duration = parseInt(selectedService.duration);
      const endTime = addMinutes(startTime, duration);

      // Check for overlapping appointments
      const hasOverlap = appointments.data?.some(existingAppointment => {
        if (existingAppointment.date !== appointment.date) return false;

        const existingStart = parseISO(`${existingAppointment.date}T${existingAppointment.time}`);
        const existingService = services.data?.find(s => s.id === existingAppointment.service_id);
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
        user_id: userId,
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
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      setIsModalOpen(false);
      clearAppointmentForm();
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, ...appointment }: { id: string } & Partial<FormAppointment>) => {
      // Buscar appointment original para preservar dados de sincronização
      const { data: originalAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, client:clients(*), service_details:services(*)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const updateData: any = {};
      
      if (appointment.service_id) {
        const selectedService = services.data?.find(s => s.id === appointment.service_id);
        if (selectedService) {
          updateData.service_id = appointment.service_id;
          updateData.service = selectedService.name;
          updateData.price = appointment.price ? parseFloat(appointment.price) : selectedService.price;
        }
      }

      if (appointment.date) updateData.date = appointment.date;
      if (appointment.time) updateData.time = appointment.time;
      if (appointment.price) updateData.price = typeof appointment.price === 'string' ? 
        parseFloat(appointment.price) : appointment.price;

      // Atualizar no banco de dados
      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
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
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
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
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      toast.success('Agendamento excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-appointment-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appointment_id: id, message_type: type }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
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
        setIsDeleteModalOpen(false);
        setAppointmentToDelete(null);
      } catch (error) {
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
    const appointment = appointments.data?.find(apt => apt.id === id);
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

  const clearAppointmentForm = () => {
    setNewAppointment({
      client_id: '',
      service_id: '',
      service: null,
      date: '',
      time: '',
      price: '0.00',
    });
    setClientFilter('');
  };

  const updateFilter = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dateRange: { start: '', end: '' },
    });
  };

  // Fechar dropdown ao clicar fora
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

  // Filter clients based on search
  const filteredClients = clients.data?.filter(client =>
    client.name.toLowerCase().includes(clientFilter.toLowerCase())
  );

  // Filter appointments
  const filteredAppointments = appointments.data?.filter(appointment => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesClient = appointment.client?.name.toLowerCase().includes(searchLower);
      const matchesService = appointment.service_details?.name.toLowerCase().includes(searchLower);
      if (!matchesClient && !matchesService) return false;
    }

    // Status filter
    if (filters.status !== 'all' && appointment.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start && appointment.date < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && appointment.date > filters.dateRange.end) {
      return false;
    }

    return true;
  });

  return {
    // Estados
    isModalOpen,
    setIsModalOpen,
    isEditMode,
    setIsEditMode,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    selectedAppointment,
    setSelectedAppointment,
    appointmentToDelete,
    setAppointmentToDelete,
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
    appointments: filteredAppointments || [],
    allAppointments: appointments.data || [],
    clients: clients.data || [],
    services: services.data || [],
    filteredClients: filteredClients || [],
    
    // Loading states
    isLoadingAppointments: appointments.isLoading,
    isLoadingClients: clients.isLoading,
    isLoadingServices: services.isLoading,
    
    // Mutations
    createAppointmentMutation,
    updateAppointmentMutation,
    deleteAppointmentMutation,
    sendMessageMutation,
    
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
  };
};