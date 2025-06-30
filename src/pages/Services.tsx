// src/pages/Services.tsx
import React from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  X, 
  Edit2, 
  Trash2, 
  Clock, 
  DollarSign,
  SortAsc,
  SortDesc,
  Loader2,
  Copy,
  Tag
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useServicesServices } from '../services/servicesServices';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Componente de Filtros
const FiltersPanel: React.FC<{
  filters: any;
  updateFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  isOpen: boolean;
  onClose: () => void;
  stats: any;
}> = ({ filters, updateFilter, clearFilters, isOpen, onClose, stats }) => {
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
              <option value="price">Preço</option>
              <option value="duration">Duração</option>
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
                    ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700'
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
                    ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <SortDesc className="w-4 h-4" />
                Decrescente
              </button>
            </div>
          </div>

          {/* Faixa de preço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Faixa de Preço (R$)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Mín"
                value={filters.priceRange.min}
                onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, min: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Máx"
                value={filters.priceRange.max}
                onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, max: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.minPrice > 0 && `Menor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.minPrice)} | `}
              {stats.maxPrice > 0 && `Maior: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.maxPrice)}`}
            </div>
          </div>

          {/* Faixa de duração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duração (minutos)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                placeholder="Mín"
                value={filters.durationRange.min}
                onChange={(e) => updateFilter('durationRange', { ...filters.durationRange, min: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
              <input
                type="number"
                min="1"
                placeholder="Máx"
                value={filters.durationRange.max}
                onChange={(e) => updateFilter('durationRange', { ...filters.durationRange, max: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          {/* Filtros rápidos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtros Rápidos
            </label>
            <div className="space-y-2">
              <button
                onClick={() => updateFilter('durationRange', { min: '1', max: '30' })}
                className="w-full text-left py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Serviços rápidos (≤ 30min)
              </button>
              <button
                onClick={() => updateFilter('durationRange', { min: '31', max: '90' })}
                className="w-full text-left py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Serviços médios (30-90min)
              </button>
              <button
                onClick={() => updateFilter('durationRange', { min: '91', max: '' })}
                className="w-full text-left py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Serviços longos (≥ 90min)
              </button>
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

// Componente de Card de Serviço (Mobile)
const ServiceCard: React.FC<{
  service: any;
  onEdit: () => void;
  onDelete: () => void;
  formatPrice: (price: number) => string;
  formatDuration: (duration: number) => string;
}> = ({ service, onEdit, onDelete, formatPrice, formatDuration }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{service.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cadastrado em {format(new Date(service.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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

    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-blue-600" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {formatDuration(service.duration)}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <DollarSign className="w-4 h-4 text-green-600" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatPrice(service.price)}
        </span>
      </div>
    </div>
  </div>
);

// Componente Principal
function Services() {
  const { user } = useAuthStore();
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);
  
  const {
    services,
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
    exportServices,
    isCreating,
    isUpdating,
    isDeleting,
    formatPrice,
    formatDuration
  } = useServicesServices(user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando serviços...</p>
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
            Serviços
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus serviços e preços
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportServices}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar serviços por nome..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
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
                <option value="price">Preço</option>
                <option value="duration">Duração</option>
                <option value="created_at">Data</option>
              </select>
              
              <button
                onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-purple-600 dark:text-purple-400"
                title={`Ordenar ${filters.sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>
              
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="Preço mín"
                  value={filters.priceRange.min}
                  onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, min: e.target.value })}
                  className="w-24 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Preço máx"
                  value={filters.priceRange.max}
                  onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, max: e.target.value })}
                  className="w-24 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>
              
              {(filters.search || filters.priceRange.min || filters.priceRange.max || filters.durationRange.min || filters.durationRange.max) && (
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

        {/* Resumo dos Filtros */}
        {stats.total > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>
                <strong>{services.length}</strong> de <strong>{stats.total}</strong> serviços
              </span>
              
              {stats.avgPrice > 0 && (
                <span>
                  Preço médio: <strong>{formatPrice(stats.avgPrice)}</strong>
                </span>
              )}
              
              {stats.avgDuration > 0 && (
                <span>
                  Duração média: <strong>{formatDuration(Math.round(stats.avgDuration))}</strong>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lista de Serviços */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {services.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filters.search || filters.priceRange.min || filters.priceRange.max || filters.durationRange.min || filters.durationRange.max
                ? 'Nenhum serviço encontrado' 
                : 'Nenhum serviço cadastrado'
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filters.search || filters.priceRange.min || filters.priceRange.max || filters.durationRange.min || filters.durationRange.max
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seu primeiro serviço'
              }
            </p>
            {(!filters.search && !filters.priceRange.min && !filters.priceRange.max && !filters.durationRange.min && !filters.durationRange.max) && (
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Adicionar Primeiro Serviço
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
                      Serviço
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-400">
                      Duração
                    </th>
                    <th className="text-left py-4 px-6 font-medium text-gray-600 dark:text-gray-400">
                      Preço
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
                  {services.map((service) => (
                    <tr 
                      key={service.id} 
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {service.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                        {format(new Date(service.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(service.name)}
                            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Copiar nome"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => openEditModal(service)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(service.id)}
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
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onEdit={() => openEditModal(service)}
                  onDelete={() => openDeleteModal(service.id)}
                  formatPrice={formatPrice}
                  formatDuration={formatDuration}
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
        stats={stats}
      />

      {/* Modal de Criação/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
              {isEditMode ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Corte de cabelo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="60"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tempo estimado para execução do serviço
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preço (R$) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Valor que será cobrado pelo serviço
                </p>
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
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
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
                Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita e pode afetar agendamentos existentes.
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

export default Services;