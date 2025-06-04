import React, { useState } from 'react';
import { Clock, Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

function Services() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    duration: 60,
  });

  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!user?.id,
  });

  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('services')
        .insert([{ ...serviceData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', user?.id] });
      setIsModalOpen(false);
      setNewService({ name: '', duration: 60 });
      toast.success('Serviço criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar serviço');
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (service: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(service)
        .eq('id', service.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', user?.id] });
      setIsModalOpen(false);
      setSelectedService(null);
      setIsEditMode(false);
      toast.success('Serviço atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar serviço');
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', user?.id] });
      setIsDeleteModalOpen(false);
      setServiceToDelete(null);
      toast.success('Serviço excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir serviço');
    },
  });

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setNewService({
      name: service.name,
      duration: service.duration,
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setServiceToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (serviceToDelete) {
      await deleteServiceMutation.mutateAsync(serviceToDelete);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && selectedService) {
      await updateServiceMutation.mutateAsync({
        id: selectedService.id,
        ...newService,
      });
    } else {
      await createServiceMutation.mutateAsync(newService);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Serviços</h2>
            <button
              onClick={() => {
                setIsEditMode(false);
                setSelectedService(null);
                setNewService({ name: '', duration: 60 });
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Serviço
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {services?.map((service) => (
            <div key={service.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.name}
                  </h3>
                  <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.duration} minutos
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {services?.length === 0 && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Nenhum serviço cadastrado
            </div>
          )}
        </div>
      </div>

      {/* Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {isEditMode ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Serviço
                  </label>
                  <input
                    type="text"
                    required
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Duração (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    required
                    value={newService.duration}
                    onChange={(e) =>
                      setNewService({ ...newService, duration: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setSelectedService(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(createServiceMutation.isPending || updateServiceMutation.isPending) && (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja excluir este serviço?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setServiceToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;