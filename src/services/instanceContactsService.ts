// src/services/instanceContactsService.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { InstanceContact } from '../lib/types';
import toast from 'react-hot-toast';

interface AddContactData {
  phoneNumber: string;
  contactName: string;
}

export const useInstanceContactsService = (instanceId?: string) => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Query para buscar contatos da instância
  const contacts = useQuery({
    queryKey: ['instance-contacts', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('instance_contacts')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as InstanceContact[];
    },
    enabled: !!instanceId,
  });

  // Mutation para adicionar contato
  const addContactMutation = useMutation({
    mutationFn: async (contactData: AddContactData) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-whatsapp-number`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao validar número');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instance-contacts', instanceId] });
      setIsAddModalOpen(false);
      toast.success('Contato adicionado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation para atualizar status do contato
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('instance_contacts')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instance-contacts', instanceId] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutation para deletar contato
  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('instance_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instance-contacts', instanceId] });
      setContactToDelete(null);
      toast.success('Contato removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddContact = async (data: AddContactData) => {
    await addContactMutation.mutateAsync(data);
  };

  const handleToggleContact = async (id: string, currentStatus: boolean) => {
    await updateContactMutation.mutateAsync({ id, is_active: !currentStatus });
  };

  const handleDeleteContact = async (id: string) => {
    await deleteContactMutation.mutateAsync(id);
  };

  const openAddModal = () => {
    if (contacts.data && contacts.data.length >= 2) {
      toast.error('Máximo de 2 contatos permitidos');
      return;
    }
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const openDeleteModal = (id: string) => {
    setContactToDelete(id);
  };

  const closeDeleteModal = () => {
    setContactToDelete(null);
  };

  return {
    // Data
    contacts: contacts.data || [],
    isLoading: contacts.isLoading,
    
    // Modal states
    isAddModalOpen,
    contactToDelete,
    
    // Actions
    handleAddContact,
    handleToggleContact,
    handleDeleteContact,
    openAddModal,
    closeAddModal,
    openDeleteModal,
    closeDeleteModal,
    
    // Loading states
    isAdding: addContactMutation.isPending,
    isUpdating: updateContactMutation.isPending,
    isDeleting: deleteContactMutation.isPending,
    
    // Utils
    canAddMore: (contacts.data?.length || 0) < 2,
  };
};