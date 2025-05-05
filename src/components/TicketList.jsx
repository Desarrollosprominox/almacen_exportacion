import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, Search, Filter, X, SortDesc, ArrowDown, ArrowUp } from 'lucide-react';

function TicketList({ tickets, onRefresh }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [sucursalFilter, setSucursalFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState('createdon');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

  // Handle sort click
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default direction
      setSortField(field);
      // Default to desc for date, asc for others
      setSortDirection(field === 'createdon' ? 'desc' : 'asc');
    }
  };

  // Priority sorting helper function - returns priority weight (higher = more important)
  const getPriorityWeight = (priority) => {
    switch (priority) {
      case 'critica': return 3;
      case 'alta': return 2;
      case 'baja': return 1;
      default: return 0;
    }
  };

  // Extract unique categories from tickets
  const uniqueCategories = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];
    const categories = tickets
      .map(ticket => ticket.amv_categoriadelasolicitud)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return categories;
  }, [tickets]);
  
  // Extract unique creators from tickets
  const uniqueCreators = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];
    const creators = tickets
      .map(ticket => ticket.createdby)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return creators;
  }, [tickets]);
  
  // Extract unique sucursales from tickets
  const uniqueSucursales = useMemo(() => {
    if (!tickets || tickets.length === 0) return [];
    const sucursales = tickets
      .map(ticket => ticket.amv_sucursal)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return sucursales;
  }, [tickets]);

  // Reset all filters
  const resetFilters = () => {
    setPriorityFilter('');
    setCategoryFilter('');
    setStatusFilter('');
    setCreatorFilter('');
    setSucursalFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (priorityFilter) count++;
    if (categoryFilter) count++;
    if (statusFilter) count++;
    if (creatorFilter) count++;
    if (sucursalFilter) count++;
    if (startDate || endDate) count++;
    if (searchTerm) count++;
    return count;
  }, [priorityFilter, categoryFilter, statusFilter, creatorFilter, sucursalFilter, startDate, endDate, searchTerm]);

  const filteredTickets = useMemo(() => {
    // Start with search term filter
    let filtered = tickets;
    
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.amv_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.amv_asunto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.amv_categoriadelasolicitud?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.amv_sucursal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.createdby?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(ticket => ticket.amv_prioridad === priorityFilter);
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(ticket => ticket.amv_categoriadelasolicitud === categoryFilter);
    }
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(ticket => ticket.amv_estado === statusFilter);
    }
    
    // Apply creator filter
    if (creatorFilter) {
      filtered = filtered.filter(ticket => ticket.createdby === creatorFilter);
    }
    
    // Apply sucursal filter
    if (sucursalFilter) {
      filtered = filtered.filter(ticket => ticket.amv_sucursal === sucursalFilter);
    }
    
    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter(ticket => {
        const ticketDate = new Date(ticket.createdon);
        return ticketDate >= start;
      });
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59); // Set to end of day
      filtered = filtered.filter(ticket => {
        const ticketDate = new Date(ticket.createdon);
        return ticketDate <= end;
      });
    }
    
    return filtered;
  }, [tickets, searchTerm, priorityFilter, categoryFilter, statusFilter, creatorFilter, sucursalFilter, startDate, endDate]);

  // Apply sorting to filtered tickets
  const sortedAndFilteredTickets = useMemo(() => {
    // First get filtered tickets
    let result = [...filteredTickets];
    
    // Then apply sorting
    if (sortField === 'createdon') {
      result.sort((a, b) => {
        const dateA = new Date(a.createdon);
        const dateB = new Date(b.createdon);
        return sortDirection === 'asc' 
          ? dateA - dateB 
          : dateB - dateA;
      });
    } else if (sortField === 'priority') {
      result.sort((a, b) => {
        const priorityA = getPriorityWeight(a.amv_prioridad);
        const priorityB = getPriorityWeight(b.amv_prioridad);
        // For priority, we want critical first regardless of sort direction
        return sortDirection === 'asc'
          ? priorityA - priorityB
          : priorityB - priorityA;
      });
    }
    
    return result;
  }, [filteredTickets, sortField, sortDirection]);

  const handleRowClick = (ticketId) => {
    console.log('Navigating to ticket:', ticketId);
    if (!ticketId) {
      console.error('No ticket ID provided');
      return;
    }
    navigate(`/ticket/${ticketId}`);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar tickets..."
              className="pl-10 px-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003594]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-4 py-2 border rounded-lg 
              ${showFilters ? 'bg-[#003594] text-white' : 'bg-gray-100 text-gray-700'} 
              hover:bg-opacity-90 transition-colors`}
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={onRefresh}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
            >
              Actualizar
            </button>
          </div>
        </div>
        
        {/* Add sorting options */}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => handleSort('createdon')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded 
              ${sortField === 'createdon' 
                ? 'bg-[#003594] text-white' 
                : 'bg-gray-100 text-gray-700'} 
              hover:bg-opacity-90 transition-colors`}
          >
            <SortDesc className="h-3.5 w-3.5" />
            <span>Por fecha</span>
            {sortField === 'createdon' && (
              sortDirection === 'desc' 
                ? <ArrowDown className="h-3.5 w-3.5" /> 
                : <ArrowUp className="h-3.5 w-3.5" />
            )}
          </button>
          
          <button
            onClick={() => handleSort('priority')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded
              ${sortField === 'priority' 
                ? 'bg-[#003594] text-white' 
                : 'bg-gray-100 text-gray-700'} 
              hover:bg-opacity-90 transition-colors`}
          >
            <span>Por prioridad</span>
            {sortField === 'priority' && (
              sortDirection === 'desc' 
                ? <ArrowDown className="h-3.5 w-3.5" /> 
                : <ArrowUp className="h-3.5 w-3.5" />
            )}
          </button>
          
          {(sortField !== 'createdon' && sortField !== 'priority') && (
            <button
              onClick={() => {setSortField('createdon'); setSortDirection('desc');}}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Quitar orden</span>
            </button>
          )}
        </div>
        
        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-gray-700">Filtros avanzados</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={resetFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  <span>Limpiar filtros</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Prioridad filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <div className="relative">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#003594] focus:border-[#003594] sm:text-sm rounded-md"
                  >
                    <option value="">Todas</option>
                    <option value="critica" className="text-red-700">Crítica (Inmediata)</option>
                    <option value="alta" className="text-yellow-700">Alta (Prioritaria)</option>
                    <option value="baja" className="text-green-700">Baja/media</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              {/* Sucursal filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <div className="relative">
                  <select
                    value={sucursalFilter}
                    onChange={(e) => setSucursalFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#003594] focus:border-[#003594] sm:text-sm rounded-md"
                  >
                    <option value="">Todas</option>
                    {uniqueSucursales.map((sucursal, index) => (
                      <option key={index} value={sucursal}>{sucursal}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              {/* Estado filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#003594] focus:border-[#003594] sm:text-sm rounded-md"
                  >
                    <option value="">Todos</option>
                    <option value="En revisión">En revisión</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Resuelta">Resuelta</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              {/* Creator filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Creado por</label>
                <div className="relative">
                  <select
                    value={creatorFilter}
                    onChange={(e) => setCreatorFilter(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#003594] focus:border-[#003594] sm:text-sm rounded-md"
                  >
                    <option value="">Todos</option>
                    {uniqueCreators.map((creator, index) => (
                      <option key={index} value={creator}>{creator}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              {/* Date Range filter */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de creación</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      placeholder="Desde"
                      className="pl-10 px-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003594]"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      placeholder="Hasta"
                      className="pl-10 px-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003594]"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Filter summary and counts */}
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Mostrando <span className="font-semibold">{filteredTickets.length}</span> de <span className="font-semibold">{tickets.length}</span> tickets
                {sortField === 'createdon' && (
                  <span> ordenados por <span className="font-semibold">fecha {sortDirection === 'desc' ? 'más reciente' : 'más antigua'}</span></span>
                )}
                {sortField === 'priority' && (
                  <span> ordenados por <span className="font-semibold">prioridad {sortDirection === 'desc' ? 'más alta' : 'más baja'}</span></span>
                )}
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Cerrar filtros
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado por
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdon')}
              >
                <div className="flex items-center gap-1">
                  <span>Fecha</span>
                  {sortField === 'createdon' && (
                    sortDirection === 'desc' 
                      ? <ArrowDown className="h-3.5 w-3.5" /> 
                      : <ArrowUp className="h-3.5 w-3.5" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asunto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sucursal
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1">
                  <span>Prioridad</span>
                  {sortField === 'priority' && (
                    sortDirection === 'desc' 
                      ? <ArrowDown className="h-3.5 w-3.5" /> 
                      : <ArrowUp className="h-3.5 w-3.5" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAndFilteredTickets.length > 0 ? (
              sortedAndFilteredTickets.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(ticket.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.createdby}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.createdon ? new Date(ticket.createdon).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.amv_asunto}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ticket.amv_sucursal || 'Sin sucursal'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ticket.amv_prioridad === "critica" ? (
                      <div className="flex items-center">
                        <span className="h-3 w-3 mr-2 rounded-full bg-red-500"></span>
                        <span className="text-xs font-semibold text-gray-700">
                          Crítica (Inmediata)
                        </span>
                      </div>
                    ) : ticket.amv_prioridad === "alta" ? (
                      <div className="flex items-center">
                        <span className="h-3 w-3 mr-2 rounded-full bg-yellow-400"></span>
                        <span className="text-xs font-semibold text-gray-700">
                          Alta (Prioritaria)
                        </span>
                      </div>
                    ) : ticket.amv_prioridad === "baja" ? (
                      <div className="flex items-center">
                        <span className="h-3 w-3 mr-2 rounded-full bg-green-400"></span>
                        <span className="text-xs font-semibold text-gray-700">
                          Baja/media
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="h-3 w-3 mr-2 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-semibold text-gray-700">
                          No definida
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No se encontraron tickets que coincidan con los criterios de búsqueda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TicketList; 