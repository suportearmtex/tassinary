import React, { useState } from 'react';
import { QrCode, RefreshCw, Smartphone, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { MessageTemplate, EvolutionInstance } from '../lib/types';
import toast from 'react-hot-toast';

const messageTypes = {
  confirmation: 'Confirmação',
  reminder_24h: 'Lembrete 24h',
  reminder_1h: 'Lembrete 1h',
  cancellation: 'Cancelamento',
};

const variablesList = [
  { name: '{name}', description: 'Nome do cliente' },
  { name: '{email}', description: 'Email do cliente' },
  { name: '{date}', description: 'Data do agendamento' },
  { name: '{service}', description: 'Nome do serviço' },
  { name: '{time}', description: 'Horário do agendamento' },
];

function WhatsApp() {
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: instance, isLoading: isLoadingInstance, error: instanceError } = useQuery({
    queryKey: ['evolution-instance'],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Evolution instance');
        }

        const data = await response.json();
        if (data && !data.status?.includes('connected')) {
          setShowQrCode(true);
        }
        return data;
      } catch (error) {
        console.error('Error fetching Evolution instance:', error);
        throw error;
      }
    },
    refetchInterval: 15000,
    retry: 1,
  });

  const createInstanceMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'create' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create instance');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instance'] });
      setIsConfigureModalOpen(false);
      toast.success('Instância WhatsApp criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Create instance error:', error);
      toast.error(`Erro ao criar instância WhatsApp: ${error.message}`);
    },
  });

  const deleteInstanceMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete instance');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instance'] });
      setIsDeleteModalOpen(false);
      toast.success('Instância WhatsApp excluída com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Delete instance error:', error);
      toast.error(`Erro ao excluir instância WhatsApp: ${error.message}`);
    },
  });

  const refreshQrCodeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-api`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'refresh' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh QR code');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instance'] });
      toast.success('QR Code atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Refresh QR code error:', error);
      toast.error(`Erro ao atualizar QR Code: ${error.message}`);
    },
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('type');

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: MessageTemplate) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update({ content: template.content })
        .eq('id', template.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      setEditingTemplate(null);
      toast.success('Modelo de mensagem atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar modelo de mensagem');
    },
  });

  const handleRefreshQrCode = () => {
    refreshQrCodeMutation.mutate();
  };

  const handleDeleteInstance = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteInstance = () => {
    deleteInstanceMutation.mutate();
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      await updateTemplateMutation.mutateAsync(editingTemplate);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-red-500';
      case 'connecting':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Dispositivo conectado';
      case 'disconnected':
        return 'Dispositivo desconectado';
      case 'connecting':
        return 'Conectando...';
      default:
        return 'Status desconhecido';
    }
  };

  if (instanceError) {
    console.error('Instance error:', instanceError);
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conexão WhatsApp
            </h2>
            <div className="flex gap-2">
              {!instance && (
                <button
                  onClick={() => setIsConfigureModalOpen(true)}
                  disabled={createInstanceMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createInstanceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Configurar WhatsApp
                </button>
              )}
              {instance && !instance.status?.includes('connected') && (
                <button
                  onClick={() => setShowQrCode(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  Exibir QR Code
                </button>
              )}
              {instance && showQrCode && (
                <button
                  onClick={handleRefreshQrCode}
                  disabled={isLoadingInstance || refreshQrCodeMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${(isLoadingInstance || refreshQrCodeMutation.isPending) ? 'animate-spin' : ''}`} />
                  Atualizar QR
                </button>
              )}
              {instance && (
                <button
                  onClick={handleDeleteInstance}
                  disabled={deleteInstanceMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            {isLoadingInstance || refreshQrCodeMutation.isPending ? (
              <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
            ) : instance?.qr_code && showQrCode && !instance.status?.includes('connected') ? (
              <img
                src={instance.qr_code}
                alt="WhatsApp QR Code"
                className="w-48 h-48 object-contain"
              />
            ) : (
              <QrCode className="w-48 h-48 text-gray-400" />
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              {isLoadingInstance || refreshQrCodeMutation.isPending
                ? 'Carregando...'
                : !instance
                ? 'Configure o WhatsApp para começar'
                : instance.status?.includes('connected')
                ? 'WhatsApp conectado'
                : showQrCode
                ? 'Escaneie o código QR com seu WhatsApp para conectar'
                : 'Clique em "Exibir QR Code" para conectar'}
            </p>
          </div>
          {instance && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <Smartphone className={`w-4 h-4 ${getStatusColor(instance.status)}`} />
              <span className={`font-medium ${getStatusColor(instance.status)}`}>
                {getStatusText(instance.status)}
              </span>
            </div>
          )}
        </div>

        {/* Messages Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Mensagens Automáticas
          </h2>
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {templates?.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {messageTypes[template.type]}
                  </h3>
                  {editingTemplate?.id === template.id ? (
                    <form onSubmit={handleSaveTemplate} className="space-y-4">
                      <textarea
                        value={editingTemplate.content}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            content: e.target.value,
                          })
                        }
                        className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Variáveis disponíveis:
                          <div className="flex flex-wrap gap-2 mt-1">
                            {variablesList.map((variable) => (
                              <span
                                key={variable.name}
                                title={variable.description}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs cursor-help"
                              >
                                {variable.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTemplate(null)}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={updateTemplateMutation.isPending}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {updateTemplateMutation.isPending && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            <Save className="w-3 h-3" />
                            Salvar
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line mb-4">
                        {template.content}
                      </p>
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="text-blue-600 text-sm font-medium hover:text-blue-800 dark:hover:text-blue-400"
                      >
                        Editar mensagem
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Configure Instance Modal */}
      {isConfigureModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Configurar WhatsApp
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Ao configurar uma nova instância do WhatsApp, você poderá conectar seu número e enviar mensagens automáticas para seus clientes.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsConfigureModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => createInstanceMutation.mutate()}
                disabled={createInstanceMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {createInstanceMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Criar Instância
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Instance Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Excluir Instância
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir esta instância do WhatsApp? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteInstance}
                disabled={deleteInstanceMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {deleteInstanceMutation.isPending && (
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

export default WhatsApp;