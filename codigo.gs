// Configuración
var SHEET_ID = 'basecalculo123';
var SHEET_NAME = 'Calendario';

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('Calendario Interactivo');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Obtener todos los días marcados
function obtenerDiasMarcados() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    // Crear hoja si no existe
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);
      sheet.getRange('A1:B1').setValues([['Fecha', 'Estado']]);
    }
    
    var data = sheet.getDataRange().getValues();
    var diasMarcados = {};
    
    // Saltar encabezado
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        diasMarcados[data[i][0]] = data[i][1] || 'marcado';
      }
    }
    
    return diasMarcados;
  } catch (error) {
    Logger.log('Error obteniendo días: ' + error.toString());
    return {};
  }
}

// Guardar día marcado
function guardarDia(fecha, estado) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    // Crear hoja si no existe
    if (!sheet) {
      sheet = SpreadsheetApp.openById(SHEET_ID).insertSheet(SHEET_NAME);
      sheet.getRange('A1:B1').setValues([['Fecha', 'Estado']]);
    }
    
    var data = sheet.getDataRange().getValues();
    var fechaEncontrada = false;
    
    // Buscar si la fecha ya existe
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === fecha) {
        sheet.getRange(i + 1, 2).setValue(estado);
        fechaEncontrada = true;
        break;
      }
    }
    
    // Si no existe, agregar nueva fila
    if (!fechaEncontrada) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 2).setValues([[fecha, estado]]);
    }
    
    return { success: true, message: 'Día guardado correctamente' };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.toString() };
  }
}

// Eliminar día marcado
function eliminarDia(fecha) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === fecha) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    
    return { success: true, message: 'Día eliminado' };
  } catch (error) {
    return { success: false, message: 'Error: ' + error.toString() };
  }
}
