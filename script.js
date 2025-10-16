// script.js - ADAPTADO AL DISEÑO MODERNO
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyF1fkKZQtfjENTzd2_yYHELn3EakfCmjw-PAATnK6mn6ZfWyALQmh_NegP8Hdrntb5Aw/exec';

let currentDate = new Date();
let eventsCache = new Map(); // Nuevo cache por rangos de fecha
let selectedDate = null;
let isModalOpen = false;
let currentRange = null;

// AGREGAR estas constantes al inicio del archivo
const LAZY_LOAD_RANGE = 45; // Días a cargar alrededor del mes visible (45 = ~1.5 meses)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Iniciando calendario moderno...');
    setupEventListeners();
    setupColorPickerModern();
    setupModalHandling();
    checkConnection();
});

// CONFIGURAR EVENT LISTENERS MEJORADO
function setupEventListeners() {
    // Prevenir envío duplicado del formulario
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }

    // Cerrar modal con ESC
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
            
            // Remover clase active de todos
            colorPresets.forEach(opt => opt.classList.remove('active'));
            // Agregar clase active al seleccionado
            this.classList.add('active');
        });
    });

    // Actualizar cuando cambia el input de color
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
        const response = await fetch(GAS_WEB_APP_URL + '?action=test');
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            updateStatus('Conectado', 'success');
            showNotification('✅ Conexión exitosa con Google Sheets', 'success');
            await loadEvents();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        updateStatus('Sin conexión', 'error');
        showNotification('❌ ' + error.message, 'error');
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

async function loadEventsLazy(targetDate = null) {
    const dateToLoad = targetDate || currentDate;
    const range = calculateLoadRange(dateToLoad);
    
    // Verificar si ya tenemos este rango en cache
    const cacheKey = `${range.start}-${range.end}`;
    const cached = eventsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('📦 Usando eventos en cache:', cacheKey);
        mergeEventsIntoCache(cached.events);
        renderCalendar();
        return;
    }
    
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            action: 'getEventsByRange',
            startDate: range.start,
            endDate: range.end
        });
        
        const response = await fetch(GAS_WEB_APP_URL + '?' + params.toString());
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            // Guardar en cache
            eventsCache.set(cacheKey, {
                events: result.events,
                timestamp: Date.now()
            });
            
            mergeEventsIntoCache(result.events);
            currentRange = range;
            renderCalendar();
            
            console.log('✅ Eventos cargados (Lazy Loading):', result.events.length, 'eventos');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error en lazy loading:', error);
        showNotification('❌ Error cargando eventos: ' + error.message, 'error');
        loadSampleData(); // Fallback a datos de ejemplo
    } finally {
        showLoading(false);
    }
}

function calculateLoadRange(centerDate) {
    const start = new Date(centerDate);
    const end = new Date(centerDate);

// GUARDAR EVENTO MEJORADO
async function saveEventFromForm() {
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
    
    // Validación básica
    if (!eventData.date || !eventData.title) {
        showNotification('❌ Fecha y título son obligatorios', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            action: 'saveEvent',
            ...eventData
        });
        
        const response = await fetch(GAS_WEB_APP_URL + '?' + params.toString());
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            await loadEvents();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error guardando evento:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
start.setDate(start.getDate() - LAZY_LOAD_RANGE);
    end.setDate(end.getDate() + LAZY_LOAD_RANGE);
    
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// AGREGAR función para mezclar eventos en cache global
function mergeEventsIntoCache(newEvents) {
    // Para simplicidad, reemplazamos todos los eventos con los nuevos
    // En una implementación más avanzada, podrías mergear inteligentemente
    window.events = newEvents;
}

// AGREGAR función para precargar meses adyacentes
function preloadAdjacentMonths() {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    
    // Precargar en segundo plano sin bloquear la UI
    setTimeout(() => {
        loadEventsLazy(nextMonth).catch(console.error);
        loadEventsLazy(prevMonth).catch(console.error);
    }, 1000);
}
// ELIMINAR EVENTO
async function deleteEvent() {
    const eventId = document.getElementById('editId').value;
    
    if (!eventId || !confirm('¿Estás seguro de que quieres eliminar este evento?')) {
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch(GAS_WEB_APP_URL + '?action=deleteEvent&id=' + eventId);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            await loadEvents();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error eliminando evento:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// RENDERIZAR CALENDARIO MODERNO
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
        
        // Marcar si es hoy
        if (dateStr === todayStr) {
            day.classList.add('today');
        }
        
        // Verificar si tiene eventos
        const dayEvents = getEventsForDate(dateStr);
        if (dayEvents.length > 0) {
            const eventsIndicator = document.createElement('div');
            eventsIndicator.className = 'events-indicator';
            
            // Crear líneas de colores para cada evento
            dayEvents.slice(0, 3).forEach(event => {
                const eventLine = document.createElement('div');
                eventLine.className = 'event-line';
                eventLine.style.backgroundColor = event.color || '#4facfe';
                eventLine.title = event.title;
                eventsIndicator.appendChild(eventLine);
            });
            
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
    return events.filter(event => event.date === date)
                 .sort((a, b) => a.time.localeCompare(b.time));
}

// SELECCIONAR FECHA - MEJORADO
function selectDate(date, dayElement) {
    selectedDate = date;
    
    // Remover selección anterior
    document.querySelectorAll('.calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Agregar selección actual
    dayElement.classList.add('selected');
    
    // Mostrar eventos del día
    showDayEvents(date);
    showEventsList();
}

// MOSTRAR EVENTOS DEL DÍA - DISEÑO MODERNO
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
    
    eventsContainer.innerHTML = dayEvents.map((event, index) => `
        <div class="event-card" onclick="editEvent(${index})" style="border-left-color: ${event.color || '#4facfe'}">
            <div class="event-time">
                <span class="event-color-badge" style="background-color: ${event.color || '#4facfe'}"></span>
                ${event.time}
            </div>
            <div class="event-title">${event.title}</div>
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
            <div class="event-details">
                ${event.location ? `<strong>Lugar:</strong> ${event.location}<br>` : ''}
                ${event.organizer ? `<strong>Organizador:</strong> ${event.organizer}<br>` : ''}
                ${event.guests ? `<strong>Invitados:</strong> ${event.guests}` : ''}
            </div>
        </div>
    `).join('');
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

// MODAL DE EVENTOS - DISEÑO MODERNO
function showEventModal(event = null) {
    if (!selectedDate && !event) {
        showNotification('Por favor, selecciona una fecha primero', 'error');
        return;
    }
    
    const modal = document.getElementById('eventModal');
    const deleteBtn = document.getElementById('deleteBtn');
    const colorInput = document.getElementById('eventColor');
    const colorName = document.getElementById('selectedColorName');
    
    // Bloquear scroll del fondo
    document.body.style.overflow = 'hidden';
    isModalOpen = true;
    
    // Resetear presets de color
    document.querySelectorAll('.color-preset').forEach(opt => opt.classList.remove('active'));
    
    if (event) {
        // Modo edición
        document.getElementById('modalTitle').textContent = 'Editar Evento';
        document.getElementById('editId').value = event.id;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventTime').value = event.time;
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventOrganizer').value = event.organizer || '';
        document.getElementById('eventGuests').value = event.guests || '';
        colorInput.value = event.color || '#4facfe';
        
        // Activar preset de color si existe
        const matchingPreset = document.querySelector(`.color-preset[data-color="${event.color}"]`);
        if (matchingPreset) {
            matchingPreset.classList.add('active');
            colorName.textContent = matchingPreset.getAttribute('data-name');
        } else {
            colorName.textContent = 'Personalizado';
        }
        
        deleteBtn.style.display = 'block';
    } else {
        // Modo creación
        document.getElementById('modalTitle').textContent = 'Nuevo Evento';
        document.getElementById('eventForm').reset();
        document.getElementById('eventDate').value = selectedDate;
        document.getElementById('eventTime').value = '09:00';
        colorInput.value = '#4facfe';
        
        // Activar preset por defecto
        const defaultPreset = document.querySelector('.color-preset[data-color="#4facfe"]');
        if (defaultPreset) {
            defaultPreset.classList.add('active');
            colorName.textContent = defaultPreset.getAttribute('data-name');
        }
        
        deleteBtn.style.display = 'none';
    }
    
    modal.style.display = 'block';
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('eventTitle').focus();
    }, 300);
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    modal.style.display = 'none';
    
    // Restaurar scroll del fondo
    document.body.style.overflow = 'auto';
    isModalOpen = false;
}

// EDITAR EVENTO
function editEvent(index) {
    const event = events[index];
    showEventModal(event);
}

// CAMBIAR MES - MEJORADO
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
    hideEventsList();
    selectedDate = null;
    
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

// DATOS DE EJEMPLO
function loadSampleData() {
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
    showNotification('Usando datos de ejemplo - Verifica la conexión', 'error');
}

// FUNCIONES GLOBALES
window.changeMonth = changeMonth;
window.closeEventModal = closeEventModal;
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;
window.showEventModal = showEventModal;
window.saveEventFromForm = saveEventFromForm;
window.hideEventsList = hideEventsList;