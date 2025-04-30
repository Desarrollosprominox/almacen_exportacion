import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function ClosedTicketList({ tickets, onRefresh }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTickets = useMemo(() => 
    tickets.filter(ticket => 
      ticket.createdby?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.amv_categoriadelasolicitud?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.amv_asunto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.amv_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [tickets, searchTerm]
  );

  const handleRowClick = (ticketId) => {
    if (!ticketId) {
      return;
    }
    navigate(`/ticket/${ticketId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <input
            type="text"
            placeholder="Buscar tickets..."
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003594]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={onRefresh}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asunto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado por
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de cierre
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTickets.map((ticket, index) => (
              <tr 
                key={`${ticket.amv_name || index}`}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(ticket.amv_name)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {ticket.amv_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ticket.amv_asunto || 'Sin asunto'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ticket.createdby}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {ticket.amv_categoriadelasolicitud}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(ticket.amv_fechadecierre)}
                </td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron tickets cerrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClosedTicketList; 