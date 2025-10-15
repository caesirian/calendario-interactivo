// script.js - CÓDIGO COMPLETO Y FUNCIONAL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxFh-E5KVpZiOhHQWUaFM3yAe8xWp2LW_mh1uOkSxHXg75w-VjakDPnLKkS6EEbNjNX/exec';
// Variables globales
let currentDate = new Date();
let events = [];
let selectedDate = null;

// CONFIGURAR EVENT LISTENERS - ESTA ES LA FUNCIÓN QUE FALTABA
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Formulario de eventos
    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
        eventForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveEventFromForm();
        });
    }

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('eventModal');
        if (e.target === modal) {
            closeEventModal();
        }
    });
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando calendario...');
    setupEventListeners();
    checkAPIStatus();
    loadEvents();
    renderCalendar();
});

// Verificar estado de la API
async function checkAPIStatus() {
    try {
        showLoading(true);
        const response = await fetch(GAS_WEB_APP_URL);
        
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('statusText');
        
        if (response.ok) {
            statusDot.style.background = '#28a745';
            statusText.textContent = 'Conectado a Google Sheets';
            showNotification('✅ Conexión exitosa', 'success');
        } else {
            statusDot.style.background = '#ffc107';
            statusText.textContent = 'Conexión limitada';
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('statusText');
        statusDot.style.background = '#dc3545';
        statusText.textContent = 'Error de conexión';
        showNotification('❌ No se pudo conectar al servidor', 'error');
    } finally {
        showLoading(false);
    }
}

// Cargar eventos
async function loadEvents() {
    try {
        showLoading(true);
        console.log('Cargando eventos...');
        
        const params = new URLSearchParams({ action: 'getEvents' });
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Respuesta:', result);
        
        if (result.success) {
            events = result.events || [];
            console.log(`${events.length} eventos cargados`);
            renderCalendar();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error cargando eventos:', error);
        showNotification('Error cargando eventos', 'error');
        loadSampleData(); // Usar datos de ejemplo
    } finally {
        showLoading(false);
    }
}

// Renderizar calendario
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
    
    // Actualizar título del mes
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
        
        // Verificar si tiene eventos
        const dayEvents = getEventsForDate(dateStr);
        if (dayEvents.length > 0) {
            day.classList.add('has-events');
            const eventsIndicator = document.createElement('div');
            eventsIndicator.className = 'events-indicator';
            eventsIndicator.innerHTML = '<span class="event-dot"></span>'.repeat(Math.min(dayEvents.length, 3));
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

// Obtener eventos para una fecha
function getEventsForDate(date) {
    return events.filter(event => event.date === date)
                 .sort((a, b) => a.time.localeCompare(b.time));
}

// Seleccionar fecha
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
}

// Mostrar eventos del día
function showDayEvents(date) {
    const eventsContainer = document.getElementById('dayEvents');
    if (!eventsContainer) return;
    
    const dayEvents = getEventsForDate(date);
    
    if (dayEvents.length === 0) {
        eventsContainer.innerHTML = '<p class="no-events">No hay eventos para este día</p>';
        return;
    }
    
    eventsContainer.innerHTML = dayEvents.map((event, index) => `
        <div class="event-item" onclick="editEvent(${index})">
            <div class="event-time">${event.time}</div>
            <div class="event-title">${event.title}</div>
            <div class="event-details">
                ${event.location ? `<strong>Lugar:</strong> ${event.location}<br>` : ''}
                ${event.organizer ? `<strong>Organizador:</strong> ${event.organizer}` : ''}
            </div>
        </div>
    `).join('');
}

// Mostrar modal de evento
function showEventModal(event = null) {
    if (!selectedDate && !event) {
        showNotification('Por favor, selecciona una fecha primero', 'error');
        return;
    }
    
    const modal = document.getElementById('eventModal');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (event) {
        // Modo edición
        document.getElementById('modalTitle').textContent = 'Editar Evento';
        document.getElementById('editId').value = event.id;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventTime').value = event.time;
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventOrganizer').value = event.organizer || '';
        document.getElementById('eventGuests').value = event.guests || '';
        deleteBtn.style.display = 'block';
    } else {
        // Modo creación
        document.getElementById('modalTitle').textContent = 'Nuevo Evento';
        document.getElementById('eventForm').reset();
        document.getElementById('eventDate').value = selectedDate;
        document.getElementById('eventTime').value = '09:00';
        deleteBtn.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

// Cerrar modal
function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
}

// Guardar evento desde formulario
async function saveEventFromForm() {
    const eventData = {
        id: document.getElementById('editId').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        title: document.getElementById('eventTitle').value,
        location: document.getElementById('eventLocation').value,
        organizer: document.getElementById('eventOrganizer').value,
        guests: document.getElementById('eventGuests').value
    };
    
    try {
        showLoading(true);
        const params = new URLSearchParams({
            action: 'saveEvent',
            ...eventData
        });
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Evento guardado correctamente', 'success');
            closeEventModal();
            await loadEvents();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error guardando evento:', error);
        showNotification('Error guardando evento: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Editar evento
function editEvent(index) {
    const event = events[index];
    showEventModal(event);
}

// Eliminar evento
async function deleteEvent() {
    const eventId = document.getElementById('editId').value;
    
    if (!eventId || !confirm('¿Estás seguro de que quieres eliminar este evento?')) {
        return;
    }
    
    try {
        showLoading(true);
        const params = new URLSearchParams({
            action: 'deleteEvent',
            id: eventId
        });
        
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Evento eliminado', 'success');
            closeEventModal();
            await loadEvents();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error eliminando evento:', error);
        showNotification('Error eliminando evento: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Cambiar mes
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

// Funciones auxiliares
function showNotification(message, type) {
    // Crear notificación si no existe
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
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

// Datos de ejemplo para fallback
function loadSampleData() {
    console.log('Cargando datos de ejemplo...');
    const today = new Date().toISOString().split('T')[0];
    events = [
        {
            id: 1,
            date: today,
            time: '10:00',
            title: 'Reunión de equipo',
            location: 'Oficina Principal',
            organizer: 'Juan Pérez',
            guests: 'maria@empresa.com, carlos@empresa.com'
        },
        {
            id: 2,
            date: today,
            time: '14:30',
            title: 'Almuerzo con cliente',
            location: 'Restaurante Downtown',
            organizer: 'Ana García',
            guests: 'cliente@empresa.com'
        }
    ];
    
    renderCalendar();
    showNotification('Usando datos de ejemplo - Verifica la conexión', 'error');
}

// Hacer funciones globales
window.changeMonth = changeMonth;
window.closeEventModal = closeEventModal;
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;
window.showEventModal = showEventModal;
