// src/services/clientsServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Client } from '../lib/types';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';

// Types para filtros
export interface ClientFilters {
  search: string;
  sortBy: 'name' | 'email' | 'created_at' | 'phone';
  sortOrder: 'asc' | 'desc';
  dateRange: {
    start: string;
    end: string;
  };
  hasPhone: boolean | null;
  hasEmail: boolean | null;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
}

// Hook principal para gestão de clientes
export const useClientsServices = (userId?: string) => {
  const queryClient = useQueryClient();
  
  // Estados para filtros
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    dateRange: { start: '', end: '' },
    hasPhone: null,
    hasEmail: null
  });

  // Estados para modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  
  // Dados do formulário
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: ''
  });

  // Query para buscar clientes
  const { data: allClients, isLoading } = useQuery({
    queryKey: ['clients', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!userId,
  });

  // Aplicar filtros aos clientes
  const filteredClients = useMemo(() => {
    if (!allClients) return [];

    let filtered = [...allClients];

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.includes(filters.search)
      );
    }

    // Filtro por telefone
    if (filters.hasPhone !== null) {
      filtered = filtered.filter(client =>
        filters.hasPhone ? !!client.phone : !client.phone
      );
    }

    // Filtro por email
    if (filters.hasEmail !== null) {
      filtered = filtered.filter(client =>
        filters.hasEmail ? !!client.email : !client.email
      );
    }

    // Filtro por data
    if (filters.dateRange.start) {
      filtered = filtered.filter(client =>
        new Date(client.created_at) >= new Date(filters.dateRange.start)
      );
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(client =>
        new Date(client.created_at) <= new Date(filters.dateRange.end)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue = a[filters.sortBy];
      let bValue = b[filters.sortBy];

      // Tratar valores nulos/undefined
      if (!aValue && !bValue) return 0;
      if (!aValue) return filters.sortOrder === 'asc' ? 1 : -1;
      if (!bValue) return filters.sortOrder === 'asc' ? -1 : 1;

      // Comparação de strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allClients, filters]);

  // Estatísticas
  const stats = useMemo(() => {
    if (!allClients) return { total: 0, withPhone: 0, withEmail: 0, recent: 0 };

    const withPhone = allClients.filter(c => !!c.phone).length;
    const withEmail = allClients.filter(c => !!c.email).length;
    const recent = allClients.filter(c => {
      const createdAt = new Date(c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdAt >= thirtyDaysAgo;
    }).length;

    return {
      total: allClients.length,
      withPhone,
      withEmail,
      recent
    };
  }, [allClients]);

  // Mutation para criar cliente
  const createClientMutation = useMutation({
    mutationFn: async (clientData: ClientFormData) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...clientData, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', userId] });
      closeModal();
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar cliente');
    },
  });

  // Mutation para atualizar cliente
  const updateClientMutation = useMutation({
    mutationFn: async (client: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', userId] });
      closeModal();
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar cliente');
    },
  });

  // Mutation para deletar cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', userId] });
      setIsDeleteModalOpen(false);
      setClientToDelete(null);
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cliente');
    },
  });

  // Funções de controle
  const openCreateModal = () => {
    setFormData({ name: '', email: '', phone: '' });
    setIsEditMode(false);
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedClient(null);
    setFormData({ name: '', email: '', phone: '' });
  };

  const openDeleteModal = (id: string) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode && selectedClient) {
      await updateClientMutation.mutateAsync({
        id: selectedClient.id,
        ...formData,
      });
    } else {
      await createClientMutation.mutateAsync(formData);
    }
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      await deleteClientMutation.mutateAsync(clientToDelete);
    }
  };

  // Funções de filtro
  const updateFilter = (key: keyof ClientFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      dateRange: { start: '', end: '' },
      hasPhone: null,
      hasEmail: null
    });
  };

  const exportClients = () => {
    if (!filteredClients.length) {
      toast.error('Nenhum cliente para exportar');
      return;
    }

    const csvContent = [
      ['Nome', 'Email', 'Telefone', 'Data de Cadastro'],
      ...filteredClients.map(client => [
        client.name,
        client.email || '',
        client.phone || '',
        new Date(client.created_at).toLocaleDateString('pt-BR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return {
    // Data
    clients: filteredClients,
    isLoading,
    stats,
    
    // Filters
    filters,
    updateFilter,
    clearFilters,
    
    // Modal states
    isModalOpen,
    isEditMode,
    isDeleteModalOpen,
    selectedClient,
    formData,
    setFormData,
    
    // Actions
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    handleSubmit,
    confirmDelete,
    exportClients,
    
    // Loading states
    isCreating: createClientMutation.isPending,
    isUpdating: updateClientMutation.isPending,
    isDeleting: deleteClientMutation.isPending,
  };
};