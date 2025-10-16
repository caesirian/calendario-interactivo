// Código GAS - VERSIÓN CORREGIDA (PROBLEMA FECHA SOLUCIONADO)
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
        message: "Se requiere parámetro 'action'. Usa: test, getEvents, saveEvent, deleteEvent",
        availableActions: ["test", "getEvents", "saveEvent", "deleteEvent"]
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result;
    
    switch(action) {
      case 'test':
        result = { 
          success: true, 
          message: "✅ API funcionando correctamente",
          timestamp: new Date(),
          sheet: SHEET_NAME
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

// Obtener todos los eventos - FECHA CORREGIDA
function getEvents() {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    var events = [];
    
    // Empezar desde fila 1 (saltar encabezados)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Solo procesar filas con fecha
      if (row[0] && row[0].toString().trim() !== '') {
        events.push({
          id: i,
          date: formatDate(row[0]), // FUNCIÓN MEJORADA
          time: row[1] || '',
          title: row[2] || '',
          location: row[3] || '',
          organizer: row[4] || '',
          guests: row[5] || '',
          description: row[6] || '',
          color: row[7] || '#4facfe'
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
      params.description || '',
      params.color || '#4facfe'
    ];
    
    if (params.id && params.id !== 'null' && params.id !== '') {
      // ACTUALIZAR evento existente
      var rowNumber = parseInt(params.id);
      if (rowNumber > 0 && rowNumber < sheet.getLastRow()) {
        sheet.getRange(rowNumber + 1, 1, 1, 8).setValues([eventData]);
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
      sheet.getRange(newRow, 1, 1, 8).setValues([eventData]);
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
      // Configurar encabezados
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

// FORMATEAR FECHA - COMPLETAMENTE CORREGIDO
function formatDate(dateValue) {
  if (!dateValue) return '';
  
  // Si es string en formato correcto, devolver tal cual
  if (typeof dateValue === 'string') {
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }
    // Intentar parsear otros formatos de string
    try {
      var parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    } catch (e) {
      // Si falla, continuar con otros métodos
    }
  }
  
  // Si es número (serial de Excel/Sheets) - ESTO ARREGLA EL PROBLEMA 1899
  if (typeof dateValue === 'number') {
    // Google Sheets usa base date 30 diciembre 1899
    var baseDate = new Date(1899, 11, 30); // Mes 11 = Diciembre
    var resultDate = new Date(baseDate.getTime() + (dateValue * 24 * 60 * 60 * 1000));
    return Utilities.formatDate(resultDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  
  // Si es objeto Date
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  
  // Último intento: convertir a string y verificar
  try {
    var finalDate = new Date(dateValue);
    if (!isNaN(finalDate.getTime())) {
      return Utilities.formatDate(finalDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (error) {
    // Si todo falla, devolver string original
  }
  
  return dateValue.toString();
}
