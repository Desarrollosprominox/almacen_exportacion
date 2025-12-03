import { useAuth } from '../hooks/useAuth';
import { useCallback } from 'react';
import { DATAVERSE_API_ENDPOINT } from '../config/constants';
import { useMsal } from '@azure/msal-react';

const DATAVERSE_URL = 'https://orgb392fb43.crm.dynamics.com/api/data/v9.1';

export function useDataverseService() {
  const { getAccessToken } = useAuth();
  const { instance, accounts } = useMsal();

  const fetchTickets = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_ticketses?$select=amv_name,amv_asunto,amv_categoriadelasolicitud,amv_estado,amv_prioridad,createdon&$filter=amv_estado ne 'Resuelta'&$expand=createdby($select=fullname)`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Error al obtener tickets: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('Tickets data:', data.value);
      return data.value.map(ticket => ({
        id: ticket.amv_name,
        amv_name: ticket.amv_name,
        amv_asunto: ticket.amv_asunto,
        amv_categoriadelasolicitud: ticket.amv_categoriadelasolicitud,
        amv_estado: ticket.amv_estado,
        amv_prioridad: ticket.amv_prioridad || 'No definida',
        createdon: ticket.createdon,
        createdby: ticket.createdby ? ticket.createdby.fullname : 'No disponible'
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      if (error.message.includes('Authentication failed')) {
        throw error;
      }
      throw error;
    }
  }, [getAccessToken]);

  const fetchClosedTickets = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('[fetchClosedTickets] Obteniendo tickets resueltos');

      // Consulta ÚNICAMENTE para tickets con estado "Resuelta"
      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_ticketses?$select=amv_name,amv_categoriadelasolicitud,amv_fechadecierre,amv_asunto,createdon,amv_estado&$filter=amv_estado eq 'Resuelta'&$expand=createdby($select=fullname)&$orderby=amv_fechadecierre desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[fetchClosedTickets] Error en la respuesta:', errorData);
        throw new Error(`Error al obtener tickets resueltos: ${response.status}`);
      }

      const data = await response.json();
      console.log('[fetchClosedTickets] Datos recibidos:', data.value);
      console.log('[fetchClosedTickets] Total de tickets encontrados:', data.value.length);
      
      // Verificar que todos los tickets tienen el estado "Resuelta"
      const ticketsWithCorrectStatus = data.value.filter(ticket => ticket.amv_estado === "Resuelta");
      console.log('[fetchClosedTickets] Tickets con estado "Resuelta":', ticketsWithCorrectStatus.length);
      
      if (ticketsWithCorrectStatus.length !== data.value.length) {
        console.warn('[fetchClosedTickets] Hay tickets que no tienen el estado "Resuelta"');
      }
      
      // Asegurarnos de que los tickets estén ordenados por fecha de cierre descendente
      const sortedTickets = data.value
        .map(ticket => ({
          amv_name: ticket.amv_name,
          createdby: ticket.createdby ? ticket.createdby.fullname : 'No disponible',
          amv_categoriadelasolicitud: ticket.amv_categoriadelasolicitud,
          amv_asunto: ticket.amv_asunto,
          createdon: ticket.createdon,
          amv_fechadecierre: ticket.amv_fechadecierre,
          // Asegurar que el estado siempre sea exactamente "Resuelta"
          amv_estado: "Resuelta"
        }))
        .sort((a, b) => {
          // Si alguna fecha es null o undefined, ponerla al final
          if (!a.amv_fechadecierre) return 1;
          if (!b.amv_fechadecierre) return -1;
          // Ordenar de más reciente a más antigua
          return new Date(b.amv_fechadecierre) - new Date(a.amv_fechadecierre);
        });

      console.log('[fetchClosedTickets] Tickets ordenados:', sortedTickets);
      return sortedTickets;
    } catch (error) {
      console.error('[fetchClosedTickets] Error:', error);
      throw error;
    }
  }, [getAccessToken]);

  const fetchReportData = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_ticketses?$select=amv_sucursal,amv_categoriadelasolicitud,createdon&$orderby=createdon desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener datos para reportes: ${response.status}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error fetching report data:', error);
      throw error;
    }
  }, [getAccessToken]);

  const fetchTicketAttachments = useCallback(async (ticketId) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('Fetching attachments for ticket:', ticketId);
      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_archivoses?$filter=_amv_ticketrelacion_value eq ${ticketId}&$select=amv_id,amv_imagen`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Error al obtener archivos adjuntos: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('Attachments data:', JSON.stringify(data, null, 2));
      
      if (!data.value || data.value.length === 0) {
        return [];
      }

      return data.value.map(attachment => ({
        id: attachment.amv_id,
        image: attachment.amv_imagen
      }));
    } catch (error) {
      console.error('Error fetching ticket attachments:', error);
      return [];
    }
  }, [getAccessToken]);
  const fetchTicketAnnotations = useCallback(async (ticketId) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('Fetching annotations for ticket:', ticketId);
      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/annotations?$filter=_objectid_value eq ${ticketId}&$select=subject,filename,mimetype,documentbody`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Error al obtener anotaciones: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('Annotations data:', JSON.stringify(data, null, 2));
      
      if (!data.value || data.value.length === 0) {
        return [];
      }

      return data.value.map(annotation => ({
        annotationid: annotation.annotationid,
        subject: annotation.subject,
        filename: annotation.filename,
        mimetype: annotation.mimetype,
        documentbody: annotation.documentbody
      }));
    } catch (error) {
      console.error('Error fetching ticket annotations:', error);
      throw error;
    }
  }, [getAccessToken]);
  
  const fetchTicketDetails = useCallback(async (ticketId) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('Fetching ticket with ID:', ticketId);
      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_ticketses?$filter=amv_name eq '${encodeURIComponent(ticketId)}'&$select=amv_ticketsid,amv_name,amv_asunto,amv_categoriadelasolicitud,amv_estado,amv_prioridad,amv_descripcion,amv_correo,amv_sucursal,amv_telefono,amv_solicitudanombrede,createdon&$expand=createdby($select=fullname)`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', JSON.stringify(errorData, null, 2));
        throw new Error(`Error al obtener detalles del ticket: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (!data.value || data.value.length === 0) {
        throw new Error('No se encontró el ticket');
      }

      const ticket = data.value[0];
      const attachments = await fetchTicketAttachments(ticket.amv_ticketsid);

      return {
        id: ticket.amv_name,
        amv_ticketsid: ticket.amv_ticketsid,
        amv_name: ticket.amv_name,
        amv_asunto: ticket.amv_asunto,
        amv_categoriadelasolicitud: ticket.amv_categoriadelasolicitud,
        amv_estado: ticket.amv_estado,
        amv_prioridad: ticket.amv_prioridad || '',
        amv_descripcion: ticket.amv_descripcion,
        amv_correo: ticket.amv_correo,
        amv_sucursal: ticket.amv_sucursal,
        amv_telefono: ticket.amv_telefono,
        amv_solicitudanombrede: ticket.amv_solicitudanombrede || '',
        createdon: ticket.createdon,
        createdby: ticket.createdby ? ticket.createdby.fullname : 'No disponible',
        attachments
      };
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      throw error;
    }
  }, [getAccessToken, fetchTicketAttachments]);

  // Fetch attentions for a specific ticket
  const fetchAttentions = useCallback(async (ticketId) => {
    if (!ticketId) {
      console.warn('No se proporcionó un ID de ticket para fetchAttentions');
      return [];
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('[fetchAttentions] Obteniendo atenciones para el ticket:', ticketId);

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_atencions?$filter=_amv_tickets_value eq ${ticketId}&$select=amv_atencionid,amv_comentarios,createdon&$expand=createdby($select=fullname)&$orderby=createdon desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
        }
      );

      if (!response.ok) {
        console.error('[fetchAttentions] Error en la respuesta:', response.status);
        return [];
      }

      const data = await response.json();
      const attentions = data.value;

      // Obtener anotaciones para cada atención
      const attentionsWithAnnotations = await Promise.all(
        attentions.map(async (attention) => {
          try {
            console.log('[fetchAttentions] Obteniendo anotaciones para la atención:', attention.amv_atencionid);
            
            const annotationsResponse = await fetch(
              `${DATAVERSE_API_ENDPOINT}/annotations?$filter=_objectid_value eq ${attention.amv_atencionid} and objecttypecode eq 'amv_atencion'&$select=filename,mimetype,documentbody`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'OData-MaxVersion': '4.0',
                  'OData-Version': '4.0'
                },
              }
            );

            if (!annotationsResponse.ok) {
              console.error('[fetchAttentions] Error al obtener anotaciones:', annotationsResponse.status);
              return {
                ...attention,
                createdby: attention.createdby ? attention.createdby.fullname : 'No disponible',
                amv_anotacion: null
              };
            }

            const annotationsData = await annotationsResponse.json();
            const annotation = annotationsData.value[0]; // Tomamos la primera anotación

            return {
              ...attention,
              createdby: attention.createdby ? attention.createdby.fullname : 'No disponible',
              amv_anotacion: annotation ? {
                filename: annotation.filename,
                mimetype: annotation.mimetype,
                fileContent: annotation.documentbody
              } : null
            };
          } catch (error) {
            console.error('[fetchAttentions] Error al procesar anotación:', error);
            return {
        ...attention,
              createdby: attention.createdby ? attention.createdby.fullname : 'No disponible',
              amv_anotacion: null
            };
          }
        })
      );

      console.log('[fetchAttentions] Atenciones con anotaciones:', attentionsWithAnnotations);
      return attentionsWithAnnotations;
    } catch (error) {
      console.error('[fetchAttentions] Error general:', error);
      return [];
    }
  }, [getAccessToken]);

  // Create a new attention record
  const createAttention = useCallback(async (attentionData) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      // Log the request data for debugging
      console.log('Creating attention with data:', {
        ticketId: attentionData.amv_tickets,
        comentarios: attentionData.amv_comentarios
      });

      const payload = {
        amv_comentarios: attentionData.amv_comentarios,
        "amv_Tickets@odata.bind": `/amv_ticketses(${attentionData.amv_tickets})`
      };

      console.log('Sending payload:', payload);

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_atencions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from Dataverse:', errorData);
        throw new Error(errorData.error?.message || 'Error al crear la atención');
      }

      const data = await response.json();
      console.log('Attention created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating attention:', error);
      throw error;
    }
  }, [getAccessToken]);

  // Close a ticket
  const closeTicket = useCallback(async (ticketId) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('[closeTicket] Intentando cerrar ticket:', ticketId);

      // Obtener la fecha actual en formato ISO
      const currentDate = new Date().toISOString();
      console.log('[closeTicket] Fecha de cierre:', currentDate);

      // Verificar que el ID del ticket tenga el formato correcto (GUID sin comillas ni llaves)
      let formattedTicketId = ticketId;
      // Si el ID tiene llaves, las eliminamos
      if (formattedTicketId.startsWith('{') && formattedTicketId.endsWith('}')) {
        formattedTicketId = formattedTicketId.slice(1, -1);
      }
      // Asegurar que no tiene comillas alrededor
      formattedTicketId = formattedTicketId.replace(/"/g, '');

      console.log('[closeTicket] ID de ticket formateado:', formattedTicketId);

      // Preparar los datos para actualizar
      const ticketData = {
        'amv_estado': "Resuelta",
        'amv_fechadecierre': currentDate
      };
      
      console.log('[closeTicket] Datos a enviar:', JSON.stringify(ticketData, null, 2));

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_ticketses(${formattedTicketId})`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'If-Match': '*'
          },
          body: JSON.stringify(ticketData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[closeTicket] Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Error al cerrar el ticket: ${response.status} - ${response.statusText}`);
      }

      console.log('[closeTicket] Ticket cerrado exitosamente con estado "Resuelta"');
      
      // Verificar que el estado se haya actualizado correctamente
      try {
        // Esperar un momento para asegurar que la actualización se ha propagado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const verifyResponse = await fetch(
          `${DATAVERSE_API_ENDPOINT}/amv_ticketses(${formattedTicketId})?$select=amv_estado`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0'
            },
          }
        );
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('[closeTicket] Verificación de estado:', verifyData.amv_estado);
          
          if (verifyData.amv_estado !== "Resuelta") {
            console.warn('[closeTicket] ADVERTENCIA: El estado no se actualizó a "Resuelta", intentando de nuevo...');
            
            // Intentar nuevamente la actualización
            const retryResponse = await fetch(
              `${DATAVERSE_API_ENDPOINT}/amv_ticketses(${formattedTicketId})`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'OData-MaxVersion': '4.0',
                  'OData-Version': '4.0',
                  'If-Match': '*'
                },
                body: JSON.stringify({
                  'amv_estado': "Resuelta"
                }),
              }
            );
            
            if (retryResponse.ok) {
              console.log('[closeTicket] Segundo intento exitoso');
            } else {
              console.warn('[closeTicket] El segundo intento también falló');
            }
          }
        }
      } catch (verifyError) {
        console.warn('[closeTicket] Error al verificar el estado:', verifyError);
        // No lanzamos el error para que no interrumpa el flujo principal
      }
      
      return true;
    } catch (error) {
      console.error('[closeTicket] Error al cerrar ticket:', error);
      throw error;
    }
  }, [getAccessToken]);

  // Actualizar el estado del ticket a "En revisión"
  const updateTicketStatus = useCallback(async (ticketId, status, priority = null) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se pudo obtener el token de acceso');
      }

      console.log('[updateTicketStatus] Actualizando ticket:', ticketId, 'estado:', status, 'prioridad:', priority);

      // Verificar que el ID del ticket tenga el formato correcto (GUID sin comillas ni llaves)
      let formattedTicketId = ticketId;
      // Si el ID tiene llaves, las eliminamos
      if (formattedTicketId.startsWith('{') && formattedTicketId.endsWith('}')) {
        formattedTicketId = formattedTicketId.slice(1, -1);
      }
      // Asegurar que no tiene comillas alrededor
      formattedTicketId = formattedTicketId.replace(/"/g, '');

      console.log('[updateTicketStatus] ID de ticket formateado:', formattedTicketId);

      // Prepare update data
      const updateData = {
        'amv_estado': status
      };
      
      // Add priority to update data if provided
      if (priority !== null) {
        updateData['amv_prioridad'] = priority;
      }

      console.log('[updateTicketStatus] Datos a actualizar:', updateData);

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/amv_ticketses(${formattedTicketId})`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'If-Match': '*'
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[updateTicketStatus] Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Error al actualizar el ticket: ${response.status} - ${response.statusText}`);
      }

      console.log('[updateTicketStatus] Ticket actualizado exitosamente');
      return true;
    } catch (error) {
      console.error('[updateTicketStatus] Error al actualizar ticket:', error);
      throw error;
    }
  }, [getAccessToken]);

  // Upload file to Dataverse as annotation
  const uploadFileToDataverse = useCallback(async ({ filename, mimetype, fileContent, objectid_amv_atencion }) => {
    try {
      console.log('[uploadFileToDataverse] Iniciando subida de archivo:', {
        filename,
        mimetype,
        objectid_amv_atencion,
        fileContentLength: fileContent.length
      });

      const token = await getAccessToken();
      if (!token) {
        console.error('[uploadFileToDataverse] Error: No se pudo obtener el token de acceso');
        throw new Error('No se pudo obtener el token de acceso');
      }

      // Asegurarse de que el contenido del archivo esté en el formato correcto
      const base64Content = fileContent.replace(/^data:.*,/, '');
      console.log('[uploadFileToDataverse] Contenido del archivo convertido a base64:', {
        base64Length: base64Content.length,
        first50Chars: base64Content.substring(0, 50) + '...'
      });

      const annotationData = {
        subject: `Archivo adjunto: ${filename}`,
        filename: filename,
        mimetype: mimetype,
        documentbody: base64Content,
        "objecttypecode": "amv_atencion",
        "objectid_amv_atencion@odata.bind": `/amv_atencions(${objectid_amv_atencion})`
      };

      console.log('[uploadFileToDataverse] Enviando datos de anotación:', {
        ...annotationData,
        documentbody: 'BASE64_CONTENT' // No mostramos el contenido completo en el log
      });

      console.log('[uploadFileToDataverse] Realizando petición POST a:', `${DATAVERSE_API_ENDPOINT}/annotations`);

      const response = await fetch(
        `${DATAVERSE_API_ENDPOINT}/annotations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(annotationData),
        }
      );

      console.log('[uploadFileToDataverse] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[uploadFileToDataverse] Error en la respuesta:', {
          status: response.status,
          errorData
        });
        throw new Error(errorData.error?.message || 'Error al subir el archivo');
      }

      const data = await response.json();
      console.log('[uploadFileToDataverse] Archivo subido exitosamente:', {
        annotationId: data.annotationid,
        filename: data.filename
      });
      return data;
    } catch (error) {
      console.error('[uploadFileToDataverse] Error en el proceso de subida:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }, [getAccessToken]);

  const getAuthHeader = useCallback(async () => {
    const account = accounts[0];
    const token = await instance.acquireTokenSilent({
      scopes: ['https://orgb392fb43.crm.dynamics.com/.default'],
      account: account
    });
    return {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    };
  }, [instance, accounts]);

  const getInventarioRefacciones = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(
        `${DATAVERSE_URL}/amv_inventarioderefaccioneses?$select=amv_concepto,amv_descripcion,amv_valoractual,amv_cantidadminima,amv_costounitario`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Error al obtener datos de inventario de refacciones');
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error en getInventarioRefacciones:', error);
      throw error;
    }
  }, [getAuthHeader]);

  const getInventarioAlmacenCS = useCallback(async () => {
    const headers = await getAuthHeader();

    const entitySetCandidates = [
      // más probable
      `${DATAVERSE_URL}/cr9a1_inventariosalmacencs`,
      // variantes comunes de pluralización en Dataverse
      `${DATAVERSE_URL}/cr9a1_inventariosalmacencses`
    ];

    const select = '$select=cr9a1_idmovimiento,cr9a1_empaque,cr9a1_ubicacion,cr9a1_fechahora,cr9a1_piezasdec,cr9a1_piezas,cr9a1_equipo';
    const order = '$orderby=cr9a1_fechahora desc';

    const errors = [];

    for (const baseUrl of entitySetCandidates) {
      // 1) Intento con $select específico
      let url = `${baseUrl}?${select}&${order}`;
      try {
        let response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          return data.value;
        } else {
          const detail = await safeReadError(response);
          errors.push(`[${response.status}] ${baseUrl} con select: ${detail}`);
        }
      } catch (e) {
        errors.push(`Fetch error ${baseUrl} con select: ${e?.message || e}`);
      }

      // 2) Intento sin $select (por si hay nombre de columna distinto)
      url = `${baseUrl}?${order}`;
      try {
        let response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          return data.value;
        } else {
          const detail = await safeReadError(response);
          errors.push(`[${response.status}] ${baseUrl} sin select: ${detail}`);
        }
      } catch (e) {
        errors.push(`Fetch error ${baseUrl} sin select: ${e?.message || e}`);
      }
    }

    throw new Error(`Error al obtener datos de inventarios almacén CS. Detalles: ${errors.join(' | ')}`);
  }, [getAuthHeader]);

  // Intento seguro de leer JSON o texto del error
  async function safeReadError(response) {
    try {
      const data = await response.json();
      return data?.error?.message || JSON.stringify(data);
    } catch {
      try {
        return await response.text();
      } catch {
        return 'sin detalles';
      }
    }
  }

  const getInventarioIndirecto = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(
        `${DATAVERSE_URL}/amv_inventarioindirectoses?$select=amv_fecha,amv_producto,amv_categoria,amv_cantidad&$orderby=amv_fecha desc`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener datos de inventario');
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error en getInventarioIndirecto:', error);
      throw error;
    }
  };

  const getProductosIndirectos = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(
        `${DATAVERSE_URL}/amv_productosindirectoses?$select=amv_productosindirectosid,amv_producto,amv_categoria,amv_minimo,amv_maximo`,
        { headers }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener datos de productos');
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error en getProductosIndirectos:', error);
      throw error;
    }
  };

  const updateProductoIndirecto = async (productoId, data) => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(
        `${DATAVERSE_URL}/amv_productosindirectoses(${productoId})`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'If-Match': '*'
          },
          body: JSON.stringify({
            amv_minimo: data.amv_minimo,
            amv_maximo: data.amv_maximo
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al actualizar el producto');
      }

      return true;
    } catch (error) {
      console.error('Error en updateProductoIndirecto:', error);
      throw error;
    }
  };

  const createProductoIndirecto = async (data) => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(
        `${DATAVERSE_URL}/amv_productosindirectoses`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            amv_producto: data.amv_producto,
            amv_categoria: data.amv_categoria.charAt(0).toUpperCase() + data.amv_categoria.slice(1),
            amv_minimo: data.amv_minimo,
            amv_maximo: data.amv_maximo
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al crear el producto');
      }

      const newProduct = await response.json();
      return newProduct;
    } catch (error) {
      console.error('Error en createProductoIndirecto:', error);
      throw error;
    }
  };

  return {
    fetchTickets,
    fetchClosedTickets,
    fetchReportData,
    fetchTicketDetails,
    fetchTicketAnnotations,
    fetchAttentions,
    createAttention,
    closeTicket,
    updateTicketStatus,
    uploadFileToDataverse,
    getInventarioIndirecto,
    getProductosIndirectos,
    updateProductoIndirecto,
    createProductoIndirecto,
    getInventarioRefacciones,
    getInventarioAlmacenCS
  };
} 