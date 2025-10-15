// Código GAS - VERSIÓN MEJORADA
var SHEET_ID = '1uuszItq9nuwssQR-OaWkTuqMeBsabj1ViDj7pHFCI8I';
var SHEET_NAME = 'Eventos';

// Función para peticiones GET
function doGet(e) {
  return handleRequest(e);
}

// Función para peticiones POST  
function doPost(e) {
  return handleRequest(e);
}

// Manejar todas las peticiones
function handleRequest(e) {
  try {
    var action = e.parameter.action;
    
    if (!action) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Se requiere parámetro 'action'",
        availableActions: ["test", "getEvents", "saveEvent", "deleteEvent"]
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result;
    
    switch(action) {
      case 'test':
        result = { 
          success: true, 
          message: "✅ API funcionando correctamente",
          timestamp: new Date()
        };
        break;
      case 'getEvents':
        result = getEvents();
        break;
      case 'saveEvent':
        result = saveEvent(e.parameter);
        break;
      case 'deleteEvent':
        result = deleteEvent(e.parameter.id);
        break;
      default:
        result = { 
          success: false, 
          message: '❌ Acción no válida: ' + action
        };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: '❌ Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Obtener todos los eventos
function getEvents() {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    var events = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0] && row[0].toString().trim() !== '') {
        events.push({
          id: i,
          date: formatDate(row[0]),
          time: row[1] || '',
          title: row[2] || '',
          location: row[3] || '',
          organizer: row[4] || '',
          guests: row[5] || '',
          description: row[6] || '', // NUEVO CAMPO
          color: row[7] || '#4facfe' // NUEVO CAMPO - Color por defecto
        });
      }
    }
    
    return {
      success: true,
      events: events,
      total: events.length,
      message: '📅 ' + events.length + ' eventos encontrados'
    };
    
  } catch (error) {
    return {
      success: false,
      message: '❌ Error obteniendo eventos: ' + error.toString()
    };
  }
}

// Guardar evento (crear o actualizar)
function saveEvent(params) {
  try {
    var sheet = getSheet();
    
    // Validar campos requeridos
    if (!params.date) {
      return { success: false, message: '❌ La fecha es obligatoria' };
    }
    if (!params.title) {
      return { success: false, message: '❌ El título es obligatorio' };
    }
    
    var eventData = [
      params.date,
      params.time || '00:00',
      params.title,
      params.location || '',
      params.organizer || '',
      params.guests || '',
      params.description || '', // NUEVO CAMPO
      params.color || '#4facfe' // NUEVO CAMPO
    ];
    
    if (params.id && params.id !== 'null' && params.id !== '') {
      // ACTUALIZAR evento existente
      var rowNumber = parseInt(params.id);
      if (rowNumber > 0 && rowNumber < sheet.getLastRow()) {
        sheet.getRange(rowNumber + 1, 1, 1, 8).setValues([eventData]); // 8 columnas ahora
        return {
          success: true,
          message: '✅ Evento actualizado correctamente',
          action: 'updated',
          id: rowNumber
        };
      } else {
        return { success: false, message: '❌ El evento a actualizar no existe' };
      }
    } else {
      // NUEVO evento
      var newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 8).setValues([eventData]); // 8 columnas ahora
      return {
        success: true,
        message: '✅ Evento creado correctamente',
        action: 'created',
        id: newRow - 1
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: '❌ Error guardando evento: ' + error.toString()
    };
  }
}

// Eliminar evento
function deleteEvent(eventId) {
  try {
    var sheet = getSheet();
    var rowNumber = parseInt(eventId) + 1;
    
    if (rowNumber > 1 && rowNumber <= sheet.getLastRow()) {
      sheet.deleteRow(rowNumber);
      return {
        success: true,
        message: '✅ Evento eliminado correctamente'
      };
    } else {
      return {
        success: false,
        message: '❌ El evento a eliminar no existe'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      message: '❌ Error eliminando evento: ' + error.toString()
    };
  }
}

// Obtener o crear la hoja de cálculo
function getSheet() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // Crear hoja si no existe
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // Configurar encabezados ACTUALIZADOS
      var headers = [['Fecha', 'Hora', 'Título', 'Lugar', 'Organizador', 'Invitados', 'Descripción', 'Color']];
      sheet.getRange(1, 1, 1, 8).setValues(headers);
      // Formatear encabezados
      sheet.getRange(1, 1, 1, 8)
        .setFontWeight('bold')
        .setBackground('#4facfe')
        .setFontColor('white');
    }
    
    return sheet;
    
  } catch (error) {
    throw new Error('No se pudo acceder a Google Sheets');
  }
}

// Formatear fecha consistentemente - CORREGIDO
function formatDate(dateValue) {
  if (!dateValue) return '';
  
  // Si ya es string, devolver tal cual
  if (typeof dateValue === 'string') {
    // Validar formato de fecha
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }
    // Intentar parsear si es otro formato
    try {
      var date = new Date(dateValue);
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } catch (e) {
      return dateValue;
    }
  }
  
  try {
    // Si es objeto Date, formatear
    var date = new Date(dateValue);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } catch (error) {
    // Si hay error, devolver como string
    return dateValue.toString();
  }
}