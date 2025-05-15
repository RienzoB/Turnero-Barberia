// Establece el mínimo permitido para la fecha
function setMinDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
}

// Filtra los turnos disponibles para hoy, deshabilitando las opciones previas al corte de 30 minutos
function filterAvailableTimes() {
    const dateInput = document.getElementById('date');
    if (!dateInput.value) return;

    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    if (selectedDate.toDateString() !== today.toDateString()) {
        return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoffTime = currentMinutes + 30;

    const timeSelect = document.getElementById('time');
    let validOptionExists = false;

    Array.from(timeSelect.options).forEach(option => {
        if (!option.value) return; // omite el placeholder

        const [hour, minute] = option.value.split(":").map(Number);
        const optionMinutes = hour * 60 + minute;
        if (optionMinutes < cutoffTime) {
            option.disabled = true;
            option.classList.add("disabled-time");
        } else {
            validOptionExists = true;
        }
    });

    if (!validOptionExists) {
        timeSelect.innerHTML = "<option value=''>No hay turnos disponibles</option>";
    }
}

// Genera las opciones en el <select> de turnos según la fecha y el servicio seleccionado
function generateTimeSlots() {
    const dateInput = document.getElementById('date');
    const serviceSelect = document.getElementById('service');
    const timeSelect = document.getElementById('time');
    timeSelect.innerHTML = ""; // Limpiar opciones previas

    if (!dateInput.value) {
        console.log("No se ha seleccionado una fecha.");
        return;
    }

    const dateParts = dateInput.value.split("-");
    const selectedDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    const dayOfWeek = selectedDate.getDay(); // 0=Domingo, 1=Lunes,...,6=Sábado
    console.log("Día seleccionado:", dayOfWeek);

    const serviceDuration = parseInt(serviceSelect.value);
    console.log("Duración del servicio:", serviceDuration);

    let startTime, endTime;
    // Normalizamos: interpretamos domingo como no disponible
    let normalizedDay = (dayOfWeek === 0) ? 7 : dayOfWeek;
    switch (normalizedDay) {
        case 1: // Lunes
            startTime = 15 * 60;
            endTime = 20 * 60;
            break;
        case 2: // Martes
        case 3: // Miércoles
        case 4: // Jueves
        case 5: // Viernes
            startTime = 9 * 60;
            endTime = 20 * 60;
            break;
        case 6: // Sábado
            startTime = 9 * 60;
            endTime = 18 * 60;
            break;
        default: // Domingo
            timeSelect.innerHTML = "<option value=''>No hay turnos disponibles</option>";
            console.log("Domingo, no hay turnos disponibles.");
            return;
    }
    console.log("Día de la semana (normalizado):", normalizedDay);

    // Generar opciones en incrementos iguales a la duración del servicio
    for (let minutes = startTime; minutes + serviceDuration <= endTime; minutes += serviceDuration) {
        let hour = String(Math.floor(minutes / 60)).padStart(2, '0');
        let min = String(minutes % 60).padStart(2, '0');
        const timeStr = `${hour}:${min}`;

        const option = document.createElement("option");
        option.value = timeStr;
        option.textContent = timeStr;
        timeSelect.appendChild(option);
    }

    // Una vez generados, filtra los turnos según la hora actual (si es para hoy)
    filterAvailableTimes();
}

// Actualiza los horarios reservados (deshabilita las opciones ya reservadas)
function updateReservedTimes() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    // Se usa la URL de tu Web App (para GET) y se asume que se devuelve un JSON con la propiedad "reservations"
    dateInput.addEventListener('change', function () {
        const selectedDate = dateInput.value;
        if (!selectedDate) return;
        const reservedURL = `https://script.google.com/macros/s/AKfycbxDabc73shfF3OarFqZipEn7l-8qsMdoGo1pwS58Y9mcmjzwLmz6nHR0W8xkBaWS-hW/exec?date=${selectedDate}`;
        fetch(reservedURL)
            .then(response => response.json())
            .then(data => {
                console.log("Respuesta del GET:", data);
                if (data.result === "success") {
                    // Validamos que la propiedad exista y sea un array
                    const reservedTimes = Array.isArray(data.reservations)
                        ? data.reservations
                        : [];
                    // Recorremos cada opción para deshabilitar aquellas que ya están reservadas
                    Array.from(timeSelect.options).forEach(option => {
                        if (!option.value) return;
                        reservedTimes.forEach(reservation => {
                            // Asumimos que la reserva tiene la propiedad 'start'
                            if (option.value === reservation.start) {
                                option.disabled = true;
                                if (!option.textContent.includes("(No disponible)")) {
                                    option.textContent += " (No disponible)";
                                }
                            }
                        });
                    });
                } else {
                    console.error("Error al obtener horarios reservados:", data.message);
                }
            })
            .catch(err => console.error("Error en fetch GET:", err));
    });
}

// Manejador del envío del formulario (se ha consolidado en un único listener)
document.getElementById('bookingForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Obtener los valores del formulario
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const date = document.getElementById('date').value;      // "yyyy-MM-dd"
    const time = document.getElementById('time').value;        // "HH:mm"
    const service = document.getElementById('service').value;  // "Corte de pelo" o "Corte + Barba"

    // Validar que todos los campos estén completos
    if (!name || !phone || !email || !date || !time || !service) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    // Validación: No se permiten reservas en domingo
    const selectedDate = new Date(date);
    if (selectedDate.getDay() === 0) {
        alert('Los domingos no están disponibles. Elige otro día.');
        return;
    }

    // Armar el objeto con los datos de la reserva
    const bookingData = { name, phone, email, date, time, service };

    // URL de tu Web App (URL de despliegue real)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxDabc73shfF3OarFqZipEn7l-8qsMdoGo1pwS58Y9mcmjzwLmz6nHR0W8xkBaWS-hW/exec';

    // Enviar la reserva mediante fetch (POST)
    fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    })
        .then(response => response.json())
        .then(data => {
            // Procesar la respuesta del backend
            if (data.result === 'success') {
                alert('Reserva enviada correctamente.');
                document.getElementById('bookingForm').reset();
            } else {
                console.error('Error en la reserva:', data.message);
                alert(data.message || 'Ocurrió un error, vuelve a intentarlo.');
            }
        })
        .catch(error => {
            console.error('Error en fetch POST:', error);
            alert('Ocurrió un error, vuelve a intentarlo.');
        });
});

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function () {
    console.log("Página cargada, inicializando...");
    setMinDate();
    generateTimeSlots();
    updateReservedTimes();
});

// También, actualiza los turnos disponibles al cambiar la fecha o el servicio
document.getElementById('date').addEventListener('change', generateTimeSlots);
document.getElementById('service').addEventListener('change', generateTimeSlots);
