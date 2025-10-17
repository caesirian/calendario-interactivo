
// script.js - VERSIÓN CON ID ÚNICO Y FEEDBACK DE CARGA
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbznO3sH7_OBv_9A2xAtY0Kc2FdsuMUDg6k2nPdq_gmjKggNqgQiMoSalLVf95gtQqYl9Q/exec';

// Variables globales
let currentDate = new Date();
let events = [];
let selectedDate = null;
let isModalOpen = false;
let currentEditingEvent = null;
let isSaving = false; // Nuevo: controlar estado de guardado

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

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isModalOpen) {
            closeEventModal();
        }
    });
}

// CONFIGURAR SELECTOR DE COLOR MODERNO
function setupColorPickerModern() {
    const colorPresets = document.querySelectorAll('.color-preset');
    const colorInput = document.getElementById('eventColor');
    const colorName = document.getElementById('selectedColorName');
    
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
    });

    colorInput.addEventListener('input', function() {
        const hexColor = this.value;
        const preset = Array.from(colorPresets).find(p => p.getAttribute('data-color') === hexColor);
        
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

// CONFIGURAR GESTIÓN DE MODAL
function setupModalHandling() {
    const modal = document.getElementById('eventModal');
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeEventModal();
        }
    });
    
    const modalContent = modal.querySelector('.modal-container');
    modalContent.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// VERIFICAR CONEXIÓN
async function checkConnection() {
    try {
        showLoading(true);
        console.log('🔗 Probando conexión con:', GAS_WEB_APP_URL);
        
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
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

// LAZY LOADING - FUNCIÓN PRINCIPAL
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
            timestamp: Date.now()
        });
        
        console.log('📡 Solicitando eventos para rango:', range);
        const response = await fetch(GAS_WEB_APP_URL + '?' + params.toString());
        
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
            renderCalendar();
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

// MEZCLAR EVENTOS EN CACHE
function mergeEventsIntoCache(newEvents) {
    events = newEvents;
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

// CARGA NORMAL (fallback)
async function loadEventsNormal() {
    try {
        showLoading(true);
        console.log('🔄 Intentando carga normal de eventos...');
        
        const response = await fetch(GAS_WEB_APP_URL + '?action=getEvents&timestamp=' + Date.now());
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            events = result.events || [];
            renderCalendar();
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

// GUARDAR EVENTO - MEJORADO CON FEEDBACK VISUAL
async function saveEventFromForm() {
    // Prevenir múltiples envíos
    if (isSaving) {
        console.log('⏳ Guardado ya en progreso...');
        return;
    }
    
    const eventData = {
        id: document.getElementById('editId').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        location: document.getElementById('eventLocation').value,
        organizer: document.getElementById('eventOrganizer').value,
        guests: document.getElementById('eventGuests').value,
        color: document.getElementById('eventColor').value
    };
    
    if (!eventData.date || !eventData.title) {
        showNotification('❌ Fecha y título son obligatorios', 'error');
        return;
    }
    
    try {
        isSaving = true;
        showModalLoading(true); // Nuevo: feedback visual en modal
        
        const params = new URLSearchParams({
            action: 'saveEvent',
            ...eventData
        });
        
        console.log('💾 Guardando evento:', eventData);
        
        const response = await fetch(GAS_WEB_APP_URL + '?' + params.toString());
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            clearEventsCache();
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            await loadEventsLazy();
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

// ELIMINAR EVENTO - MEJORADO CON FEEDBACK VISUAL
async function deleteEvent() {
    const eventId = document.getElementById('editId').value;
    
    if (!eventId) {
        showNotification('❌ No se puede identificar el evento a eliminar', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) {
        return;
    }
    
    try {
        isSaving = true;
        showModalLoading(true); // Nuevo: feedback visual en modal
        
        console.log('🗑️ Eliminando evento ID:', eventId);
        
        const response = await fetch(GAS_WEB_APP_URL + '?action=deleteEvent&id=' + eventId);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            clearEventsCache();
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            await loadEventsLazy();
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

// RENDERIZAR CALENDARIO
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonth = document.getElementById('currentMonth');
    
    if (!calendar) return;
    
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
        day.innerHTML = `<div class="day-number">${i}</div>`;
        day.dataset.date = dateStr;
        
        if (dateStr === todayStr) {
            day.classList.add('today');
        }
        
        const dayEvents = getEventsForDate(dateStr);
        
        if (dayEvents.length > 0) {
            const eventsIndicator = document.createElement('div');
            eventsIndicator.className = 'events-indicator';
            
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
        day.innerHTML = `<div class="day-number">${i}</div>`;
        calendar.appendChild(day);
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

// BUSCAR EVENTO POR ID - NUEVA FUNCIÓN CRÍTICA
function findEventById(eventId) {
    if (!events || !Array.isArray(events)) {
        console.error('❌ No hay eventos cargados o array inválido');
        return null;
    }
    
    // Buscar por ID exacto
    const event = events.find(e => e.id == eventId); // Usar == para compatibilidad
    
    if (!event) {
        console.error('❌ Evento no encontrado con ID:', eventId);
        console.log('📋 Eventos disponibles:', events);
    }
    
    return event;
}

// SELECCIONAR FECHA
function selectDate(date, dayElement) {
    selectedDate = date;
    
    document.querySelectorAll('.calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    dayElement.classList.add('selected');
    showDayEvents(date);
    showEventsList();
}

// MOSTRAR EVENTOS DEL DÍA - CORREGIDO CON ID ÚNICO
function showDayEvents(date) {
    const eventsContainer = document.getElementById('dayEvents');
    if (!eventsContainer) return;
    
    const dayEvents = getEventsForDate(date);
    
    if (dayEvents.length === 0) {
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-day"></i>
                <p>No hay eventos para este día</p>
            </div>
        `;
        return;
    }
    
    // CORRECCIÓN: Usar ID único en lugar del índice
    eventsContainer.innerHTML = dayEvents.map(event => `
        <div class="event-card" onclick="editEventById('${event.id}')" style="border-left-color: ${event.color || '#4facfe'}">
            <div class="event-time">
                <span class="event-color-badge" style="background-color: ${event.color || '#4facfe'}"></span>
                ${event.time || 'Sin hora'}
            </div>
            <div class="event-title">${event.title || 'Sin título'}</div>
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
            <div class="event-details">
                ${event.location ? `<strong>Lugar:</strong> ${event.location}<br>` : ''}
                ${event.organizer ? `<strong>Organizador:</strong> ${event.organizer}<br>` : ''}
                ${event.guests ? `<strong>Invitados:</strong> ${event.guests}` : ''}
                <small style="color: #94a3b8; display: block; margin-top: 5px;">ID: ${event.id}</small>
            </div>
        </div>
    `).join('');
}

// EDITAR EVENTO POR ID - NUEVA FUNCIÓN CRÍTICA
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

// MODAL DE EVENTOS
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
    
    document.body.style.overflow = 'hidden';
    isModalOpen = true;
    
    document.querySelectorAll('.color-preset').forEach(opt => opt.classList.remove('active'));
    
    if (event) {
        currentEditingEvent = {...event};
        
        document.getElementById('modalTitle').textContent = 'Editar Evento';
        document.getElementById('editId').value = event.id; // CORRECCIÓN: Usar ID único
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
        
        deleteBtn.style.display = 'block';
        
        console.log('📝 Modal configurado para editar evento ID:', event.id);
    } else {
        document.getElementById('modalTitle').textContent = 'Nuevo Evento';
        document.getElementById('eventForm').reset();
        document.getElementById('editId').value = ''; // CORRECCIÓN: Limpiar ID para nuevo evento
        dateInput.value = selectedDate;
        dateInput.disabled = true;
        document.getElementById('eventTime').value = '09:00';
        colorInput.value = '#4facfe';
        
        const defaultPreset = document.querySelector('.color-preset[data-color="#4facfe"]');
        if (defaultPreset) {
            defaultPreset.classList.add('active');
            colorName.textContent = defaultPreset.getAttribute('data-name');
        }
        
        deleteBtn.style.display = 'none';
        currentEditingEvent = null;
        
        console.log('🆕 Modal configurado para nuevo evento');
    }
    
    modal.style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('eventTitle').focus();
    }, 300);
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    isModalOpen = false;
    currentEditingEvent = null;
    showModalLoading(false); // Asegurar que se quite el loading al cerrar
}

// CAMBIAR MES
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    loadEventsLazy();
    hideEventsList();
    selectedDate = null;
    preloadAdjacentMonths();
    showNotification(`📅 Cambiado a ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`, 'success');
}

// FUNCIONES AUXILIARES
function updateStatus(message, type) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    if (statusDot && statusText) {
        statusText.textContent = message;
        statusDot.style.background = 
            type === 'success' ? '#10b981' : 
            type === 'error' ? '#ef4444' : '#f59e0b';
    }
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification-toast ${type} show`;
    
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

// NUEVA FUNCIÓN: MOSTRAR LOADING EN MODAL
function showModalLoading(show) {
    const saveBtn = document.querySelector('.btn-primary');
    const deleteBtn = document.getElementById('deleteBtn');
    const cancelBtn = document.querySelector('.btn-secondary');
    
    if (show) {
        // Deshabilitar botones y mostrar loading
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        }
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        }
        if (cancelBtn) {
            cancelBtn.disabled = true;
        }
    } else {
        // Restaurar botones
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Evento';
        }
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
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

// DATOS DE EJEMPLO
function loadSampleData() {
    console.log('📋 Cargando datos de ejemplo...');
    const today = new Date().toISOString().split('T')[0];
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
        }
    ];
    renderCalendar();
    showNotification('⚠️ Usando datos de ejemplo - Verifica la conexión con Google Sheets', 'error');
}

// FUNCIONES GLOBALES
window.changeMonth = changeMonth;
window.closeEventModal = closeEventModal;
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;
window.editEventById = editEventById; // NUEVA: Exportar función por ID
window.showEventModal = showEventModal;
window.saveEventFromForm = saveEventFromForm;
window.hideEventsList = hideEventsList;
window.clearEventsCache = clearEventsCache;
