// CONFIGURACIÓN PRINCIPAL
var SHEET_ID = '1uuszItq9nuwssQR-OaWkTuqMeBsabj1ViDj7pHFCI8I';  // ID de Google Sheets
var SHEET_NAME = 'Eventos';

// PUNTO DE ENTRADA PARA PETICIONES GET
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({version: "1.0"}))
    .setMimeType(ContentService.MimeType.JSON);
}

// PUNTO DE ENTRADA PARA PETICIONES POST - CORAZÓN DE LA API
function doPost(e) {
  try {
    var action = e.parameter.action;  // Determina qué acción ejecutar
    
    switch(action) {
      case 'getEvents':    return getEvents();      // Obtener eventos
      case 'saveEvent':    return saveEvent(e.parameter);  // Guardar evento
      case 'deleteEvent':  return deleteEvent(e.parameter.id); // Eliminar evento
      default: return errorResponse('Acción no válida');
    }
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// OBTENER TODOS LOS EVENTOS DESDE GOOGLE SHEETS
function getEvents() {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    var events = [];
    
    // Procesar filas (saltando encabezados)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        events.push({
          id: i,  // ID basado en número de fila
          date: data[i][0],      // Fecha
          time: data[i][1],      // Hora
          title: data[i][2],     // Título
          location: data[i][3],  // Lugar
          organizer: data[i][4], // Organizador
          guests: data[i][5]     // Invitados
        });
      }
    }
    
    return successResponse({events: events});
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// GUARDAR EVENTO (CREAR O ACTUALIZAR)
function saveEvent(params) {
  try {
    var sheet = getSheet();
    var eventId = params.id;
    
    // Preparar datos del evento
    var eventData = [
      params.date,
      params.time,
      params.title,
      params.location || '',
      params.organizer || '',
      params.guests || ''
    ];
    
    if (eventId && eventId !== 'null') {
      // ACTUALIZAR evento existente
      sheet.getRange(parseInt(eventId) + 1, 1, 1, 6).setValues([eventData]);
    } else {
      // CREAR nuevo evento
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 6).setValues([eventData]);
    }
    
    return successResponse({message: 'Evento guardado'});
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// ELIMINAR EVENTO
function deleteEvent(eventId) {
  try {
    var sheet = getSheet();
    sheet.deleteRow(parseInt(eventId) + 1);  // +1 por los encabezados
    return successResponse({message: 'Evento eliminado'});
  } catch (error) {
    return errorResponse(error.toString());
  }
}

// OBTENER O CREAR HOJA DE CÁLCULO
function getSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    // Crear encabezados
    sheet.getRange('A1:F1').setValues([['Fecha', 'Hora', 'Título', 'Lugar', 'Organizador', 'Invitados']]);
  }
  
  return sheet;
}

// FUNCIONES AUXILIARES PARA RESPUESTAS
function successResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    ...data
  })).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}
