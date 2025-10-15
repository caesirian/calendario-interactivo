// Configuración - URL de tu Google Apps Script
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxFh-E5KVpZiOhHQWUaFM3yAe8xWp2LW_mh1uOkSxHXg75w-VjakDPnLKkS6EEbNjNX/exec';

// Variables globales
let currentDate = new Date();
let events = [];
let selectedDate = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando calendario...');
    setupEventListeners();
    checkAPIStatus();
    loadEvents();
});

// Configurar todos los event listeners
function setupEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Formulario de eventos
    document.getElementById('eventForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveEventFromForm();
    });

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('eventModal');
        if (e.target === modal) {
            closeEventModal();
        }
    });

    console.log('✅ Event listeners configurados');
}

// Verificar estado de la conexión con GAS
async function checkAPIStatus() {
    try {
        showLoading(true);
        const response = await fetch(GAS_WEB_APP_URL);
        
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('statusText');
        
        if (response.ok) {
            statusDot.style.background = '#28a745';
            statusText.textContent = 'Conectado a Google Sheets';
            showNotification('✅ Conexión exitosa con el servidor', 'success');
        } else {
            statusDot.style.background = '#ffc107';
            statusText.textContent = 'Conexión limitada';
            showNotification('⚠️ Conexión limitada con el servidor', 'error');
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('statusText');
        statusDot.style.background = '#dc3545';
        statusText.textContent = 'Error de conexión';
        showNotification('❌ No se pudo conectar al servidor', 'error');
    } finally {
        showLoading(false);
    }
}

// Cargar eventos desde Google Sheets
async function loadEvents() {
    try {
        showLoading(true);
        console.log('📥 Cargando eventos...');
        
        const params = new URLSearchParams({
            action: 'getEvents'
        });
        
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
        console.log('📊 Respuesta del servidor:', result);
        
        if (result.success) {
            events = result.events;
            console.log(`✅ ${events.length} eventos cargados`);
            renderCalendar();
            showNotification(`📅 ${events.length} eventos cargados`, 'success');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        showNotification('❌ Error cargando eventos: ' + error.message, 'error');
        // Fallback a datos de ejemplo
        loadSampleData();
    } finally {
        showLoading(false);
    }
}

// Renderizar el calendario
function renderCalendar() {
    console.log('🎨 Renderizando calendario...');
    const calendar = document.getElementById('calendar');
    const currentMonth = document.getElementById('currentMonth');
    
    // Limpiar calendario
    calendar.innerHTML = '';
    
    // Encabezados de días de la semana
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
    
    // Calcular fechas importantes
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay(); // 0 = Domingo
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
            // Mostrar hasta 3 puntos indicadores
            eventsIndicator.innerHTML = '<span class="event-dot"></span>'.repeat(Math.min(dayEvents.length, 3));
            day.appendChild(eventsIndicator);
        }
        
        // Event listener para seleccionar día
        day.addEventListener('click', () => selectDate(dateStr, day));
        calendar.appendChild(day);
    }
    
    // Días del siguiente mes para completar la grilla
    const totalCells = 42; // 6 semanas * 7 días
    const remainingCells = totalCells - calendar.children.length;
    
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'day other-month';
        day.innerHTML = `<div class="day-number">${i}</div>`;
        calendar.appendChild(day);
    }
    
    console.log('✅ Calendario renderizado');
}

// Obtener eventos para una fecha específica
function getEventsForDate(date) {
    return events.filter(event => event.date === date)
                 .sort((a, b) => a.time.localeCompare(b.time));
}

// Seleccionar una fecha en el calendario
function selectDate(date, dayElement) {
    console.log('📅 Fecha seleccionada:', date);
    selectedDate = date;
    
    // Remover selección anterior
    document.querySelectorAll('.day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Agregar selección actual
    dayElement.classList.add('selected');
    
    // Mostrar eventos del día seleccionado
    showDayEvents(date);
}

// Mostrar eventos del día seleccionado
function showDayEvents(date) {
    const dayEvents = getEventsForDate(date);
    const eventsContainer = document.getElementById('dayEvents');
    
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
                ${event.organizer ? `<strong>Organizador:</strong> ${event.organizer}<br>` : ''}
                ${event.guests ? `<strong>Invitados:</strong> ${event.guests}` : ''}
            </div>
        </div>
    `).join('');
}

// Mostrar modal para crear/editar evento
function showEventModal(event = null) {
    if (!selectedDate && !event) {
        showNotification('⚠️ Por favor, selecciona una fecha primero', 'error');
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

// Guardar evento desde el formulario
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
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            await loadEvents(); // Recargar eventos
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando evento:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Editar evento existente
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
            showNotification('✅ ' + result.message, 'success');
            closeEventModal();
            await loadEvents(); // Recargar eventos
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando evento:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Cambiar mes
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
    showNotification(`📅 Cambiado a ${currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`, 'success');
}

// Funciones auxiliares
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

// Datos de ejemplo para fallback
function loadSampleData() {
    console.log('📋 Cargando datos de ejemplo...');
    events = [
        {
            id: 1,
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            title: 'Reunión de equipo',
            location: 'Oficina Principal',
            organizer: 'Juan Pérez',
            guests: 'maria@empresa.com, carlos@empresa.com'
        },
        {
            id: 2,
            date: new Date().toISOString().split('T')[0],
            time: '14:30',
            title: 'Almuerzo con cliente',
            location: 'Restaurante Downtown',
            organizer: 'Ana García',
            guests: 'cliente@empresa.com'
        }
    ];
    
    renderCalendar();
    showNotification('⚠️ Usando datos de ejemplo - Verifica la conexión', 'error');
}

// Hacer funciones globales para los botones HTML
window.changeMonth = changeMonth;
window.closeEventModal = closeEventModal;
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;
window.showEventModal = showEventModal;

console.log('🎉 Script cargado correctamente');
