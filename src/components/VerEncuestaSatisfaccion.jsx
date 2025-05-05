import React, { useState, useEffect } from 'react';
import { DATAVERSE_API_ENDPOINT } from '../config/constants';
import { FaStar, FaEye, FaClock, FaUser, FaCheck, FaCommentAlt } from 'react-icons/fa';

// Componente para mostrar estrellas de valoración (solo lectura)
const RatingStars = ({ value }) => {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar 
          key={star} 
          className={star <= value ? "text-[#FACC15]" : "text-gray-300"} 
          size={24} 
        />
      ))}
    </div>
  );
};

// Componente para mostrar un campo de la encuesta con ícono
const EncuestaField = ({ icon, label, value }) => {
  const Icon = icon;
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <Icon className="text-[#003594] w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-gray-900">{value || 'No disponible'}</p>
      </div>
    </div>
  );
};

export const VerEncuestaSatisfaccion = ({ ticketId, accessToken }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [encuesta, setEncuesta] = useState(null);

  const fetchEncuesta = async () => {
    if (!ticketId || !accessToken) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Consulta para obtener la encuesta asociada al ticket
      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_encuestadesatisfaccions?$filter=_amv_ticket_value eq ${ticketId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener los datos de la encuesta');
      }

      const data = await response.json();
      
      if (data.value && data.value.length > 0) {
        setEncuesta(data.value[0]);
      } else {
        setError('No se ha respondido la encuesta de satisfacción');
      }
    } catch (err) {
      console.error('Error al obtener encuesta:', err);
      setError(err.message || 'Error al cargar la encuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEncuesta = () => {
    setOpen(true);
    if (!encuesta) {
      fetchEncuesta();
    }
  };

  // Mapeo de valores de satisfacción a etiquetas
  const getSatisfaccionLabel = (value) => {
    const labels = [
      'Muy insatisfecho',
      'Insatisfecho',
      'Neutral',
      'Satisfecho',
      'Muy satisfecho'
    ];
    return labels[parseInt(value) - 1] || 'No disponible';
  };

  return (
    <div className="my-8 flex flex-col items-center">
      <button
        className="bg-[#003594] hover:bg-[#002B73] text-white font-semibold py-2.5 px-8 rounded-full shadow-md transition-transform text-lg hover:scale-[1.02] focus:outline-none flex items-center gap-2"
        style={{
          backgroundColor: '#003594',
          color: 'white'
        }}
        onClick={handleOpenEncuesta}
      >
        <FaEye size={20} />
        Ver Encuesta de Satisfacción
      </button>

      {/* Modal */}
      {open && (
        <div 
          className="fixed inset-0 overflow-y-auto"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            padding: '2vh 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflowY: 'auto'
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-auto my-auto relative animate-fadeIn overflow-y-auto"
            style={{
              padding: '1.5rem',
              margin: '2rem auto',
              maxHeight: 'calc(100vh - 4rem)',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold text-[#003594] mb-6 sm:mb-8 text-center">
              Resultados de la Encuesta
            </h2>
            
            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003594]"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-[#FEF2F2] text-[#EF4444] rounded-xl text-center">
                {error}
              </div>
            ) : encuesta ? (
              <div className="space-y-6">
                {/* Satisfacción (estrellas) */}
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Nivel de satisfacción con la solución
                  </p>
                  <div className="flex flex-col gap-2">
                    <RatingStars value={Number(encuesta.amv_satisfaccion)} />
                    <p className="text-gray-700 font-medium">
                      {getSatisfaccionLabel(encuesta.amv_satisfaccion)}
                    </p>
                  </div>
                </div>
                
                {/* Tiempo de atención */}
                <EncuestaField 
                  icon={FaClock} 
                  label="Tiempo de atención" 
                  value={encuesta.amv_tiempodeatencion} 
                />
                
                {/* Trato recibido */}
                <EncuestaField 
                  icon={FaUser} 
                  label="Calificación del trato recibido" 
                  value={encuesta.amv_calificaciontratorecibido} 
                />
                
                {/* Problema resuelto */}
                <EncuestaField 
                  icon={FaCheck} 
                  label="¿El problema fue completamente resuelto?" 
                  value={encuesta.amv_tuproblemafuecompletamenteresuelto} 
                />
                
                {/* Comentarios */}
                <div className="mt-6">
                  <div className="flex items-start gap-3 mb-2">
                    <FaCommentAlt className="text-[#003594] w-5 h-5 mt-1" />
                    <p className="text-sm font-medium text-gray-500">Comentarios adicionales</p>
                  </div>
                  {encuesta.amv_comentarios ? (
                    <div className="p-4 bg-[#F9FAFB] rounded-xl text-gray-700 whitespace-pre-wrap">
                      {encuesta.amv_comentarios}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Sin comentarios adicionales.</p>
                  )}
                </div>
                
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-6 py-2 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No se encontraron datos de encuesta.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 