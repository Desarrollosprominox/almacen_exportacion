import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDataverseService } from '../services/dataverseService';
import Sidebar from '../components/Sidebar';
import TicketAnnotations from '../components/TicketAnnotations';
import TicketAttentions from '../components/TicketAttentions';
import { User, Mail, Building, Calendar, Tag, AlertCircle, Phone, Image as ImageIcon, X, Download, FileText } from 'lucide-react';
import '@fontsource/inter';

function TicketDetails() {
  const { ticketId } = useParams();
  const { isAuthenticated, login } = useAuth();
  const { fetchTicketDetails } = useDataverseService();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const loadTicketDetails = useCallback(async () => {
    try {
      if (!ticketId) {
        throw new Error('No se ha proporcionado un ID de ticket válido');
      }

      setLoading(true);
      const ticketData = await fetchTicketDetails(ticketId);
      setTicket(ticketData);
      setError(null);
    } catch (err) {
      console.error('Error loading ticket details:', err);
      setError(err.message || 'Error al cargar los detalles del ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId, fetchTicketDetails]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTicketDetails();
    }
  }, [isAuthenticated, loadTicketDetails]);

  const handleDownloadImage = useCallback((imageData, imageId) => {
    try {
      // Convertir el base64 a blob
      const byteCharacters = atob(imageData);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagen-${imageId}.jpg`;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al descargar la imagen:', error);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No estás autenticado</h1>
          <button
            onClick={login}
            className="bg-[#003594] text-white px-4 py-2 rounded hover:bg-[#002b7a]"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <Sidebar onCollapse={setIsSidebarCollapsed} />
      <main 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            Detalles de la Solicitud
          </h1>

          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#003594]"></div>
              <p className="mt-2 text-gray-600">Cargando detalles...</p>
            </div>
          ) : ticket ? (
            <div className="bg-white shadow-lg rounded-lg p-8 transition-all duration-300 ease-in-out hover:shadow-xl">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">{ticket.amv_name}</h2>
                <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 inline-block mt-2">
                  ID: {ticketId}
                </span>
                </div>
                
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Creado por</p>
                    <p className="text-base font-semibold text-gray-900">{ticket.createdby}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Correo</p>
                    <p className="text-base font-semibold text-gray-900">
                      {ticket.amv_correo || 'No disponible'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <Phone className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teléfono</p>
                    <p className="text-base font-semibold text-gray-900">
                      {ticket.amv_telefono || 'No disponible'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <Tag className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Categoría</p>
                    <p className="text-base font-semibold text-gray-900">{ticket.amv_categoriadelasolicitud}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <Building className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sucursal</p>
                    <p className="text-base font-semibold text-gray-900">{ticket.amv_sucursal}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fecha de creación</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(ticket.createdon).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-white border p-2 rounded-full shadow-sm">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estado</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.amv_estado === "1" 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ticket.amv_estado === "1" ? 'Cerrado' : 'Abierto'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 my-6"></div>

              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Asunto</p>
                <p className="text-base font-semibold text-gray-900 mt-1">{ticket.amv_asunto}</p>
              </div>

              <div className="bg-gray-50 rounded-md p-4 mt-4">
                <p className="text-sm text-gray-500 uppercase tracking-wide">Descripción</p>
                <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">{ticket.amv_descripcion}</p>
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <section className="mt-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                    <h3 className="text-2xl font-bold text-gray-900">Imágenes adjuntas</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {ticket.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center cursor-pointer group"
                        onClick={() => setSelectedImage(attachment)}
                      >
                        <div className="w-full h-48 overflow-hidden">
                          <img
                            src={`data:image/jpeg;base64,${attachment.image}`}
                            alt={attachment.name || `Imagen ${attachment.id}`}
                            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-4 w-full">
                          <p className="text-sm font-semibold text-gray-800 text-center">
                            {attachment.name && attachment.name.trim() !== '' ? attachment.name : 'Imagen sin nombre'}
                          </p>
                          {attachment.description && (
                            <p className="text-xs text-gray-500 text-center mt-1">{attachment.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">{selectedImage.name && selectedImage.name.trim() !== '' ? selectedImage.name : `Imagen sin nombre`}</h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const byteCharacters = atob(selectedImage.image);
                                const byteArrays = [];
                                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                                  const slice = byteCharacters.slice(offset, offset + 512);
                                  const byteNumbers = new Array(slice.length);
                                  for (let i = 0; i < slice.length; i++) {
                                    byteNumbers[i] = slice.charCodeAt(i);
                                  }
                                  const byteArray = new Uint8Array(byteNumbers);
                                  byteArrays.push(byteArray);
                                }
                                const blob = new Blob(byteArrays, { type: 'image/jpeg' });
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${selectedImage.name || 'imagen'}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(link);
                              }}
                              title="Descargar imagen"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setSelectedImage(null)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                              title="Cerrar"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="relative flex flex-col items-center">
                          <img
                            src={`data:image/jpeg;base64,${selectedImage.image}`}
                            alt={selectedImage.name || `Imagen sin nombre`}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow"
                          />
                          {selectedImage.description && (
                            <p className="text-xs text-gray-500 text-center mt-2">{selectedImage.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Sección de archivos adjuntos (anotaciones) */}
              <section className="mt-8 mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="w-6 h-6 text-gray-400" />
                  <h3 className="text-2xl font-bold text-gray-900">Archivos adjuntos</h3>
                </div>
                <div className="bg-gray-50 p-4 rounded-md shadow-inner">
                  <TicketAnnotations ticketId={ticket.amv_ticketsid} />
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No se encontró la solicitud</p>
            </div>
          )}

          {/* Sección de Historial de Atenciones en contenedor separado */}
          {ticket && (
            <div className="bg-white shadow-lg rounded-lg p-8 mt-8 transition-all duration-300 ease-in-out hover:shadow-xl">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-6 h-6 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-900">Historial de Atenciones</h3>
              </div>
              <TicketAttentions 
                ticketId={ticket.amv_ticketsid} 
                onTicketClosed={loadTicketDetails} 
                showNewAttentionButton={ticket.amv_estado !== "1"}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TicketDetails; 