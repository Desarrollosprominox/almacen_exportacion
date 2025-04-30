import { useState, useEffect } from 'react';
import { useDataverseService } from '../services/dataverseService';
import { FileText, Download, AlertCircle } from 'lucide-react';

function TicketAnnotations({ ticketId }) {
  const { fetchTicketAnnotations } = useDataverseService();
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawError, setRawError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);

  useEffect(() => {
    let didCancel = false;
    const loadAnnotations = async () => {
      try {
        setLoading(true);
        setError(null);
        setRawError(null);
        setRawResponse(null);
        console.log('[TicketAnnotations] Llamando fetchTicketAnnotations con ticketId:', ticketId);
        // Timeout de 10 segundos
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout al cargar anotaciones para ticketId: ' + ticketId)), 10000));
        const data = await Promise.race([
          fetchTicketAnnotations(ticketId),
          timeoutPromise
        ]);
        if (didCancel) return;
        console.log('[TicketAnnotations] Respuesta de fetchTicketAnnotations:', data);
        if (!Array.isArray(data)) {
          setRawResponse(data);
          setError('La respuesta de anotaciones no es un array.');
          setAnnotations([]);
        } else {
          setAnnotations(data);
        }
      } catch (err) {
        if (didCancel) return;
        setRawError(err);
        setError((err && err.message) ? err.message : 'Error al cargar los archivos adjuntos');
        setAnnotations([]);
        console.error('[TicketAnnotations] Error al cargar anotaciones:', err);
      } finally {
        if (!didCancel) setLoading(false);
      }
    };

    if (ticketId) {
      loadAnnotations();
    } else {
      setLoading(false);
      setError('No se proporcionó ticketId');
      setAnnotations([]);
      console.warn('[TicketAnnotations] ticketId no proporcionado');
    }
    return () => { didCancel = true; };
  }, [ticketId, fetchTicketAnnotations]);

  const handleDownload = (documentbody, filename) => {
    try {
      const byteCharacters = atob(documentbody);
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
      const blob = new Blob(byteArrays, { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      setError('Error al descargar el archivo');
    }
  };

  const getFileIcon = (mimetype) => {
    if (mimetype && mimetype.includes('pdf')) return '📄';
    if (mimetype && mimetype.includes('image')) return '🖼️';
    if (mimetype && mimetype.includes('word')) return '📝';
    if (mimetype && mimetype.includes('excel')) return '📊';
    return '📎';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#003594]"></div>
        <p className="mt-2 text-sm text-gray-600">Cargando archivos adjuntos...</p>
        <pre className="text-xs text-gray-400 mt-2">ticketId: {String(ticketId)}</pre>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center mb-2">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
        <pre className="text-xs text-gray-400 mb-2">ticketId: {String(ticketId)}</pre>
        {rawError && (
          <pre className="text-xs text-red-700 bg-red-100 rounded p-2 overflow-x-auto mb-2">{String(rawError)}</pre>
        )}
        {rawResponse && (
          <pre className="text-xs text-gray-700 bg-gray-100 rounded p-2 overflow-x-auto">{JSON.stringify(rawResponse, null, 2)}</pre>
        )}
      </div>
    );
  }

  if (!annotations || annotations.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No hay archivos adjuntos
        <pre className="text-xs text-gray-400 mt-2">ticketId: {String(ticketId)}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        {annotations.map((annotation) => (
          <div key={annotation.annotationid} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <span className="text-xl">{getFileIcon(annotation.mimetype)}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{annotation.filename}</p>
                <p className="text-xs text-gray-500">{annotation.mimetype}</p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(annotation.documentbody, annotation.filename)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Descargar archivo"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TicketAnnotations; 