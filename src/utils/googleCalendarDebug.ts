export const debugGoogleCalendarSync = (appointment: any, operation: string) => {
  console.group(`🔧 Google Calendar Debug - ${operation.toUpperCase()}`);
  console.log('Appointment ID:', appointment?.id);
  console.log('Google Event ID:', appointment?.google_event_id);
  console.log('Is Synced:', appointment?.is_synced_to_google);
  console.log('Client:', appointment?.client?.name);
  console.log('Service:', appointment?.service_details?.name);
  console.log('Date/Time:', `${appointment?.date} ${appointment?.time}`);
  
  if (operation === 'update' && !appointment?.google_event_id) {
    console.error('❌ ERRO: google_event_id não encontrado para operação de update');
  }
  
  if (operation === 'delete' && !appointment?.google_event_id) {
    console.warn('⚠️ AVISO: Tentando deletar appointment não sincronizado');
  }
  
  console.groupEnd();
};