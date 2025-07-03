// src/components/InstanceContactsManager.tsx
import React, { useState } from 'react';
import { Plus, Phone, Trash2, Power, PowerOff, Loader2, Users, Shield } from 'lucide-react';
import { useInstanceContactsService } from '../services/instanceContactsService';
import { InstanceContact } from '../lib/types';
import PhoneInput from 'react-phone-input-2';

interface InstanceContactsManagerProps {
  instanceId: string;
  instanceStatus: string;
}

const InstanceContactsManager: React.FC<InstanceContactsManagerProps> = ({
  instanceId,
  instanceStatus
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');

  const {
    contacts,
    isLoading,
    isAddModalOpen,
    contactToDelete,
    handleAddContact,
    handleToggleContact,
    handleDeleteContact,
    openAddModal,
    closeAddModal,
    openDeleteModal,
    closeDeleteModal,
    isAdding,
    isUpdating,
    isDeleting,
    canAddMore,
  } = useInstanceContactsService(instanceId);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!phoneNumber.trim() || !contactName.trim()) {
    return;
  }

  // Formatar o número para envio (remover caracteres especiais e manter apenas números)
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  await handleAddContact({
    phoneNumber: cleanNumber,
    contactName: contactName.trim(),
  });

  setPhoneNumber('');
  setContactName('');
};

  const formatPhoneNumber = (phone: string) => {
    // Formatar número para exibição (11999999999 -> (11) 99999-9999)
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
  };

  if (instanceStatus !== 'connected') {
    return null; // Só mostra quando conectado
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Números Autorizados
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Apenas estes números podem receber mensagens automáticas
            </p>
          </div>
        </div>

        {canAddMore && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Lista de Contatos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Nenhum número autorizado ainda
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Adicione até 2 números que podem receber mensagens automáticas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact: InstanceContact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${contact.is_active
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                  <Phone className={`w-4 h-4 ${contact.is_active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400'
                    }`} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {contact.contact_name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPhoneNumber(contact.phone_number)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleContact(contact.id, contact.is_active)}
                  disabled={isUpdating}
                  className={`p-2 rounded-lg transition-colors ${contact.is_active
                      ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                  title={contact.is_active ? 'Desativar' : 'Ativar'}
                >
                  {contact.is_active ? (
                    <Power className="w-4 h-4" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openDeleteModal(contact.id)}
                  disabled={isDeleting}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Indicador de limite */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {contacts.length}/2 números cadastrados
        </span>
        {contacts.length >= 2 && (
          <span className="text-orange-600 dark:text-orange-400 font-medium">
            Limite máximo atingido
          </span>
        )}
      </div>

      {/* Modal Adicionar Contato */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Adicionar Número Autorizado
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Nome do Contato
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Número do WhatsApp
                </label>
                <PhoneInput
                  country={'br'}
                  value={phoneNumber}
                  onChange={(phone) => setPhoneNumber(phone)}
                  inputClass="!w-full !py-2 !pl-16 !pr-4 !rounded-md !border-gray-300 dark:!border-gray-600 dark:!bg-gray-700 dark:!text-white !shadow-sm focus:!ring-2 focus:!ring-green-500 focus:!border-green-500"
                  containerClass="!w-full"
                  buttonClass="!border-gray-300 dark:!border-gray-600 dark:!bg-gray-700 !rounded-l-md !w-14"
                  dropdownClass="!bg-white dark:!bg-gray-700 !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600"
                  placeholder="Ex: (41) 99999-9999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Selecione o país e digite o número com DDD
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Importante:</strong> O número será validado via WhatsApp.
                  Apenas números ativos serão aceitos.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  disabled={isAdding}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !phoneNumber.trim() || !contactName.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {contactToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Confirmar Remoção
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tem certeza que deseja remover este contato? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteContact(contactToDelete)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstanceContactsManager;