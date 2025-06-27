export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}
export interface ApiKey {
  id: string;
  user_id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  usage_count: number;
}
export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  created_at: string;
  updated_at: string;
}
export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  service: string;
  date: string;
  time: string;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  google_event_id?: string | null; // CORRIGIDO: permitir null
  is_synced_to_google: boolean;
  created_at: string;
  updated_at: string;
  client?: Client;
  service_details?: Service;
  messages_sent?: {
    confirmation?: boolean;
    reminder?: boolean;
    cancellation?: boolean;
  };
}
export interface MessageTemplate {
  id: string;
  type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'cancellation';
  content: string;
  created_at: string;
  updated_at: string;
}

export interface EvolutionInstance {
  id: string;
  user_id: string;
  instance_name: string;
  qr_code: string | null;
  jid: string | null; // ✅ ADICIONADO: Campo para armazenar o JID do WhatsApp
  status: string;
  created_at: string;
  updated_at: string;
}