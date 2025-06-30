// src/services/servicesServices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';

// Types para filtros
export interface ServiceFilters {
  search: string;
  sortBy: 'name' | 'duration' | 'price' | 'created_at';
  sortOrder: 'asc' | 'desc';
  priceRange: {
    min: string;
    max: string;
  };
  durationRange: {
    min: string;
    max: string;
  };
}

export interface ServiceFormData {
  name: string;
  duration: string;
  price: string;
}

// Hook principal para gestão de serviços
export const useServicesServices = (userId?: string) => {
  const queryClient = useQueryClient();
  
  // Estados para filtros
  const [filters, setFilters] = useState<ServiceFilters>({
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    priceRange: { min: '', max: '' },
    durationRange: { min: '', max: '' }
  });

  // Estados para modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  
  // Dados do formulário
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    duration: '60',
    price: '0.00'
  });

  // Query para buscar serviços
  const { data: allServices, isLoading } = useQuery({
    queryKey: ['services', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!userId,
  });

  // Aplicar filtros aos serviços
  const filteredServices = useMemo(() => {
    if (!allServices) return [];

    let filtered = [...allServices];

    // Filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por faixa de preço
    if (filters.priceRange.min) {
      filtered = filtered.filter(service =>
        service.price >= parseFloat(filters.priceRange.min)
      );
    }
    if (filters.priceRange.max) {
      filtered = filtered.filter(service =>
        service.price <= parseFloat(filters.priceRange.max)
      );
    }

    // Filtro por faixa de duração
    if (filters.durationRange.min) {
      filtered = filtered.filter(service =>
        service.duration >= parseInt(filters.durationRange.min)
      );
    }
    if (filters.durationRange.max) {
      filtered = filtered.filter(service =>
        service.duration <= parseInt(filters.durationRange.max)
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
  }, [allServices, filters]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    if (!allServices) return { 
      total: 0, 
      avgPrice: 0, 
      avgDuration: 0, 
      minPrice: 0, 
      maxPrice: 0,
      shortServices: 0,
      longServices: 0
    };

    const prices = allServices.map(s => s.price);
    const durations = allServices.map(s => s.duration);
    
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    const shortServices = allServices.filter(s => s.duration <= 30).length;
    const longServices = allServices.filter(s => s.duration >= 120).length;

    return {
      total: allServices.length,
      avgPrice,
      avgDuration,
      minPrice,
      maxPrice,
      shortServices,
      longServices
    };
  }, [allServices]);

  // Mutation para criar serviço
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: ServiceFormData) => {
      const { data, error } = await supabase
        .from('services')
        .insert([{ 
          ...serviceData, 
          user_id: userId,
          duration: parseInt(serviceData.duration),
          price: parseFloat(serviceData.price)
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', userId] });
      closeModal();
      toast.success('Serviço criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar serviço');
    },
  });

  // Mutation para atualizar serviço
  const updateServiceMutation = useMutation({
    mutationFn: async (service: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update({
          name: service.name,
          duration: service.duration,
          price: service.price
        })
        .eq('id', service.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', userId] });
      closeModal();
      toast.success('Serviço atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar serviço');
    },
  });

  // Mutation para deletar serviço
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', userId] });
      setIsDeleteModalOpen(false);
      setServiceToDelete(null);
      toast.success('Serviço excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir serviço');
    },
  });

  // Funções de controle
  const openCreateModal = () => {
    setFormData({ name: '', duration: '60', price: '0.00' });
    setIsEditMode(false);
    setSelectedService(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      duration: service.duration.toString(),
      price: service.price.toString(),
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedService(null);
    setFormData({ name: '', duration: '60', price: '0.00' });
  };

  const openDeleteModal = (id: string) => {
    setServiceToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setServiceToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode && selectedService) {
      await updateServiceMutation.mutateAsync({
        id: selectedService.id,
        name: formData.name,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
      });
    } else {
      await createServiceMutation.mutateAsync(formData);
    }
  };

  const confirmDelete = async () => {
    if (serviceToDelete) {
      await deleteServiceMutation.mutateAsync(serviceToDelete);
    }
  };

  // Funções de filtro
  const updateFilter = (key: keyof ServiceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      sortBy: 'name',
      sortOrder: 'asc',
      priceRange: { min: '', max: '' },
      durationRange: { min: '', max: '' }
    });
  };

  const exportServices = () => {
    if (!filteredServices.length) {
      toast.error('Nenhum serviço para exportar');
      return;
    }

    const csvContent = [
      ['Nome', 'Duração (min)', 'Preço (R$)', 'Data de Cadastro'],
      ...filteredServices.map(service => [
        service.name,
        service.duration.toString(),
        service.price.toFixed(2),
        new Date(service.created_at).toLocaleDateString('pt-BR')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `servicos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Formatadores
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  };

  return {
    // Data
    services: filteredServices,
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
    selectedService,
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
    exportServices,
    
    // Loading states
    isCreating: createServiceMutation.isPending,
    isUpdating: updateServiceMutation.isPending,
    isDeleting: deleteServiceMutation.isPending,

    // Formatters
    formatPrice,
    formatDuration,
  };
};