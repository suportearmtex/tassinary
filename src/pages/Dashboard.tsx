import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment, Client, Service } from '../lib/types';
import { Calendar as CalendarIcon, Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addMinutes, parseISO, isWithinInterval } from 'date-fns';

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [businessHours, setBusinessHours] = useState({
    start: '08:00',
    end: '20:00',
  });
  const [newAppointment, setNewAppointment] = useState({
    client_id: '',
    service_id: '',
    service: '',
    date: '',
    time: '',
  });

  const queryClient = useQueryClient();

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(*),
          service_details:services(*)
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as (Appointment & { client: Client; service_details: Service })[];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
  });

  const checkAppointmentOverlap = (newStart: Date, duration: number) => {
    const newEnd = addMinutes(newStart, duration);
    
    return appointments?.some(appointment => {
      if (appointment.date !== format(newStart, 'yyyy-MM-dd')) return false;
      
      const existingStart = parseISO(`${appointment.date}T${appointment.time}`);
      const existingEnd = addMinutes(existingStart, parseInt(appointment.service_details?.duration || '0'));
      
      return (
        isWithinInterval(newStart, { start: existingStart, end: existingEnd }) ||
        isWithinInterval(newEnd, { start: existingStart, end: existingEnd }) ||
        isWithinInterval(existingStart, { start: newStart, end: newEnd })
      );
    });
  };

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: typeof newAppointment) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const selectedService = services?.find(s => s.id === appointmentData.service_id);
      if (!selectedService) {
        throw new Error('Serviço não encontrado');
      }

      const startTime = parseISO(`${appointmentData.date}T${appointmentData.time}`);
      const duration = parseInt(selectedService.duration);
      const endTime = addMinutes(startTime, duration);

      // Check for overlapping appointments
      const hasOverlap = appointments?.some(appointment => {
        if (appointment.date !== appointmentData.date) return false;

        const existingStart = parseISO(`${appointment.date}T${appointment.time}`);
        const existingService = services?.find(s => s.id === appointment.service_id);
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

      const { data, error } = await supabase
        .from('appointments')
        .insert([{ 
          ...appointmentData, 
          status: 'pending',
          user_id: user.id // Add user_id to satisfy RLS policy
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsModalOpen(false);
      setNewAppointment({ client_id: '', service_id: '', service: '', date: '', time: '' });
      toast.success('Agendamento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const events = appointments?.map(appointment => {
    const startTime = `${appointment.date}T${appointment.time}`;
    const duration = parseInt(appointment.service_details?.duration || '0');
    const endTime = format(
      addMinutes(parseISO(startTime), duration),
      "yyyy-MM-dd'T'HH:mm:ss"
    );

    return {
      id: appointment.id,
      title: `${appointment.client?.name} - ${appointment.service_details?.name}`,
      start: startTime,
      end: endTime,
      className: `status-${appointment.status}`,
      extendedProps: {
        client: appointment.client,
        service: appointment.service_details,
        status: appointment.status,
      },
    };
  }) || [];

  const handleDateSelect = (selectInfo: any) => {
    setNewAppointment({
      ...newAppointment,
      date: format(selectInfo.start, 'yyyy-MM-dd'),
      time: format(selectInfo.start, 'HH:mm'),
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event;
    toast(
      <div>
        <p className="font-semibold">{event.title}</p>
        <p>{format(event.start, 'dd/MM/yyyy HH:mm')}</p>
        <p>Duração: {event.extendedProps.service?.duration} minutos</p>
        <p>Status: {event.extendedProps.status}</p>
      </div>,
      {
        duration: 3000,
        position: 'bottom-right',
      }
    );
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    const selectedService = services?.find(service => service.id === serviceId);
    setNewAppointment({
      ...newAppointment,
      service_id: serviceId,
      service: selectedService?.name || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAppointmentMutation.mutate(newAppointment);
  };

  const stats = [
    {
      label: 'Agendamentos Hoje',
      value: appointments?.filter(
        (apt) => apt.date === format(new Date(), 'yyyy-MM-dd')
      ).length || 0,
    },
    {
      label: 'Confirmados',
      value: appointments?.filter((apt) => apt.status === 'confirmed').length || 0,
    },
    {
      label: 'Pendentes',
      value: appointments?.filter((apt) => apt.status === 'pending').length || 0,
    },
    {
      label: 'Cancelados',
      value: appointments?.filter((apt) => apt.status === 'cancelled').length || 0,
    },
  ];

  return (
    <div className="p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
          >
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Calendar Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Calendário de Agendamentos
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Início:</label>
              <input
                type="time"
                value={businessHours.start}
                onChange={(e) => setBusinessHours({ ...businessHours, start: e.target.value })}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Fim:</label>
              <input
                type="time"
                value={businessHours.end}
                onChange={(e) => setBusinessHours({ ...businessHours, end: e.target.value })}
                className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
          </div>
        </div>
        {isLoadingAppointments ? (
          <div className="h-[600px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="h-[600px]">
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
            />
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Novo Agendamento
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cliente
                  </label>
                  <select
                    required
                    value={newAppointment.client_id}
                    onChange={(e) =>
                      setNewAppointment({
                        ...newAppointment,
                        client_id: e.target.value,
                      })
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Serviço
                  </label>
                  <select
                    required
                    value={newAppointment.service_id}
                    onChange={handleServiceChange}
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Selecione um serviço</option>
                    {services?.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {service.duration} minutos
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={newAppointment.date}
                    onChange={(e) =>
                      setNewAppointment({
                        ...newAppointment,
                        date: e.target.value,
                      })
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Horário
                  </label>
                  <input
                    type="time"
                    required
                    value={newAppointment.time}
                    onChange={(e) =>
                      setNewAppointment({
                        ...newAppointment,
                        time: e.target.value,
                      })
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAppointmentMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {createAppointmentMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .status-pending { background-color: #FEF3C7; border-color: #F59E0B; }
        .status-confirmed { background-color: #D1FAE5; border-color: #10B981; }
        .status-cancelled { background-color: #FEE2E2; border-color: #EF4444; }

        .dark .status-pending { background-color: #78350F; border-color: #F59E0B; }
        .dark .status-confirmed { background-color: #064E3B; border-color: #10B981; }
        .dark .status-cancelled { background-color: #7F1D1D; border-color: #EF4444; }

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