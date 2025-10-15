// script.js - VERSIÓN MEJORADA CON TODAS LAS FUNCIONALIDADES
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID/exec';

let currentDate = new Date();
let events = [];
let selectedDate = null;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación mejorada...');
    setupEventListeners();
    setupColorPicker();
    checkConnection();
});

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveEventFromForm();
        });
    }

    window.addEventListener('click', function(e) {
        const modal = document.getElementById('eventModal');
        if (e.target === modal) {
            closeEventModal();
        }
    });
}

// CONFIGURAR SELECTOR DE COLOR
function setupColorPicker() {
    const colorOptions = document.querySelectorAll('.color-option');
    const colorInput = document.getElementById('eventColor');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            colorInput.value = color;
            
            // Remover clase active de todos
            colorOptions.forEach(opt => opt.classList.remove('active'));
            // Agregar clase active al seleccionado
            this.classList.add('active');
        });
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
            updateStatus('Conectado a Google Sheets', 'success');
            showNotification('✅ ' + result.message, 'success');
            await loadEvents();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        updateStatus('Error de conexión', 'error');
        showNotification('❌ ' + error.message, 'error');
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

// CARGAR EVENTOS DESDE GAS
async function loadEvents() {
    try {
        showLoading(true);
        const response = await fetch(GAS_WEB_APP_URL + '?action=getEvents');
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            events = result.events || [];
            renderCalendar();
            hideEventsList(); // Ocultar lista al cargar/recargar
            showNotification('✅ ' + result.message, 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error cargando eventos:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// GUARDAR EVENTO MEJORADO
async function saveEventFromForm() {
    const eventData = {
        id: document.getElementById('editId').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value, // NUEVO CAMPO
        location: document.getElementById('eventLocation').value,
        organizer: document.getElementById('eventOrganizer').value,
        guests: document.getElementById('eventGuests').value,
        color: document.getElementById('eventColor').value // NUEVO CAMPO
    };
    
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

// RENDERIZAR CALENDARIO MEJORADO
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonth = document.getElementById('currentMonth');
    
    if (!calendar) return;
    
    calendar.innerHTML = '';
    
    // Encabezados de días
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
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
        day.className = 'day other-month';
        day.innerHTML = `<div class="day-number">${prevMonthLastDay - i}</div>`;
        calendar.appendChild(day);
    }
    
    // Días del mes actual
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const day = document.createElement('div');
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
        
        day.className = 'day';
        day.innerHTML = `<div class="day-number">${i}</div>`;
        day.dataset.date = dateStr;
        
        // Marcar si es hoy
        if (dateStr === todayStr) {
            day.classList.add('today');
        }
        
        // Verificar si tiene eventos - MEJORADO CON COLORES Y LÍNEAS
        const dayEvents = getEventsForDate(dateStr);
        if (dayEvents.length > 0) {
            day.classList.add('has-events');
            const eventsIndicator = document.createElement('div');
            eventsIndicator.className = 'events-indicator';
            
            // Crear líneas de colores para cada evento (máximo 4 líneas)
            dayEvents.slice(0, 4).forEach(event => {
                const eventLine = document.createElement('div');
                eventLine.className = 'event-line';
                eventLine.style.backgroundColor = event.color || '#4facfe';
                eventLine.title = event.title; // Tooltip
                eventsIndicator.appendChild(eventLine);
            });
            
            day.appendChild(eventsIndicator);
        }
        
        day.addEventListener('click', () => selectDate(dateStr, day));
        calendar.appendChild(day);
    }
    
    // Días del siguiente mes
    const totalCells = 42;
    const remainingCells = totalCells - calendar.children.length;
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'day other-month';
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
    document.querySelectorAll('.day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Agregar selección actual
    dayElement.classList.add('selected');
    
    // Mostrar eventos del día
    showDayEvents(date);
    showEventsList();
}

// MOSTRAR EVENTOS DEL DÍA - MEJORADO CON DESCRIPCIÓN Y COLOR
function showDayEvents(date) {
    const eventsContainer = document.getElementById('dayEvents');
    if (!eventsContainer) return;
    
    const dayEvents = getEventsForDate(date);
    
    if (dayEvents.length === 0) {
        eventsContainer.innerHTML = '<p class="no-events">No hay eventos para este día</p>';
        return;
    }
    
    eventsContainer.innerHTML = dayEvents.map((event, index) => `
        <div class="event-item" onclick="editEvent(${index})" style="border-left-color: ${event.color || '#4facfe'}">
            <div class="event-time">
                <span class="event-color-indicator" style="background-color: ${event.color || '#4facfe'}"></span>
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
        eventsList.classList.remove('hidden');
        eventsList.classList.add('visible');
    }
}

function hideEventsList() {
    const eventsList = document.getElementById('eventsList');
    if (eventsList) {
        eventsList.style.display = 'none';
        eventsList.classList.remove('visible');
        eventsList.classList.add('hidden');
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
    
    // Resetear presets de color
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    
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
        const matchingPreset = document.querySelector(`.color-option[data-color="${event.color}"]`);
        if (matchingPreset) {
            matchingPreset.classList.add('active');
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
        const defaultPreset = document.querySelector('.color-option[data-color="#4facfe"]');
        if (defaultPreset) {
            defaultPreset.classList.add('active');
        }
        
        deleteBtn.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
}

// EDITAR EVENTO
function editEvent(index) {
    const event = events[index];
    showEventModal(event);
}

// CAMBIAR MES - MEJORADO (OCULTA LISTA DE EVENTOS)
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
    hideEventsList(); // OCULTAR lista al cambiar de mes
    selectedDate = null; // Resetear fecha seleccionada
    
    showNotification(`📅 Cambiado a ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`, 'success');
}

// FUNCIONES AUXILIARES
function updateStatus(message, type) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    if (statusDot && statusText) {
        statusText.textContent = message;
        statusDot.style.background = 
            type === 'success' ? '#28a745' : 
            type === 'error' ? '#dc3545' : '#ffc107';
    }
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

// DATOS DE EJEMPLO MEJORADOS
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