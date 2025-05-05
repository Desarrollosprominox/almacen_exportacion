import React, { useState, useEffect } from 'react';
import { MessageSquare, User as UserIcon, Calendar as CalendarIcon, Pencil, PlusCircle, Upload, X as XIcon } from 'lucide-react';
import { useDataverseService } from '../services/dataverseService';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FaTimes, FaPaperclip } from 'react-icons/fa';

export default function TicketAttentions({ ticketId, onTicketClosed, showNewAttentionButton = true }) {
  const { fetchAttentions, createAttention, closeTicket, uploadFileToDataverse, updateTicketStatus } = useDataverseService();
  const { user } = useAuth();
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [comment, setComment] = useState('');
  const [closeRequest, setCloseRequest] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch all attentions for this ticket
  useEffect(() => {
    async function loadAttentions() {
      setLoading(true);
      try {
        const data = await fetchAttentions(ticketId);
        setAttentions(data);
      } catch (err) {
        setError('Error al cargar el historial de atenciones');
      } finally {
        setLoading(false);
      }
    }
    if (ticketId) loadAttentions();
  }, [ticketId, fetchAttentions]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Convert file to base64
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          resolve(reader.result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle submit
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!ticketId) {
      setError('ID de ticket no válido');
      setSaving(false);
      return;
    }

    try {
      console.log('Submitting attention with data:', {
        comment,
        ticketId,
        closeRequest,
        hasFile: !!selectedFile
      });

      // 1. Crear nuevo registro de atención
      const newAttention = await createAttention({
        amv_comentarios: comment,
        amv_tickets: ticketId
      });

      // 2. Si hay archivo, subirlo como anotación
      if (selectedFile) {
        try {
          const fileContent = await getBase64(selectedFile);
          console.log('File converted to base64, uploading...', {
            filename: selectedFile.name,
            type: selectedFile.type,
            size: selectedFile.size
          });

          await uploadFileToDataverse({
            filename: selectedFile.name,
            mimetype: selectedFile.type,
            fileContent,
            objectid_amv_atencion: newAttention.amv_atencionid
          });
        } catch (fileError) {
          console.error('Error uploading file:', fileError);
          setError('Error al subir el archivo adjunto, pero el comentario se guardó correctamente');
        }
      }

      // 3. Si se debe cerrar, actualizar el ticket a "Resuelta"
      if (closeRequest) {
        console.log('Cerrando ticket con ID:', ticketId);
        console.log('Estableciendo estado del ticket a: "Resuelta"');
        try {
          const result = await closeTicket(ticketId);
          console.log('Resultado de cierre de ticket:', result);
          console.log('Ticket cerrado exitosamente. Estado establecido a "Resuelta"');
        } catch (closeError) {
          console.error('Error al cerrar el ticket:', closeError);
          throw closeError;
        }
      } else {
        // Si no se cierra el ticket, cambiar el estado a "En proceso"
        console.log('Actualizando estado del ticket a "En proceso"');
        try {
          const result = await updateTicketStatus(ticketId, "En proceso");
          console.log('Resultado de actualización de estado:', result);
        } catch (statusError) {
          console.error('Error al actualizar estado del ticket:', statusError);
          throw statusError;
        }
      }

      // 4. Refrescar lista y notificar al componente padre para actualizar
      const data = await fetchAttentions(ticketId);
      setAttentions(data);
      setShowModal(false);
      setComment('');
      setCloseRequest(false);
      setSelectedFile(null);
      
      // Notificar al componente padre que debe actualizar los detalles del ticket
      if (onTicketClosed) {
        console.log('Notificando actualización al componente padre');
        // Añadir pequeño retraso para asegurar que la actualización ha tenido tiempo de propagarse
        setTimeout(() => {
          onTicketClosed();
        }, 500);
      }
    } catch (err) {
      console.error('Error en el proceso de atención:', err);
      setError(err.message || 'Error al guardar la atención. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  // Handle cancel
  function handleCancel() {
    setShowModal(false);
    setComment('');
    setCloseRequest(false);
    setSelectedFile(null);
    setError(null);
  }

  // Función para truncar texto con validación
  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
  };

  // Función para verificar si el texto necesita el botón "Ver más"
  const needsExpandButton = (text) => {
    return text && text.length > 150;
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h5 className="text-gray-500 text-lg font-medium text-center flex-grow">Historial de Atenciones</h5>
        {showNewAttentionButton && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
          disabled={loading}
          className="bg-[#003594] hover:bg-[#002b7a] text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Atención
        </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Spinner animation="border" role="status" className="text-[#003594]">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Vista desktop */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-[30%] py-3 px-4 text-left font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    Fecha
                  </div>
                </th>
                <th className="w-[30%] py-3 px-4 text-left font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    Usuario
                  </div>
                </th>
                <th className="w-[30%] py-3 px-4 text-left font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    Comentario
                  </div>
                </th>
                <th className="w-[20%] py-3 px-4 text-left font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <FaPaperclip className="w-4 h-4 text-gray-400" />
                    Archivo Adjunto
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {attentions.map((attention, index) => (
                <tr 
                  key={index}
                  className={`
                    border-b border-gray-200 hover:bg-gray-50 transition-colors
                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  `}
                >
                  <td className="py-4 px-4 text-gray-600 text-sm">
                    {format(new Date(attention.createdon), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-sm">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      {attention.createdby || 'Usuario no disponible'}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-sm">
                    <div className="line-clamp-2">
                      {attention.amv_comentarios || 'Sin comentarios'}
                    </div>
                    {needsExpandButton(attention.amv_comentarios) && (
                      <button className="text-[#003594] hover:text-[#002b7a] text-xs mt-1">
                        Ver más
                      </button>
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-600 text-sm">
                    {attention.amv_anotacion && attention.amv_anotacion.filename ? (
                      <a 
                        href={`data:${attention.amv_anotacion.mimetype};base64,${attention.amv_anotacion.fileContent}`}
                        download={attention.amv_anotacion.filename}
                        className="flex items-center gap-2 text-[#003594] hover:text-[#002b7a] hover:underline"
                      >
                        <FaPaperclip className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">
                          {attention.amv_anotacion.filename}
                        </span>
                      </a>
                    ) : (
                      <span className="text-gray-400">Sin archivo</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!attentions || attentions.length === 0) && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No hay atenciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Vista mobile */}
          <div className="md:hidden space-y-4">
            {attentions.map((attention, index) => (
              <div 
                key={index}
                className={`
                  p-4 rounded-lg border border-gray-200
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {format(new Date(attention.createdon), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {attention.createdby || 'Usuario no disponible'}
                  </span>
                </div>
                <div className="ml-6">
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {attention.amv_comentarios || 'Sin comentarios'}
                  </div>
                  {needsExpandButton(attention.amv_comentarios) && (
                    <button className="text-[#003594] hover:text-[#002b7a] text-xs mt-1">
                      Ver más
                    </button>
                  )}
                </div>
                <div className="ml-6 mt-2">
                  {attention.amv_anotacion && attention.amv_anotacion.filename ? (
                    <a 
                      href={`data:${attention.amv_anotacion.mimetype};base64,${attention.amv_anotacion.fileContent}`}
                      download={attention.amv_anotacion.filename}
                      className="flex items-center gap-2 text-[#003594] hover:text-[#002b7a] hover:underline"
                    >
                      <FaPaperclip className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">
                        {attention.amv_anotacion.filename}
                      </span>
                    </a>
                  ) : (
                    <span className="text-gray-400">Sin archivo</span>
                  )}
                </div>
              </div>
            ))}
            {(!attentions || attentions.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No hay atenciones registradas
              </div>
            )}
          </div>
        </div>
      )}

      <Modal 
        show={showModal} 
        onHide={handleCancel} 
        centered 
        size="lg" 
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"></div>
          <div className="relative w-full max-w-2xl transform overflow-hidden bg-white rounded-lg shadow-xl transition-all">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                Nueva Atención
              </h2>

              {error && (
                <Alert variant="danger" className="mb-4 rounded-lg border-red-200 bg-red-50">
                  <span className="text-red-700 text-sm">{error}</span>
                </Alert>
              )}

              <Form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 focus:border-[#003594] focus:ring-1 focus:ring-[#003594] resize-none shadow-sm"
                    placeholder="Escribe tu comentario aquí..."
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label className="block text-sm font-medium text-gray-700 mb-2">
                    Archivo Adjunto (Opcional)
                  </Form.Label>
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-[#003594] transition-colors bg-gray-50">
                    <div className="text-center px-4">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <div className="flex flex-col sm:flex-row items-center justify-center text-sm text-gray-600">
                        <label htmlFor="file-upload" className="cursor-pointer font-medium text-[#003594] hover:text-[#002b7a]">
                          <span>Selecciona un archivo</span>
                          <Form.Control
                            id="file-upload"
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <span className="mx-1">o arrastra y suelta aquí</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF o imágenes hasta 10MB
                      </p>
                    </div>
                  </div>
                </Form.Group>

                {selectedFile && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Archivos Adjuntos</h4>
                    <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FaPaperclip className="text-gray-400" />
                        <span className="text-sm text-gray-600 truncate max-w-xs">
                          {selectedFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <Form.Group className="!mt-6">
                  <div className="flex items-center">
                    <Form.Check
                      type="checkbox"
                      id="closeRequest"
                      checked={closeRequest}
                      onChange={(e) => setCloseRequest(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-[#003594] rounded border-gray-300 focus:ring-[#003594]"
                    />
                    <Form.Label 
                      htmlFor="closeRequest" 
                      className="ml-2 text-sm text-gray-700 cursor-pointer select-none"
                    >
                      Cerrar ticket después de esta atención
                    </Form.Label>
                  </div>
                </Form.Group>

                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-4 py-2 bg-[#003594] hover:bg-[#002b7a] text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Guardar</span>
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
} 