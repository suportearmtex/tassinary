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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    duration: '60',
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
      setNewService({ name: '', duration: '60' });
      toast.success('Serviço criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar serviço');
    },
  });

  // Rest of the file remains the same
}

export default Services