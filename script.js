// script.js - VERSIÓN CON MANEJO MEJORADO DE CORS
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbznO3sH7_OBv_9A2xAtY0Kc2FdsuMUDg6k2nPdq_gmjKggNqgQiMoSalLVf95gtQqYl9Q/exec';

// Variables globales
let currentDate = new Date();
let events = [];
let selectedDate = null;
let isModalOpen = false;
let currentEditingEvent = null;

// Variables para Lazy Loading
let eventsCache = new Map();
const LAZY_LOAD_RANGE = 45;
const CACHE_TTL = 5 * 60 * 1000;
let currentRange = null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Iniciando calendario moderno...');
    console.log('🔗 URL del GAS:', GAS_WEB_APP_URL);
    setupEventListeners();
    setupColorPickerModern();
    setupModalHandling();
    checkConnection();
});

// VERIFICAR CONEXIÓN - SIMPLIFICADA Y ROBUSTA
async function checkConnection() {
    try {
        showLoading(true);
        console.log('🔗 Probando conexión con:', GAS_WEB_APP_URL);
        
        // Usar parámetro timestamp para evitar cache
        const testUrl = GAS_WEB_APP_URL + '?action=test&timestamp=' + Date.now();
        console.log('📡 Test URL:', testUrl);
        
        const response = await fetch(testUrl);
        
        console.log('📨 Response status:', response.status, response.type);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 Resultado test:', result);
        
        if (result.success) {
            updateStatus('Conectado', 'success');
            showNotification('✅ Conexión exitosa con Google Sheets', 'success');
            await loadEventsLazy();
            preloadAdjacentMonths();
        } else {
            throw new Error(result.message || 'Error desconocido del servidor');
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        updateStatus('Sin conexión', 'error');
        showNotification('❌ Error de conexión: ' + error.message, 'error');
        
        // Mostrar diagnóstico completo
        console.log('🔧 Diagnóstico del error:');
        console.log('  - URL GAS:', GAS_WEB_APP_URL);
        console.log('  - Timestamp:', new Date().toISOString());
        
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

// LAZY LOADING - CON MANEJO MEJORADO DE ERRORES
async function loadEventsLazy(targetDate = null) {
    try {
        const dateToLoad = targetDate || currentDate;
        const range = calculateLoadRange(dateToLoad);
        
        const cacheKey = `${range.start}-${range.end}`;
        const cached = eventsCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            console.log('📦 Usando eventos en cache:', cacheKey);
            mergeEventsIntoCache(cached.events);
            renderCalendar();
            return;
        }
        
        showLoading(true);
        
        const params = new URLSearchParams({
            action: 'getEventsByRange',
            startDate: range.start,
            endDate: range.end,
            timestamp: Date.now() // Evitar cache
        });
        
        console.log('📡 Solicitando eventos para rango:', range);
        const response = await fetch(GAS_WEB_APP_URL + '?' + params.toString());
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            eventsCache.set(cacheKey, {
                events: result.events,
                timestamp: Date.now()
            });
            
            mergeEventsIntoCache(result.events);
            currentRange = range;
            renderCalendar();
            
            console.log('✅ Eventos cargados (Lazy Loading):', result.events.length, 'eventos');
            showNotification('✅ Calendario actualizado', 'success');
        } else {
            throw new Error(result.message || 'Error desconocido al cargar eventos');
        }
    } catch (error) {
        console.error('❌ Error en lazy loading:', error);
        showNotification('⚠️ Error cargando eventos: ' + error.message, 'error');
        await loadEventsNormal(); // Intentar carga normal
    } finally {
        showLoading(false);
    }
}

// EL RESTO DEL CÓDIGO DE SCRIPT.JS PERMANECE IGUAL...
// [Mantener todas las otras funciones igual que antes]
