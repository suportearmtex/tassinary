// Crie este arquivo e cole EXATAMENTE este código:
import React, { useState } from 'react';
import { Key, Plus, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
}

function ApiKeysManager() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState('WhatsApp Integration');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys', user?.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const result = await response.json();
      return result.data as ApiKey[];
    },
    enabled: !!user?.id,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', user?.id] });
      setIsCreateModalOpen(false);
      setNewKeyName('WhatsApp Integration');
      toast.success('API key criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar API key');
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys?id=${keyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', user?.id] });
      setIsDeleteModalOpen(false);
      setKeyToDelete(null);
      toast.success('API key deletada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao deletar API key');
    },
  });

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast.success('API key copiada!');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Keys para n8n
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gerencie suas chaves de API para integração com n8n
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova API Key
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="p-6">
        {!apiKeys || apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma API key encontrada
            </h4>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Crie uma API key para conectar com o n8n
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar primeira API key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {apiKey.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        apiKey.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {apiKey.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-sm font-mono">
                        {apiKey.api_key.substring(0, 16)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(apiKey.api_key, apiKey.id)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {copiedKey === apiKey.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <p>Criada: {formatDate(apiKey.created_at)}</p>
                      <p>Último uso: {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Nunca'}</p>
                      <p>Usos: {apiKey.usage_count}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setKeyToDelete(apiKey);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Criar Nova API Key
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome da API Key
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ex: WhatsApp Integration"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => createApiKeyMutation.mutate(newKeyName)}
                disabled={createApiKeyMutation.isPending || !newKeyName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createApiKeyMutation.isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && keyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Deletar API Key
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja deletar a API key "{keyToDelete.name}"? 
              Esta ação não pode ser desfeita e irá quebrar integrações existentes.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteApiKeyMutation.mutate(keyToDelete.id)}
                disabled={deleteApiKeyMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteApiKeyMutation.isPending ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeysManager;