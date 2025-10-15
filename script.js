// CONFIGURACIÓN - URL DE TU APLICACIÓN WEB DE GAS
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/1uuszItq9nuwssQR-OaWkTuqMeBsabj1ViDj7pHFCI8I/exec';

// VARIABLES GLOBALES DEL ESTADO DE LA APLICACIÓN
let currentDate = new Date();    // Fecha actual para navegación
let events = [];                 // Cache de eventos cargados
let selectedDate = null;         // Fecha seleccionada en el calendario

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    checkAPIStatus();    // Verificar conexión con GAS
    loadEvents();        // Cargar eventos desde el backend
    setupEventListeners(); // Configurar listeners del DOM
});

// VERIFICAR ESTADO DE LA API DE GAS
async function checkAPIStatus() {
    try {
        const response = await fetch(GAS_WEB_APP_URL);
        updateStatusIndicator(response.ok ? 'connected' : 'limited');
    } catch (error) {
        updateStatusIndicator('error');
    }
}

// ACTUALIZAR INDICADOR VISUAL DE CONEXIÓN
function updateStatusIndicator(status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');
    
    const statusConfig = {
        connected: { color: '#28a745', text: 'Conectado a GAS' },
        limited: { color: '#ffc107', text: 'Conexión limitada' },
        error: { color: '#dc3545', text: 'Error de conexión' }
    };
    
    const config = statusConfig[status] || statusConfig.error;
    statusDot.style.background = config.color;
    statusText.textContent = config.text;
}

// CARGAR EVENTOS DESDE GAS
async function loadEvents() {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({ action: 'getEvents' });
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: params
        });
        
        const result = await response.json();
        
        if (result.success) {
            events = result.events;  // Actualizar cache local
            renderCalendar();        // Re-renderizar calendario
            showNotification('Eventos cargados correctamente', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification('Error cargando eventos: ' + error.message, 'error');
        // Fallback: usar localStorage si GAS falla
        loadFromLocalStorage();
    } finally {
        showLoading(false);
    }
}

// GUARDAR EVENTO EN GAS
async function saveEvent(eventData) {
    try {
        const params = new URLSearchParams({
            action: 'saveEvent',
            id: eventData.id || '',
            date: eventData.date,
            time: eventData.time,
            title: eventData.title,
            location: eventData.location || '',
            organizer: eventData.organizer || '',
            guests: eventData.guests || ''
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
            await loadEvents(); // Recargar eventos para sincronizar
            return true;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        // Fallback: guardar en localStorage
        return saveToLocalStorage(eventData);
    }
}

// RENDERIZAR CALENDARIO
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    const currentMonth = document.getElementById('currentMonth');
    
    // Limpiar calendario anterior
    calendar.innerHTML = '';
    
    // Agregar encabezados de días
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
    // Configurar fechas para el mes actual
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar título del mes
    currentMonth.textContent = currentDate.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
    }).toUpperCase();
    
    // Lógica para generar días del calendario...
    // [Código completo para generar la grilla del calendario]
}

// MOSTRAR MODAL DE EVENTO
function showEventModal(event = null) {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    
    if (event) {
        // MODO EDICIÓN
        document.getElementById('modalTitle').textContent = 'Editar Evento';
        document.getElementById('editId').value = event.id;
        // Rellenar formulario con datos existentes...
    } else {
        // MODO CREACIÓN
        document.getElementById('modalTitle').textContent = 'Nuevo Evento';
        form.reset();
        document.getElementById('eventDate').value = selectedDate;
    }
    
    modal.style.display = 'block';
}

// MANEJADOR DE ENVÍO DEL FORMULARIO
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const eventData = {
        id: document.getElementById('editId').value,
        date: document.getElementById('eventDate').value,
        time: document.getElementById('eventTime').value,
        title: document.getElementById('eventTitle').value,
        location: document.getElementById('eventLocation').value,
        organizer: document.getElementById('eventOrganizer').value,
        guests: document.getElementById('eventGuests').value
    };
    
    const success = await saveEvent(eventData);
    
    if (success) {
        closeEventModal();
        showNotification('Evento guardado correctamente', 'success');
    }
});

// FUNCIONES AUXILIARES
function showNotification(message, type) {
    // Implementar notificación visual al usuario
    console.log(`${type}: ${message}`);
}

function showLoading(show) {
    // Mostrar/ocultar indicador de carga
}

// FALLBACKS PARA LOCALSTORAGE (POR SI GAS NO ESTÁ DISPONIBLE)
function loadFromLocalStorage() {
    const stored = localStorage.getItem('calendarEvents');
    if (stored) {
        events = JSON.parse(stored);
        renderCalendar();
    }
}

function saveToLocalStorage(eventData) {
    // Lógica para guardar en localStorage
    return true; // Simular éxito
}
