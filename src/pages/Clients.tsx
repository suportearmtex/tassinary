// src/pages/Clients.tsx
import React from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  X, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar,
  SortAsc,
  SortDesc,
  Loader2,
  MoreVertical,
  PhoneCall,
  MessageCircle
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useAuthStore } from '../store/authStore';
import { useClientsServices } from '../services/clientsServices';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componente de Estatísticas
const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-3 bg-white/20 rounded-xl">
        {icon}
      </div>
    </div>
  </div>
);

// Componente de Filtros
const FiltersPanel: React.FC<{
  filters: any;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ filters, updateFilter, clearFilters, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden">
      <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Ordenação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ordenar por
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="name">Nome</option>
              <option value="email">Email</option>
              <option value="created_at">Data de cadastro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ordem
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('sortOrder', 'asc')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                  filters.sortOrder === 'asc'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <SortAsc className="w-4 h-4" />
                Crescente
              </button>
              <button
                onClick={() => updateFilter('sortOrder', 'desc')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border ${
                  filters.sortOrder === 'desc'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <SortDesc className="w-4 h-4" />
                Decrescente
              </button>
            </div>
          </div>

          {/* Filtros por contato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Telefone
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('hasPhone', true)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                  filters.hasPhone === true
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Com telefone
              </button>
              <button
                onClick={() => updateFilter('hasPhone', false)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                  filters.hasPhone === false
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Sem telefone
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('hasEmail', true)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                  filters.hasEmail === true
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Com email
              </button>
              <button
                onClick={() => updateFilter('hasEmail', false)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm ${
                  filters.hasEmail === false
                    ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                Sem email
              </button>
            </div>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período de cadastro
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <button
            onClick={clearFilters}
            className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de Card de Cliente (Mobile)
const ClientCard: React.FC<{
  client: any;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ client, onEdit, onDelete }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{client.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cadastrado em {format(new Date(client.created_at), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="space-y-3">
      {client.email && (
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-300">
          <Mail className="w-4 h-4" />
          <span>{client.email}</span>
        </div>
      )}
      
      {client.phone && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-300">
            <Phone className="w-4 h-4" />
            <span>{client.phone}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.open(`tel:${client.phone}`)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Ligar"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`)}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Componente Principal
function Clients() {
  const { user } = useAuthStore();
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);
  
  const {
    clients,
    isLoading,
    stats,
    filters,
    updateFilter,
    clearFilters,
    isModalOpen,
    isEditMode,
    isDeleteModalOpen,
    formData,
    setFormData,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    handleSubmit,
    confirmDelete,
    exportClients,
    isCreating,
    isUpdating,
    isDeleting
  } = useClientsServices(user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie sua base de clientes
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportClients}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Clientes"
          value={stats.total}
          icon={<Users className="w-6 h-6" />}
          color="from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Com Telefone"
          value={stats.withPhone}
          icon={<Phone className="w-6 h-6" />}
          color="from-green-500 to-green-600"
        />
        <StatsCard
          title="Com Email"
          value={stats.withEmail}
          icon={<Mail className="w-6 h-6" />}
          color="from-purple-500 to-purple-600"
        />
        <StatsCard
          title="Novos (30 dias)"
          value={stats.recent}
          icon={<Calendar className="w-6 h-6" />}
          color="from-orange-500 to-orange-600"
        />
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFiltersOpen(true)}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors lg:hidden"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            
            <div className="hidden lg:flex items-center gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="name">Nome</option>
                <option value="email">Email</option>
                <option value="created_at">Data</option>
              </select>
              
              <button
                onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={`Ordenar ${filters.sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>
              
              <div className="flex gap-1">
                <button
                  onClick={() => updateFilter('hasPhone', filters.hasPhone === true ? null : true)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    filters.hasPhone === true
                      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => updateFilter('hasEmail', filters.hasEmail === true ? null : true)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    filters.hasEmail === true
                      ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
              
              {(filters.search || filters.hasPhone !== null || filters.hasEmail !== null || filters.dateRange.start || filters.dateRange.end) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filters.search || filters.hasPhone !== null || filters.hasEmail !== null 
                ? 'Nenhum cliente encontrado' 
                : 'Nenhum cliente cadastrado'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filters.search || filters.hasPhone !== null || filters.hasEmail !== null
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seu primeiro cliente'
              }
            </p>
            {(!filters.search && filters.hasPhone === null && filters.hasEmail === null) && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Adicionar Primeiro Cliente
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Vista Desktop - Tabela */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-400">
                      Cliente
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-400">
                      Contato
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-400">
                      Cadastro
                    </th>
                    <th className="text-right py-4 px-6 font-medium text-gray-600 dark:text-gray-400">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr 
                      key={client.id} 
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          {client.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <Mail className="w-4 h-4" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <Phone className="w-4 h-4" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(client.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-2">
                          {client.phone && (
                            <>
                              <button
                                onClick={() => window.open(`tel:${client.phone}`)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Ligar"
                              >
                                <PhoneCall className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(client.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="lg:hidden p-6 space-y-4">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEdit={() => openEditModal(client)}
                  onDelete={() => openDeleteModal(client.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filtros Mobile */}
      <FiltersPanel
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
      />

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
              {isEditMode ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefone
                </label>
                <PhoneInput
                  country={'br'}
                  value={formData.phone}
                  onChange={(phone) => setFormData({ ...formData, phone })}
                  inputClass="!w-full !py-3 !pl-16 !pr-4 !rounded-xl !border-gray-300 dark:!border-gray-600 dark:!bg-gray-700 dark:!text-white !shadow-sm focus:!ring-2 focus:!ring-blue-500 focus:!border-transparent"
                  containerClass="!w-full"
                  buttonClass="!border-gray-300 dark:!border-gray-600 dark:!bg-gray-700 !rounded-l-xl !w-14"
                  dropdownClass="!bg-white dark:!bg-gray-700 !text-gray-900 dark:!text-white !border-gray-300 dark:!border-gray-600"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
                >
                  {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isEditMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Confirmar Exclusão
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;