// src/types/dashboard.ts

export interface DashboardStats {
  totalAppointments: number;
  todayAppointments: number;
  tomorrowAppointments: number;
  totalRevenue: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  averageServiceTime: number;
  topService: string;
  clientsTotal: number;
  servicesTotal: number;
}

export interface AppointmentFormData {
  client_id: string;
  service_id: string;
  date: string;
  time: string;
  price: string;
  notes?: string;
}

export interface BusinessHours {
  start: string;
  end: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  className: string;
  extendedProps: {
    appointment: any; // Usar o tipo Appointment da lib/types
  };
}

export interface QuickActionButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
}

export interface DashboardFilters {
  dateRange: {
    start: string;
    end: string;
  };
  status: 'all' | 'scheduled' | 'completed' | 'cancelled';
  service: string;
  client: string;
}

export interface MessageTemplate {
  id: string;
  type: 'confirmation' | 'reminder' | 'followup';
  template: string;
  isActive: boolean;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  appointment?: any; // Usar o tipo Appointment da lib/types
}

export interface DashboardUIState {
  selectedView: 'calendar' | 'list';
  calendarView: 'month' | 'week' | 'day';
  sidebarCollapsed: boolean;
  showStatsPanel: boolean;
}

export interface DashboardPermissions {
  canCreateAppointments: boolean;
  canEditAppointments: boolean;
  canDeleteAppointments: boolean;
  canSendMessages: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

export interface NotificationSettings {
  emailReminders: boolean;
  whatsappReminders: boolean;
  pushNotifications: boolean;
  reminderTiming: number; // em horas antes do agendamento
}

export interface DashboardMetrics {
  conversionRate: number;
  averageBookingValue: number;
  customerRetentionRate: number;
  noShowRate: number;
  popularTimeSlots: string[];
  peakDays: string[];
  seasonalTrends: {
    month: string;
    revenue: number;
    appointments: number;
  }[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booked: boolean;
  appointment?: any; // Usar o tipo Appointment da lib/types
}

export interface DaySchedule {
  date: string;
  timeSlots: TimeSlot[];
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
}

export interface WeeklySchedule {
  week: string;
  days: DaySchedule[];
  totalRevenue: number;
  totalAppointments: number;
}

export interface ClientInsight {
  clientId: string;
  name: string;
  totalAppointments: number;
  totalSpent: number;
  lastVisit: string;
  preferredServices: string[];
  averageRating: number;
  loyaltyScore: number;
}

export interface ServicePerformance {
  serviceId: string;
  name: string;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  popularityTrend: 'up' | 'down' | 'stable';
  profitMargin: number;
}

export interface DashboardExportData {
  appointments: any[]; // Usar o tipo Appointment da lib/types
  clients: any[]; // Usar o tipo Client da lib/types
  services: any[]; // Usar o tipo Service da lib/types
  revenue: number;
  period: {
    start: string;
    end: string;
  };
}