// script.js - VERSIÓN COMPLETA CON TODAS LAS MEJORAS
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbznO3sH7_OBv_9A2xAtY0Kc2FdsuMUDg6k2nPdq_gmjKggNqgQiMoSalLVf95gtQqYl9Q/exec';

// Variables globales
let currentDate = new Date();
let events = [];
let selectedDate = null;
let isModalOpen = false;
let currentEditingEvent = null;
let isSaving = false;
let currentView = 'month';
let currentContextEvent = null;

// Variables para Lazy Loading mejorado
let eventsCache = new Map();
const LAZY_LOAD_RANGE = 45;
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_SIZE_LIMIT = 50;
let currentRange = null;

// Variables para gestos táctiles
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 50;

// Variables para monitoreo de conexión
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 3000;

// Variables para búsqueda
let searchTerm = '';
let searchFilter = 'all';
let searchResults = [];

// Variables para vista semanal
let currentWeekStart = new Date();

// Rate limiting
const requestQueue = new Map();
const REQUEST_LIMIT = 10;
const TIME_WINDOW = 60000;

// ESQUEMA DE VALIDACIÓN COMPLETO
const eventSchema = {
    id: {
        type: 'string',
        required: false,
        validate: (value) => !value || (typeof value === 'string' && value.length <= 50)
    },
    date: {
        type: 'date',
        required: true,
        validate: (value) => isValidDate(value) && new Date(value) >= new Date().setHours(0,0,0,0)
    },
    time: {
        type: 'time',
        required: true,
        validate: isValidTime
    },
    title: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
        validate: (value) => typeof value === 'string' && value.trim().length >= 1 && value.length <= 100
    },
    description: {
        type: 'string',
        required: false,
        maxLength: 1000,
        validate: (value) => !value || (typeof value === 'string' && value.length <= 1000)
    },
    location: {
        type: 'string',
        required: false,
        maxLength: 200,
        validate: (value) => !value || (typeof value === 'string' && value.length <= 200)
    },
    organizer: {
        type: 'string',
        required: false,
        maxLength: 100,
        validate: (value) => !value || (typeof value === 'string' && value.length <= 100)
    },
    guests: {
        type: 'string',
        required: false,
        maxLength: 500,
        validate: (value) => {
            if (!value) return true;
            if (typeof value !== 'string') return false;
            if (value.length > 500) return false;
            
            const emails = value.split(',').map(email => email.trim());
            return emails.every(email => email.length <= 254);
        }
    },
    color: {
        type: 'string',
        required: false,
        validate: (value) => !value || (typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value))
    }
};

// INICIALIZACIÓN MEJORADA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Iniciando calendario moderno...');
    console.log('🔗 URL del GAS:', GAS_WEB_APP_URL);
    
    setupEventListeners();
    setupColorPickerModern();
    setupModalHandling();
    setupContextMenu();
    setupTouchGestures();
    setupConnectionMonitoring();
    setupCacheCleanup();
    setupSearchSystem();
    setupRealTimeValidation();
    initializeWeekView();
    
    checkConnection();
});

// CONFIGURAR EVENT LISTENERS MEJORADO
function setupEventListeners() {
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }

    // Manejo de teclado mejorado
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isModalOpen) {
            closeEventModal();
        }
        if (e.key === 'Escape') {
            hideContextMenu();
        }
        
        // Navegación por teclado en calendario
        if (!isModalOpen && currentView === 'month') {
            handleKeyboardNavigation(e);
        }
        
        // Atajo Ctrl+F para búsqueda
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        }
    });

    // Cerrar menú contextual mejorado
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu') && 
            !e.target.closest('.event-card') && 
            !e.target.closest('.list-event-item') && 
            !e.target.closest('.calendar-day')) {
            hideContextMenu();
        }
    });

    // Prevenir menú contextual por defecto
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.event-card') || 
            e.target.closest('.list-event-item') || 
            e.target.closest('.calendar-day')) {
            e.preventDefault();
        }
    });

    // Redimensionado con debouncing
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (currentView === 'month') {
                renderCalendar();
            } else if (currentView === 'week') {
                renderWeekView();
            }
        }, 250);
    });
}

// CONFIGURAR GESTOS TÁCTILES
function setupTouchGestures() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;

    calendar.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    calendar.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // Solo procesar si es principalmente horizontal
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
            if (diffX > 0) {
                changeMonth(1); // Deslizar izquierda -> siguiente mes
            } else {
                changeMonth(-1); // Deslizar derecha -> mes anterior
            }
        }
    }, { passive: true });
}

// CONFIGURAR MONITOREO DE CONEXIÓN
function setupConnectionMonitoring() {
    window.addEventListener('online', async function() {
        console.log('🔗 Conexión restaurada');
        updateStatus('Conectando...', 'warning');
        showNotification('🌐 Conexión restaurada - Sincronizando...', 'success');
        
        await checkConnection();
    });

    window.addEventListener('offline', function() {
        console.log('⚠️ Sin conexión');
        updateStatus('Sin conexión', 'error');
        showNotification('⚠️ Sin conexión - Modo offline', 'error');
    });
}

// CONFIGURAR LIMPIEZA AUTOMÁTICA DE CACHE
function setupCacheCleanup() {
    setInterval(() => {
        cleanupExpiredCache();
    }, CACHE_TTL);
}

// CONFIGURAR SISTEMA DE BÚSQUEDA
function setupSearchSystem() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const searchFilterSelect = document.getElementById('searchFilter');

    if (!searchInput || !clearSearch || !searchFilterSelect) return;

    // Búsqueda en tiempo real con debouncing
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });

    // Limpiar búsqueda
    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        performSearch('');
        searchInput.focus();
    });

    // Actualizar visibilidad del botón limpiar
    searchInput.addEventListener('input', function() {
        clearSearch.classList.toggle('visible', this.value.length > 0);
    });

    // Filtro de búsqueda
    searchFilterSelect.addEventListener('change', function(e) {
        searchFilter = e.target.value;
        if (searchTerm) {
            performSearch(searchTerm);
        }
    });
}

// CONFIGURAR VALIDACIÓN EN TIEMPO REAL
function setupRealTimeValidation() {
    const form = document.getElementById('eventForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldValidation(this);
        });
    });
}

// LIMPIAR CACHE EXPIRADO
function cleanupExpiredCache() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (let [key, value] of eventsCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            eventsCache.delete(key);
            expiredCount++;
        }
    }
    
    // Limitar tamaño del cache
    if (eventsCache.size > CACHE_SIZE_LIMIT) {
        const entries = Array.from(eventsCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, eventsCache.size - CACHE_SIZE_LIMIT);
        toRemove.forEach(([key]) => eventsCache.delete(key));
        
        console.log(`🗑️ Limpiados ${toRemove.length} elementos del cache por límite de tamaño`);
    }
    
    if (expiredCount > 0) {
        console.log(`🗑️ Limpiados ${expiredCount} elementos expirados del cache`);
    }
}

// RATE LIMITING MEJORADO
function checkRateLimit(endpoint) {
    const now = Date.now();
    const endpointRequests = requestQueue.get(endpoint) || [];
    
    // Limpiar requests antiguos
    const recentRequests = endpointRequests.filter(time => now - time < TIME_WINDOW);
    
    if (recentRequests.length >= REQUEST_LIMIT) {
        throw new Error('Límite de requests excedido. Por favor espera un momento.');
    }
    
    // Agregar nuevo request
    recentRequests.push(now);
    requestQueue.set(endpoint, recentRequests);
    
    return true;
}

// LLAMADA API CON RATE LIMITING
async function makeAPICall(url, options = {}) {
    try {
        checkRateLimit(url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Timeout de conexión');
        }
        throw error;
    }
}

// MANEJO DE NAVEGACIÓN POR TECLADO
function handleKeyboardNavigation(e) {
    if (!selectedDate) return;
    
    const current = new Date(selectedDate);
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            current.setDate(current.getDate() - 1);
            selectDate(current.toISOString().split('T')[0]);
            break;
        case 'ArrowRight':
            e.preventDefault();
            current.setDate(current.getDate() + 1);
            selectDate(current.toISOString().split('T')[0]);
            break;
        case 'ArrowUp':
            e.preventDefault();
            current.setDate(current.getDate() - 7);
            selectDate(current.toISOString().split('T')[0]);
            break;
        case 'ArrowDown':
            e.preventDefault();
            current.setDate(current.getDate() + 7);
            selectDate(current.toISOString().split('T')[0]);
            break;
        case 'n':
        case 'N':
            if (e.ctrlKey) {
                e.preventDefault();
                showEventModal();
            }
            break;
    }
}

// SANITIZACIÓN DE INPUTS - MEJORA DE SEGURIDAD
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// VALIDACIÓN DE FECHA MEJORADA
function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

// VALIDACIÓN DE HORA MEJORADA
function isValidTime(timeString) {
    return timeString.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/);
}

// CONFIGURAR SELECTOR DE COLOR MODERNO - MEJORADO
function setupColorPickerModern() {
    const colorPresets = document.querySelectorAll('.color-preset');
    const colorInput = document.getElementById('eventColor');
    const colorName = document.getElementById('selectedColorName');
    
    if (!colorPresets.length || !colorInput || !colorName) return;
    
    colorPresets.forEach(preset => {
        preset.addEventListener('click', function(e) {
            e.stopPropagation();
            const color = this.getAttribute('data-color');
            const name = this.getAttribute('data-name');
            
            colorInput.value = color;
            colorName.textContent = name;
            
            colorPresets.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
        
        // Soporte para teclado
        preset.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    colorInput.addEventListener('input', function() {
        const hexColor = this.value.toLowerCase();
        const preset = Array.from(colorPresets).find(p => 
            p.getAttribute('data-color').toLowerCase() === hexColor
        );
        
        if (preset) {
            colorPresets.forEach(opt => opt.classList.remove('active'));
            preset.classList.add('active');
            colorName.textContent = preset.getAttribute('data-name');
        } else {
            colorPresets.forEach(opt => opt.classList.remove('active'));
            colorName.textContent = 'Personalizado';
        }
    });
}

// CONFIGURAR GESTIÓN DE MODAL - MEJORADO
function setupModalHandling() {
    const modal = document.getElementById('eventModal');
    if (!modal) return;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeEventModal();
        }
    });
    
    const modalContent = modal.querySelector('.modal-container');
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Enfoque automático mejorado
    modal.addEventListener('animationend', function() {
        const titleInput = document.getElementById('eventTitle');
        if (titleInput && modal.style.display === 'block') {
            setTimeout(() => titleInput.focus(), 100);
        }
    });
}

// CONFIGURAR MENÚ CONTEXTUAL - MEJORADO
function setupContextMenu() {
    // Los event listeners se agregan dinámicamente
}

// VERIFICAR CONEXIÓN - MEJORADO CON REINTENTOS
async function checkConnection() {
    try {
        showLoading(true);
        console.log('🔗 Probando conexión con:', GAS_WEB_APP_URL);
        
        const testUrl = GAS_WEB_APP_URL + '?action=test&timestamp=' + Date.now();
        console.log('📡 Test URL:', testUrl);
        
        const response = await makeAPICall(testUrl);
        
        console.log('📨 Response status:', response.status, response.type);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 Resultado test:', result);
        
        if (result.success) {
            updateStatus('Conectado', 'success');
            showNotification('✅ Conexión exitosa con Google Sheets', 'success');
            reconnectAttempts = 0;
            await loadEventsLazy();
            preloadAdjacentMonths();
        } else {
            throw new Error(result.message || 'Error desconocido del servidor');
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        
        if (error.name === 'AbortError') {
            updateStatus('Timeout', 'error');
            showNotification('⏰ Timeout de conexión', 'error');
        } else {
            updateStatus('Sin conexión', 'error');
            showNotification('❌ Error de conexión: ' + error.message, 'error');
        }
        
        // Reintentar conexión
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`🔄 Reintentando conexión (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            setTimeout(() => {
                checkConnection();
            }, RECONNECT_DELAY);
        } else {
            loadSampleData();
        }
    } finally {
        showLoading(false);
    }
}

// ANUNCIAR A LECTORES DE PANTALLA
function announceToScreenReader(message) {
    const announcer = document.getElementById('announcer') || createScreenReaderAnnouncer();
    announcer.textContent = message;
    
    setTimeout(() => {
        announcer.textContent = '';
    }, 3000);
}

function createScreenReaderAnnouncer() {
    const announcer = document.createElement('div');
    announcer.id = 'announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
    return announcer;
}

// CAMBIAR VISTA - MEJORADO
function changeView(view) {
    if (currentView === view) return;
    
    currentView = view;
    const viewSelector = document.getElementById('viewSelector');
    if (viewSelector) viewSelector.value = view;
    
    // Ocultar todas las vistas
    const monthView = document.getElementById('monthView');
    const weekView = document.getElementById('weekView');
    const listView = document.getElementById('listView');
    
    if (monthView) monthView.style.display = 'none';
    if (weekView) weekView.style.display = 'none';
    if (listView) listView.style.display = 'none';
    
    // Mostrar vista seleccionada
    if (view === 'month') {
        if (monthView) monthView.style.display = 'block';
        renderCalendar();
    } else if (view === 'week') {
        if (weekView) weekView.style.display = 'block';
        renderWeekView();
    } else if (view === 'list') {
        if (listView) listView.style.display = 'block';
        renderListView();
    }
    
    const viewNames = {
        'month': 'mes',
        'week': 'semana', 
        'list': 'lista'
    };
    
    showNotification(`📊 Cambiado a vista ${viewNames[view] || view}`, 'success');
    announceToScreenReader(`Cambiado a vista ${viewNames[view] || view}`);
}

// LAZY LOADING - FUNCIÓN PRINCIPAL MEJORADA
async function loadEventsLazy(targetDate = null) {
    try {
        const dateToLoad = targetDate || currentDate;
        const range = calculateLoadRange(dateToLoad);
        
        const cacheKey = `${range.start}-${range.end}`;
        const cached = eventsCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            console.log('📦 Usando eventos en cache:', cacheKey);
            mergeEventsIntoCache(cached.events);
            if (currentView === 'month') {
                renderCalendar();
            } else if (currentView === 'week') {
                renderWeekView();
            } else {
                renderListView();
            }
            return;
        }
        
        showLoading(true);
        
        const params = new URLSearchParams({
            action: 'getEventsByRange',
            startDate: range.start,
            endDate: range.end,
            timestamp: Date.now()
        });
        
        console.log('📡 Solicitando eventos para rango:', range);
        const response = await makeAPICall(GAS_WEB_APP_URL + '?' + params.toString());
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const loadedEvents = result.events || [];
            eventsCache.set(cacheKey, {
                events: loadedEvents,
                timestamp: Date.now()
            });
            
            mergeEventsIntoCache(loadedEvents);
            currentRange = range;
            
            console.log('✅ Eventos cargados (Lazy Loading):', loadedEvents.length, 'eventos');
            
            if (currentView === 'month') {
                renderCalendar();
            } else if (currentView === 'week') {
                renderWeekView();
            } else {
                renderListView();
            }
            
            // Recargar eventos del día si hay una fecha seleccionada
            if (selectedDate) {
                await reloadDayEventsUntilUpdated(selectedDate);
            }
        } else {
            throw new Error(result.message || 'Error desconocido al cargar eventos');
        }
    } catch (error) {
        console.error('❌ Error en lazy loading:', error);
        showNotification('⚠️ Error cargando eventos: ' + error.message, 'error');
        await loadEventsNormal();
    } finally {
        showLoading(false);
    }
}

// RECARGAR EVENTOS DEL DÍA HASTA ACTUALIZAR - MEJORADO
async function reloadDayEventsUntilUpdated(date, maxAttempts = 5) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔄 Recargando eventos del día (intento ${attempts}/${maxAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const dayEvents = getEventsForDate(date);
        showDayEvents(date);
        
        if (dayEvents.length > 0) {
            console.log('✅ Eventos del día actualizados correctamente');
            break;
        }
        
        if (attempts === maxAttempts) {
            console.warn('⚠️ No se pudieron actualizar los eventos del día después de varios intentos');
        }
    }
}

// CALCULAR RANGO PARA LAZY LOADING
function calculateLoadRange(centerDate) {
    const start = new Date(centerDate);
    const end = new Date(centerDate);
    
    start.setDate(start.getDate() - LAZY_LOAD_RANGE);
    end.setDate(end.getDate() + LAZY_LOAD_RANGE);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// MEZCLAR EVENTOS EN CACHE - MEJORADO
function mergeEventsIntoCache(newEvents) {
    // Filtrar eventos duplicados
    const existingIds = new Set(events.map(e => e.id));
    const uniqueNewEvents = newEvents.filter(event => !existingIds.has(event.id));
    
    events = [...events, ...uniqueNewEvents];
    
    // Ordenar eventos por fecha
    events.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
}

// PRECARGAR MESES ADYACENTES
function preloadAdjacentMonths() {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    
    setTimeout(() => {
        loadEventsLazy(nextMonth).catch(console.error);
        loadEventsLazy(prevMonth).catch(console.error);
    }, 1000);
}

// CARGA NORMAL (fallback) - MEJORADO
async function loadEventsNormal() {
    try {
        showLoading(true);
        console.log('🔄 Intentando carga normal de eventos...');
        
        const response = await makeAPICall(GAS_WEB_APP_URL + '?action=getEvents&timestamp=' + Date.now());
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            events = result.events || [];
            if (currentView === 'month') {
                renderCalendar();
            } else if (currentView === 'week') {
                renderWeekView();
            } else {
                renderListView();
            }
            hideEventsList();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('❌ Error cargando eventos normales:', error);
        showNotification('❌ Error: ' + error.message, 'error');
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

// VALIDACIÓN DE SCHEMA COMPLETO
function validateEventData(eventData, schema) {
    const errors = [];
    const warnings = [];

    for (const [field, rules] of Object.entries(schema)) {
        const value = eventData[field];
        const isValueProvided = value !== null && value !== undefined && value !== '';

        // Validar campo requerido
        if (rules.required && !isValueProvided) {
            errors.push(`El campo "${field}" es obligatorio`);
            continue;
        }

        // Si no hay valor y no es requerido, continuar
        if (!isValueProvided) continue;

        // Validar tipo de dato
        if (rules.type === 'string' && typeof value !== 'string') {
            errors.push(`El campo "${field}" debe ser texto`);
            continue;
        }

        // Validaciones específicas
        if (rules.validate && !rules.validate(value)) {
            errors.push(`El campo "${field}" no es válido`);
            continue;
        }

        // Validar longitud mínima
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`El campo "${field}" debe tener al menos ${rules.minLength} caracteres`);
        }

        // Validar longitud máxima
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`El campo "${field}" no puede tener más de ${rules.maxLength} caracteres`);
        }

        // Advertencias para datos sospechosos
        if (field === 'title' && value.length < 3) {
            warnings.push('El título es muy corto, considera agregar más detalles');
        }

        if (field === 'date') {
            const eventDate = new Date(value);
            const today = new Date();
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(today.getFullYear() + 1);

            if (eventDate > oneYearFromNow) {
                warnings.push('La fecha del evento es muy lejana (más de 1 año)');
            }
        }
    }

    // Validaciones cruzadas
    if (eventData.date && eventData.time) {
        const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
        if (eventDateTime < new Date()) {
            warnings.push('El evento está programado en el pasado');
        }
    }

    return { isValid: errors.length === 0, errors, warnings };
}

// VALIDACIÓN DE CAMPO INDIVIDUAL
function validateFieldValue(fieldName, value, rules) {
    const errors = [];
    const warnings = [];
    const isValueProvided = value !== null && value !== undefined && value !== '';

    if (rules.required && !isValueProvided) {
        errors.push('Este campo es obligatorio');
        return { isValid: false, errors, warnings };
    }

    if (!isValueProvided) {
        return { isValid: true, errors, warnings };
    }

    if (rules.type === 'string' && typeof value !== 'string') {
        errors.push('Debe ser texto');
    }

    if (rules.validate && !rules.validate(value)) {
        errors.push('Formato inválido');
    }

    if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Mínimo ${rules.minLength} caracteres`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Máximo ${rules.maxLength} caracteres`);
    }

    return { isValid: errors.length === 0, errors, warnings };
}

function validateField(field) {
    const fieldName = field.id.replace('event', '').toLowerCase();
    const value = field.value;
    const rules = eventSchema[fieldName];
    
    if (!rules) return;
    
    const validation = validateFieldValue(fieldName, value, rules);
    
    if (!validation.isValid) {
        showFieldError(field, validation.errors[0]);
    } else if (validation.warnings.length > 0) {
        showFieldWarning(field, validation.warnings[0]);
    } else {
        showFieldSuccess(field);
    }
}

function showFieldError(field, message) {
    clearFieldValidation(field);
    field.style.borderColor = 'var(--danger)';
    field.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    field.parentNode.appendChild(errorElement);
}

function showFieldWarning(field, message) {
    clearFieldValidation(field);
    field.style.borderColor = 'var(--warning)';
    field.classList.add('warning');
    
    const warningElement = document.createElement('div');
    warningElement.className = 'field-warning';
    warningElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    field.parentNode.appendChild(warningElement);
}

function showFieldSuccess(field) {
    clearFieldValidation(field);
    field.style.borderColor = 'var(--success)';
    field.classList.add('success');
}

function clearFieldValidation(field) {
    field.style.borderColor = '';
    field.classList.remove('error', 'warning', 'success');
    
    const existingError = field.parentNode.querySelector('.field-error');
    const existingWarning = field.parentNode.querySelector('.field-warning');
    
    if (existingError) existingError.remove();
    if (existingWarning) existingWarning.remove();
}

// GUARDAR EVENTO - MEJORADO CON VALIDACIÓN Y SANITIZACIÓN
async function saveEventFromForm() {
    if (isSaving) {
        console.log('⏳ Guardado ya en progreso...');
        return;
    }
    
    // Obtener y sanitizar datos
    const eventData = {
        id: document.getElementById('editId').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        title: sanitizeInput(document.getElementById('eventTitle').value.trim()),
        description: sanitizeInput(document.getElementById('eventDescription').value.trim()),
        location: sanitizeInput(document.getElementById('eventLocation').value.trim()),
        organizer: sanitizeInput(document.getElementById('eventOrganizer').value.trim()),
        guests: sanitizeInput(document.getElementById('eventGuests').value.trim()),
        color: document.getElementById('eventColor').value
    };
    
    // Validación completa
    const validation = validateEventData(eventData, eventSchema);
    
    if (!validation.isValid) {
        showNotification('❌ ' + validation.errors[0], 'error');
        
        // Enfocar el primer campo con error
        const firstErrorField = Object.keys(eventSchema).find(field => 
            validation.errors.some(error => error.includes(field))
        );
        if (firstErrorField) {
            const fieldElement = document.getElementById(`event${firstErrorField.charAt(0).toUpperCase() + firstErrorField.slice(1)}`);
            if (fieldElement) {
                fieldElement.focus();
                validateField(fieldElement);
            }
        }
        
        return;
    }
    
    // Mostrar advertencias si las hay
    if (validation.warnings.length > 0) {
        const proceed = confirm(`Advertencias:\n${validation.warnings.join('\n')}\n\n¿Continuar con el guardado?`);
        if (!proceed) return;
    }
    
    try {
        isSaving = true;
        showModalLoading(true);
        
        const params = new URLSearchParams({
            action: 'saveEvent',
            ...eventData
        });
        
        console.log('💾 Guardando evento:', eventData);
        
        const response = await makeAPICall(GAS_WEB_APP_URL + '?' + params.toString());
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            clearEventsCache();
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            
            await loadEventsLazy();
            
            if (selectedDate) {
                await reloadDayEventsUntilUpdated(selectedDate);
            }
            
            currentEditingEvent = null;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error guardando evento:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        isSaving = false;
        showModalLoading(false);
    }
}

// ELIMINAR EVENTO - MEJORADO
async function deleteEvent() {
    const eventId = document.getElementById('editId').value;
    
    if (!eventId) {
        showNotification('❌ No se puede identificar el evento a eliminar', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        isSaving = true;
        showModalLoading(true);
        
        console.log('🗑️ Eliminando evento ID:', eventId);
        
        const response = await makeAPICall(GAS_WEB_APP_URL + '?action=deleteEvent&id=' + eventId);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            clearEventsCache();
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            
            await loadEventsLazy();
            
            if (selectedDate) {
                await reloadDayEventsUntilUpdated(selectedDate);
            }
            
            currentEditingEvent = null;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error eliminando evento:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        isSaving = false;
        showModalLoading(false);
    }
}

// FORMATEAR FECHA LEGIBLE
function formatEventDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
}

// FORMATEAR FECHA CORTA
function formatShortDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        day: 'numeric', 
        month: 'short'
    };
    return date.toLocaleDateString('es-ES', options);
}

// RENDERIZAR CALENDARIO - MEJORADO CON ACCESIBILIDAD
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonth = document.getElementById('currentMonth');
    
    if (!calendar || !currentMonth) return;
    
    calendar.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonth.textContent = currentDate.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
    }).toUpperCase();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Días del mes anterior
    for (let i = startingDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.setAttribute('role', 'gridcell');
        day.setAttribute('aria-disabled', 'true');
        day.innerHTML = `<div class="day-number">${prevMonthLastDay - i}</div>`;
        calendar.appendChild(day);
    }
    
    // Días del mes actual
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const day = document.createElement('div');
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        
        day.className = 'calendar-day';
        day.setAttribute('role', 'gridcell');
        day.setAttribute('aria-label', `Día ${i} de ${currentMonth.textContent}`);
        day.dataset.date = dateStr;
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = i;
        day.appendChild(dayNumber);
        
        if (dateStr === todayStr) {
            day.classList.add('today');
            day.setAttribute('aria-current', 'date');
        }
        
        const dayEvents = getEventsForDate(dateStr);
        
        if (dayEvents.length > 0) {
            const eventsIndicator = document.createElement('div');
            eventsIndicator.className = 'events-indicator';
            eventsIndicator.setAttribute('aria-label', `${dayEvents.length} eventos`);
            
            dayEvents.slice(0, 3).forEach(event => {
                const eventLine = document.createElement('div');
                eventLine.className = 'event-line';
                eventLine.style.backgroundColor = event.color || '#4facfe';
                eventLine.title = event.title + ' - ' + event.time;
                eventsIndicator.appendChild(eventLine);
            });
            
            if (dayEvents.length > 3) {
                const moreEvents = document.createElement('div');
                moreEvents.className = 'event-line';
                moreEvents.style.backgroundColor = '#94a3b8';
                moreEvents.title = `Y ${dayEvents.length - 3} eventos más`;
                eventsIndicator.appendChild(moreEvents);
            }
            
            day.appendChild(eventsIndicator);
        }
        
        // Agregar event listeners para menú contextual
        setupDayContextMenu(day, dateStr);
        
        day.addEventListener('click', (e) => {
            e.stopPropagation();
            selectDate(dateStr, day);
        });
        
        calendar.appendChild(day);
    }
    
    // Días del siguiente mes
    const totalCells = 42;
    const remainingCells = totalCells - calendar.children.length;
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.setAttribute('role', 'gridcell');
        day.setAttribute('aria-disabled', 'true');
        day.innerHTML = `<div class="day-number">${i}</div>`;
        calendar.appendChild(day);
    }
}

// INICIALIZAR VISTA SEMANAL
function initializeWeekView() {
    currentWeekStart = getStartOfWeek(new Date());
}

// OBTENER INICIO DE SEMANA (Lunes)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// RENDERIZAR VISTA SEMANAL
function renderWeekView() {
    const weekDaysHeader = document.querySelector('.week-days-header');
    const weekGrid = document.getElementById('weekGrid');
    const currentWeekElement = document.getElementById('currentWeek');
    
    if (!weekDaysHeader || !weekGrid || !currentWeekElement) return;
    
    // Actualizar título de la semana
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    currentWeekElement.textContent = 
        `Semana del ${formatShortDate(currentWeekStart)} al ${formatShortDate(weekEnd)}`;
    
    // Renderizar días de la semana
    weekDaysHeader.innerHTML = '';
    weekGrid.innerHTML = '';
    
    const today = new Date().toISOString().split('T')[0];
    const currentDate = new Date(currentWeekStart);
    
    for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = getEventsForDate(dateStr);
        
        // Header del día
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        dayHeader.dataset.date = dateStr;
        
        if (dateStr === today) {
            dayHeader.classList.add('today');
        }
        
        dayHeader.innerHTML = `
            <div class="week-day-name">${currentDate.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
            <div class="week-day-number">${currentDate.getDate()}</div>
            ${dayEvents.length > 0 ? `<div class="week-day-events-count">${dayEvents.length}</div>` : ''}
        `;
        
        dayHeader.addEventListener('click', () => selectWeekDay(dateStr, dayHeader));
        weekDaysHeader.appendChild(dayHeader);
        
        // Columna del día
        const dayColumn = document.createElement('div');
        dayColumn.className = 'week-day-column';
        dayColumn.dataset.date = dateStr;
        
        if (dateStr === today) {
            dayColumn.classList.add('today');
        }
        
        // Contenedor de eventos
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'week-events-container';
        
        // Slots de tiempo
        const timeSlots = document.createElement('div');
        timeSlots.className = 'week-time-slots';
        
        for (let hour = 7; hour <= 22; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'week-time-slot';
            timeSlot.style.height = '60px';
            
            if (hour % 2 === 0) {
                const timeLabel = document.createElement('div');
                timeLabel.className = 'week-time-label';
                timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
                timeSlot.appendChild(timeLabel);
            }
            
            timeSlots.appendChild(timeSlot);
        }
        
        eventsContainer.appendChild(timeSlots);
        
        // Eventos del día
        const displayedEvents = dayEvents.slice(0, 5);
        const hasMoreEvents = dayEvents.length > 5;
        
        displayedEvents.forEach(event => {
            const eventElement = createWeekEventElement(event, dateStr);
            eventsContainer.appendChild(eventElement);
        });
        
        if (hasMoreEvents) {
            const moreEventsBtn = document.createElement('button');
            moreEventsBtn.className = 'week-more-events';
            moreEventsBtn.textContent = `+ ${dayEvents.length - 5} más`;
            moreEventsBtn.addEventListener('click', () => showDayEventsModal(dateStr, dayEvents));
            eventsContainer.appendChild(moreEventsBtn);
        }
        
        dayColumn.appendChild(eventsContainer);
        weekGrid.appendChild(dayColumn);
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// CREAR ELEMENTO DE EVENTO PARA VISTA SEMANAL
function createWeekEventElement(event, dateStr) {
    const eventElement = document.createElement('div');
    eventElement.className = 'week-event';
    eventElement.style.borderLeftColor = event.color || '#4facfe';
    eventElement.title = `${event.title} - ${event.time}`;
    
    // Calcular posición basado en la hora
    const [hours, minutes] = event.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const topPosition = ((startMinutes - 420) / 60) * 60; // 7:00 = 420 minutos
    
    eventElement.style.top = `${topPosition}px`;
    eventElement.style.height = 'auto';
    
    // Compactar eventos que se solapan
    const overlappingEvents = getOverlappingEvents(dateStr, event.time);
    if (overlappingEvents.length > 2) {
        eventElement.classList.add('compact');
    }
    
    eventElement.innerHTML = `
        <div class="week-event-time">${event.time}</div>
        <div class="week-event-title">${event.title || 'Sin título'}</div>
    `;
    
    eventElement.addEventListener('click', (e) => {
        e.stopPropagation();
        editEventById(event.id);
    });
    
    return eventElement;
}

// OBTENER EVENTOS QUE SE SOLAPAN
function getOverlappingEvents(dateStr, time) {
    const dayEvents = getEventsForDate(dateStr);
    const [targetHours, targetMinutes] = time.split(':').map(Number);
    const targetTime = targetHours * 60 + targetMinutes;
    
    return dayEvents.filter(otherEvent => {
        const [otherHours, otherMinutes] = otherEvent.time.split(':').map(Number);
        const otherTime = otherHours * 60 + otherMinutes;
        return Math.abs(otherTime - targetTime) < 60;
    });
}

// SELECCIONAR DÍA EN VISTA SEMANAL
function selectWeekDay(dateStr, dayElement) {
    // Limpiar selección anterior
    document.querySelectorAll('.week-day-header.selected').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('.week-day-column.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Aplicar selección
    dayElement.classList.add('selected');
    const dayColumn = document.querySelector(`.week-day-column[data-date="${dateStr}"]`);
    if (dayColumn) {
        dayColumn.classList.add('selected');
    }
    
    // Mostrar eventos del día
    showDayEvents(dateStr);
    showEventsList();
}

// CAMBIAR SEMANA
function changeWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    renderWeekView();
    showNotification(`📅 Cambiada a semana del ${formatShortDate(currentWeekStart)}`, 'success');
}

// MODAL PARA MÁS EVENTOS
function showDayEventsModal(dateStr, events) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 600px;">
            <div class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-calendar-day"></i>
                    <h3>Eventos del ${formatEventDate(dateStr)}</h3>
                </div>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="events-container">
                    ${events.map(event => `
                        <div class="event-card" 
                             onclick="editEventById('${event.id}'); this.closest('.modal-overlay').remove()"
                             style="border-left-color: ${event.color || '#4facfe'}">
                            <div class="event-full-date">
                                <i class="fas fa-clock"></i>
                                ${event.time}
                            </div>
                            <div class="event-title">${event.title || 'Sin título'}</div>
                            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                            <div class="event-details">
                                ${event.location ? `<div><strong>Lugar:</strong> ${event.location}</div>` : ''}
                                ${event.organizer ? `<div><strong>Organizador:</strong> ${event.organizer}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// RENDERIZAR VISTA LISTA - MEJORADO
function renderListView() {
    const container = document.getElementById('eventsListContainer');
    if (!container) return;
    
    // Si hay búsqueda activa, mostrar resultados
    if (searchTerm && searchResults.length > 0) {
        renderSearchResultsInList();
        return;
    }
    
    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-day" aria-hidden="true"></i>
                <p>No hay eventos para mostrar</p>
            </div>
        `;
        return;
    }
    
    // Agrupar eventos por mes
    const eventsByMonth = {};
    events.forEach(event => {
        const date = new Date(event.date);
        const monthKey = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        
        if (!eventsByMonth[monthKey]) {
            eventsByMonth[monthKey] = [];
        }
        eventsByMonth[monthKey].push(event);
    });
    
    // Ordenar meses
    const sortedMonths = Object.keys(eventsByMonth).sort((a, b) => {
        return new Date(a) - new Date(b);
    });
    
    container.innerHTML = sortedMonths.map(month => {
        const monthEvents = eventsByMonth[month].sort((a, b) => {
            return new Date(a.date) - new Date(b.date) || a.time.localeCompare(b.time);
        });
        
        return `
            <div class="month-group">
                <h3 class="month-title">${month}</h3>
                <div class="events-list" role="list">
                    ${monthEvents.map(event => `
                        <div class="list-event-item" 
                             onclick="editEventById('${event.id}')"
                             style="border-left-color: ${event.color || '#4facfe'}"
                             role="listitem"
                             tabindex="0"
                             aria-label="Evento: ${event.title || 'Sin título'} el ${formatEventDate(event.date)} a las ${event.time}">
                            <div class="list-event-date">
                                ${formatEventDate(event.date)} - ${event.time}
                            </div>
                            <div class="list-event-title">${event.title || 'Sin título'}</div>
                            <div class="list-event-details">
                                ${event.location ? `<div><strong>Lugar:</strong> ${event.location}</div>` : ''}
                                ${event.organizer ? `<div><strong>Organizador:</strong> ${event.organizer}</div>` : ''}
                                ${event.description ? `<div>${event.description}</div>` : ''}
                            </div>
                            <div class="list-event-meta">
                                ${event.guests ? `<span><i class="fas fa-users" aria-hidden="true"></i> ${event.guests.split(',').length} invitados</span>` : ''}
                                <span class="copy-hint">Mantén presionado para copiar</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    // Agregar event listeners para menú contextual
    setTimeout(() => {
        document.querySelectorAll('.list-event-item').forEach(item => {
            setupEventContextMenu(item);
            
            // Soporte para teclado
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }, 100);
}

// SISTEMA DE BÚSQUEDA
function performSearch(term) {
    searchTerm = term.toLowerCase().trim();
    
    if (!searchTerm) {
        searchResults = [];
        clearSearchResults();
        return;
    }

    // Filtrar eventos basado en el término y filtro
    searchResults = events.filter(event => {
        if (!event) return false;

        const searchableFields = {
            all: [event.title, event.description, event.location, event.organizer, event.guests],
            title: [event.title],
            description: [event.description],
            location: [event.location],
            organizer: [event.organizer]
        };

        const fieldsToSearch = searchableFields[searchFilter] || searchableFields.all;
        
        return fieldsToSearch.some(field => 
            field && field.toLowerCase().includes(searchTerm)
        );
    });

    displaySearchResults();
}

// MOSTRAR RESULTADOS DE BÚSQUEDA
function displaySearchResults() {
    if (currentView === 'list') {
        renderSearchResultsInList();
    } else {
        showSearchResultsModal();
    }
}

// RENDERIZAR RESULTADOS EN VISTA LISTA
function renderSearchResultsInList() {
    const container = document.getElementById('eventsListContainer');
    if (!container) return;
    
    if (searchResults.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>No hay eventos que coincidan con "${searchTerm}"</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="search-results-header">
            <div class="search-results-info">
                ${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${searchTerm}"
            </div>
            <div class="search-results-actions">
                <button class="btn btn-secondary" onclick="clearSearch()">
                    <i class="fas fa-times"></i>
                    Limpiar búsqueda
                </button>
            </div>
        </div>
        <div class="events-list">
            ${searchResults.map(event => `
                <div class="list-event-item" 
                     onclick="editEventById('${event.id}')"
                     style="border-left-color: ${event.color || '#4facfe'}">
                    <div class="list-event-date">
                        ${formatEventDate(event.date)} - ${event.time}
                    </div>
                    <div class="list-event-title">${highlightSearchTerm(event.title || 'Sin título')}</div>
                    <div class="list-event-details">
                        ${event.location ? `<div><strong>Lugar:</strong> ${highlightSearchTerm(event.location)}</div>` : ''}
                        ${event.organizer ? `<div><strong>Organizador:</strong> ${highlightSearchTerm(event.organizer)}</div>` : ''}
                        ${event.description ? `<div>${highlightSearchTerm(event.description)}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// RESALTAR TÉRMINOS DE BÚSQUEDA
function highlightSearchTerm(text) {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// MODAL DE RESULTADOS DE BÚSQUEDA (para otras vistas)
function showSearchResultsModal() {
    if (searchResults.length === 0) {
        showNotification(`No se encontraron resultados para "${searchTerm}"`, 'info');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 800px;">
            <div class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-search"></i>
                    <h3>Resultados de búsqueda</h3>
                </div>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="search-results-header">
                    <div class="search-results-info">
                        ${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} para "${searchTerm}"
                    </div>
                </div>
                <div class="events-list">
                    ${searchResults.map(event => `
                        <div class="list-event-item" 
                             onclick="editEventById('${event.id}'); this.closest('.modal-overlay').remove()"
                             style="border-left-color: ${event.color || '#4facfe'}">
                            <div class="list-event-date">
                                ${formatEventDate(event.date)} - ${event.time}
                            </div>
                            <div class="list-event-title">${highlightSearchTerm(event.title || 'Sin título')}</div>
                            <div class="list-event-details">
                                ${event.location ? `<div><strong>Lugar:</strong> ${highlightSearchTerm(event.location)}</div>` : ''}
                                ${event.organizer ? `<div><strong>Organizador:</strong> ${highlightSearchTerm(event.organizer)}</div>` : ''}
                                ${event.description ? `<div>${highlightSearchTerm(event.description)}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                    Cerrar
                </button>
                <button type="button" class="btn btn-primary" onclick="changeView('list'); this.closest('.modal-overlay').remove()">
                    <i class="fas fa-list"></i>
                    Ver en lista
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// LIMPIAR BÚSQUEDA
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.remove('visible');
    
    searchTerm = '';
    searchResults = [];
    
    if (currentView === 'list') {
        renderListView();
    } else {
        showNotification('Búsqueda limpiada', 'success');
    }
}

// LIMPIAR RESULTADOS DE BÚSQUEDA
function clearSearchResults() {
    if (currentView === 'list') {
        renderListView();
    }
}

// CONFIGURAR MENÚ CONTEXTUAL PARA DÍAS - MEJORADO
function setupDayContextMenu(dayElement, dateStr) {
    let pressTimer;
    
    dayElement.addEventListener('touchstart', function(e) {
        pressTimer = setTimeout(() => {
            showDayContextMenu(dateStr, e);
        }, 500);
    }, { passive: true });
    
    dayElement.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
    }, { passive: true });
    
    dayElement.addEventListener('touchcancel', function() {
        clearTimeout(pressTimer);
    }, { passive: true });
    
    dayElement.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showDayContextMenu(dateStr, e);
    });
}

// CONFIGURAR MENÚ CONTEXTUAL PARA EVENTOS - MEJORADO
function setupEventContextMenu(eventElement) {
    let pressTimer;
    
    eventElement.addEventListener('touchstart', function(e) {
        pressTimer = setTimeout(() => {
            const eventId = eventElement.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (eventId) {
                const event = findEventById(eventId);
                if (event) {
                    showEventContextMenu(event, e);
                }
            }
        }, 500);
    }, { passive: true });
    
    eventElement.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
    }, { passive: true });
    
    eventElement.addEventListener('touchcancel', function() {
        clearTimeout(pressTimer);
    }, { passive: true });
    
    eventElement.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const eventId = eventElement.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (eventId) {
            const event = findEventById(eventId);
            if (event) {
                showEventContextMenu(event, e);
            }
        }
    });
}

// MOSTRAR MENÚ CONTEXTUAL PARA DÍAS
function showDayContextMenu(dateStr, e) {
    const dayEvents = getEventsForDate(dateStr);
    if (dayEvents.length === 0) return;
    
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    const rect = menu.getBoundingClientRect();
    
    // Asegurar que el menú no se salga de la pantalla
    let x = e.clientX || e.touches[0].clientX;
    let y = e.clientY || e.touches[0].clientY;
    
    if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 10;
    }
    
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    currentContextEvent = { date: dateStr, events: dayEvents };
}

// MOSTRAR MENÚ CONTEXTUAL PARA EVENTOS
function showEventContextMenu(event, e) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    
    const rect = menu.getBoundingClientRect();
    
    let x = e.clientX || e.touches[0].clientX;
    let y = e.clientY || e.touches[0].clientY;
    
    if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 10;
    }
    
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    currentContextEvent = event;
}

// OCULTAR MENÚ CONTEXTUAL
function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.style.display = 'none';
    }
    currentContextEvent = null;
}

// COPIAR INFORMACIÓN DEL EVENTO - MEJORADO
async function copyEventData() {
    if (!currentContextEvent) return;
    
    let text = '';
    
    if (currentContextEvent.events) {
        // Es un día con múltiples eventos
        text = `Eventos del ${formatEventDate(currentContextEvent.date)}\n\n`;
        currentContextEvent.events.forEach((event, index) => {
            text += `${index + 1}. ${event.title} - ${event.time}\n`;
            if (event.location) text += `   Lugar: ${event.location}\n`;
            if (event.organizer) text += `   Organizador: ${event.organizer}\n`;
            if (event.description) text += `   Descripción: ${event.description}\n`;
            text += '\n';
        });
    } else {
        // Es un evento individual
        const event = currentContextEvent;
        text = `Evento: ${event.title}\n`;
        text += `Fecha: ${formatEventDate(event.date)}\n`;
        text += `Hora: ${event.time}\n`;
        if (event.location) text += `Lugar: ${event.location}\n`;
        if (event.organizer) text += `Organizador: ${event.organizer}\n`;
        if (event.guests) text += `Invitados: ${event.guests}\n`;
        if (event.description) text += `Descripción: ${event.description}\n`;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showNotification('✅ Información copiada al portapapeles', 'success');
        hideContextMenu();
    } catch (err) {
        console.error('Error al copiar: ', err);
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('✅ Información copiada al portapapeles', 'success');
        } catch (fallbackErr) {
            console.error('Fallback copy failed: ', fallbackErr);
            showNotification('❌ Error al copiar información', 'error');
        }
        document.body.removeChild(textArea);
        hideContextMenu();
    }
}

// OBTENER EVENTOS PARA FECHA
function getEventsForDate(date) {
    if (!events || !Array.isArray(events)) {
        return [];
    }
    
    const dayEvents = events.filter(event => {
        if (!event || !event.date) return false;
        
        const eventDate = new Date(event.date).toISOString().split('T')[0];
        const targetDate = new Date(date).toISOString().split('T')[0];
        
        return eventDate === targetDate;
    }).sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
    });
    
    return dayEvents;
}

// BUSCAR EVENTO POR ID - MEJORADO
function findEventById(eventId) {
    if (!events || !Array.isArray(events)) {
        console.error('❌ No hay eventos cargados o array inválido');
        return null;
    }
    
    const event = events.find(e => e.id == eventId);
    
    if (!event) {
        console.error('❌ Evento no encontrado con ID:', eventId);
    }
    
    return event;
}

// SELECCIONAR FECHA - MEJORADO
function selectDate(date, dayElement = null) {
    selectedDate = date;
    
    document.querySelectorAll('.calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    if (dayElement) {
        dayElement.classList.add('selected');
    } else {
        // Encontrar el elemento del día si no se proporciona
        const dayElem = document.querySelector(`.calendar-day[data-date="${date}"]`);
        if (dayElem) {
            dayElem.classList.add('selected');
        }
    }
    
    showDayEvents(date);
    showEventsList();
    
    // Anunciar para lectores de pantalla
    announceToScreenReader(`Seleccionado ${formatEventDate(date)}. ${getEventsForDate(date).length} eventos.`);
}

// MOSTRAR EVENTOS DEL DÍA - MEJORADO
function showDayEvents(date) {
    const eventsContainer = document.getElementById('dayEvents');
    if (!eventsContainer) return;
    
    const dayEvents = getEventsForDate(date);
    
    if (dayEvents.length === 0) {
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-day" aria-hidden="true"></i>
                <p>No hay eventos para este día</p>
            </div>
        `;
        return;
    }
    
    eventsContainer.innerHTML = dayEvents.map(event => `
        <div class="event-card" 
             onclick="editEventById('${event.id}')" 
             style="border-left-color: ${event.color || '#4facfe'}"
             role="listitem"
             tabindex="0"
             aria-label="Evento: ${event.title || 'Sin título'} a las ${event.time}">
            <div class="event-full-date">
                <i class="fas fa-calendar-day" aria-hidden="true"></i>
                ${formatEventDate(event.date)} - ${event.time}
            </div>
            <div class="event-title">${event.title || 'Sin título'}</div>
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
            <div class="event-details">
                ${event.location ? `<div><strong>Lugar:</strong> ${event.location}</div>` : ''}
                ${event.organizer ? `<div><strong>Organizador:</strong> ${event.organizer}</div>` : ''}
                ${event.guests ? `<div><strong>Invitados:</strong> ${event.guests}</div>` : ''}
            </div>
            <div class="copy-hint">Mantén presionado para copiar</div>
        </div>
    `).join('');
    
    // Agregar event listeners para menú contextual y teclado
    setTimeout(() => {
        document.querySelectorAll('.event-card').forEach(card => {
            setupEventContextMenu(card);
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });
    }, 100);
}

// EDITAR EVENTO POR ID - MEJORADO
function editEventById(eventId) {
    console.log('✏️ Editando evento ID:', eventId);
    
    const event = findEventById(eventId);
    
    if (!event) {
        showNotification('❌ No se pudo encontrar el evento seleccionado', 'error');
        return;
    }
    
    console.log('📋 Evento encontrado:', event);
    showEventModal(event);
}

// EDITAR EVENTO (mantener por compatibilidad)
function editEvent(index) {
    console.warn('⚠️ Usando editEvent por índice - método obsoleto');
    if (events[index]) {
        editEventById(events[index].id);
    }
}

// MOSTRAR/OCULTAR LISTA DE EVENTOS
function showEventsList() {
    const eventsList = document.getElementById('eventsList');
    if (eventsList) {
        eventsList.style.display = 'block';
    }
}

function hideEventsList() {
    const eventsList = document.getElementById('eventsList');
    if (eventsList) {
        eventsList.style.display = 'none';
    }
}

// MODAL DE EVENTOS - MEJORADO
function showEventModal(event = null) {
    if (!selectedDate && !event) {
        showNotification('Por favor, selecciona una fecha primero', 'error');
        return;
    }
    
    const modal = document.getElementById('eventModal');
    const deleteBtn = document.getElementById('deleteBtn');
    const colorInput = document.getElementById('eventColor');
    const colorName = document.getElementById('selectedColorName');
    const dateInput = document.getElementById('eventDate');
    
    if (!modal || !colorInput || !colorName || !dateInput) return;
    
    document.body.style.overflow = 'hidden';
    isModalOpen = true;
    
    document.querySelectorAll('.color-preset').forEach(opt => opt.classList.remove('active'));
    
    if (event) {
        currentEditingEvent = {...event};
        
        document.getElementById('modalTitle').textContent = 'Editar Evento';
        document.getElementById('editId').value = event.id;
        dateInput.value = event.date;
        dateInput.disabled = false;
        document.getElementById('eventTime').value = event.time;
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventOrganizer').value = event.organizer || '';
        document.getElementById('eventGuests').value = event.guests || '';
        colorInput.value = event.color || '#4facfe';
        
        const matchingPreset = document.querySelector(`.color-preset[data-color="${event.color}"]`);
        if (matchingPreset) {
            matchingPreset.classList.add('active');
            colorName.textContent = matchingPreset.getAttribute('data-name');
        } else {
            colorName.textContent = 'Personalizado';
        }
        
        if (deleteBtn) deleteBtn.style.display = 'block';
        
        console.log('📝 Modal configurado para editar evento ID:', event.id);
    } else {
        document.getElementById('modalTitle').textContent = 'Nuevo Evento';
        document.getElementById('eventForm').reset();
        document.getElementById('editId').value = '';
        dateInput.value = selectedDate;
        dateInput.disabled = true;
        document.getElementById('eventTime').value = '09:00';
        colorInput.value = '#4facfe';
        
        const defaultPreset = document.querySelector('.color-preset[data-color="#4facfe"]');
        if (defaultPreset) {
            defaultPreset.classList.add('active');
            colorName.textContent = defaultPreset.getAttribute('data-name');
        }
        
        if (deleteBtn) deleteBtn.style.display = 'none';
        currentEditingEvent = null;
        
        console.log('🆕 Modal configurado para nuevo evento');
    }
    
    modal.style.display = 'block';
    
    // Enfoque mejorado
    setTimeout(() => {
        const titleInput = document.getElementById('eventTitle');
        if (titleInput) {
            titleInput.focus();
        }
    }, 300);
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    isModalOpen = false;
    currentEditingEvent = null;
    showModalLoading(false);
}

// CAMBIAR MES - MEJORADO
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    loadEventsLazy();
    hideEventsList();
    selectedDate = null;
    preloadAdjacentMonths();
    
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    showNotification(`📅 Cambiado a ${monthName}`, 'success');
    announceToScreenReader(`Cambiado a ${monthName}`);
}

// EXPORTAR EVENTOS - MEJORADO
function exportEvents() {
    if (!events || events.length === 0) {
        showNotification('❌ No hay eventos para exportar', 'error');
        return;
    }
    
    try {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Fecha,Hora,Título,Lugar,Organizador,Invitados,Descripción,Color\n"
            + events.map(event => 
                `"${event.date}","${event.time}","${event.title}","${event.location}","${event.organizer}","${event.guests}","${event.description}","${event.color}"`
            ).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `eventos_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('✅ Eventos exportados correctamente', 'success');
    } catch (error) {
        console.error('Error exportando eventos:', error);
        showNotification('❌ Error al exportar eventos', 'error');
    }
}

// FUNCIONES AUXILIARES MEJORADAS
function updateStatus(message, type) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    if (statusDot && statusText) {
        statusText.textContent = message;
        statusDot.style.background = 
            type === 'success' ? '#10b981' : 
            type === 'error' ? '#ef4444' : '#f59e0b';
            
        // Animación de pulso solo para estados de advertencia
        if (type === 'warning') {
            statusDot.style.animation = 'pulse 2s infinite';
        } else {
            statusDot.style.animation = 'none';
        }
    }
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification-toast ${type} show`;
    
    // Anunciar para lectores de pantalla
    announceToScreenReader(message);
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.add('show');
        } else {
            loading.classList.remove('show');
        }
    }
}

// MOSTRAR LOADING EN MODAL MEJORADO
function showModalLoading(show) {
    const saveBtn = document.querySelector('.btn-primary');
    const deleteBtn = document.getElementById('deleteBtn');
    const cancelBtn = document.querySelector('.btn-secondary');
    
    if (show) {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Guardando...';
            saveBtn.setAttribute('aria-label', 'Guardando evento...');
        }
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Eliminando...';
            deleteBtn.setAttribute('aria-label', 'Eliminando evento...');
        }
        if (cancelBtn) {
            cancelBtn.disabled = true;
        }
    } else {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save" aria-hidden="true"></i> Guardar Evento';
            saveBtn.setAttribute('aria-label', 'Guardar evento');
        }
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i> Eliminar';
            deleteBtn.setAttribute('aria-label', 'Eliminar evento');
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
    }
}

// LIMPIAR CACHE
function clearEventsCache() {
    eventsCache.clear();
    console.log('🗑️ Cache de eventos limpiado');
}

// DATOS DE EJEMPLO MEJORADOS
function loadSampleData() {
    console.log('📋 Cargando datos de ejemplo...');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    events = [
        {
            id: 1,
            date: today,
            time: '10:00',
            title: 'Reunión de equipo',
            description: 'Revisión semanal de proyectos y planificación',
            location: 'Oficina Principal',
            organizer: 'Juan Pérez',
            guests: 'maria@empresa.com, carlos@empresa.com',
            color: '#4facfe'
        },
        {
            id: 2,
            date: today,
            time: '14:30',
            title: 'Almuerzo con cliente',
            description: 'Presentación de nuevas propuestas comerciales',
            location: 'Restaurante Downtown',
            organizer: 'Ana García',
            guests: 'cliente@empresa.com',
            color: '#43e97b'
        },
        {
            id: 3,
            date: tomorrowStr,
            time: '16:00',
            title: 'Entrevista de trabajo',
            description: 'Entrevista con candidato para puesto de desarrollador',
            location: 'Sala de Conferencias B',
            organizer: 'Carlos López',
            guests: 'candidato@ejemplo.com',
            color: '#fa709a'
        }
    ];
    
    if (currentView === 'month') {
        renderCalendar();
    } else if (currentView === 'week') {
        renderWeekView();
    } else {
        renderListView();
    }
    
    showNotification('⚠️ Usando datos de ejemplo - Verifica la conexión con Google Sheets', 'error');
}

// FUNCIONES GLOBALES
window.changeMonth = changeMonth;
window.changeWeek = changeWeek;
window.changeView = changeView;
window.closeEventModal = closeEventModal;
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;
window.editEventById = editEventById;
window.showEventModal = showEventModal;
window.saveEventFromForm = saveEventFromForm;
window.hideEventsList = hideEventsList;
window.clearEventsCache = clearEventsCache;
window.copyEventData = copyEventData;
window.hideContextMenu = hideContextMenu;
window.exportEvents = exportEvents;
window.clearSearch = clearSearch;
