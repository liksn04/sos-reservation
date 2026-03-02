import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAFP8jTi8O_yXhLwHmQdXmQ4TjhtuZvER0",
    authDomain: "soundofshine-11625.firebaseapp.com",
    projectId: "soundofshine-11625",
    storageBucket: "soundofshine-11625.firebasestorage.app",
    messagingSenderId: "764740446334",
    appId: "1:764740446334:web:c758cac0aa955bc490d02f",
    measurementId: "G-L3X2HQTP9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // === State Management ===
    let currentDate = new Date();
    let selectedDate = new Date();

    // Reservations array (will be populated from Firebase)
    let reservations = [];

    // === DOM Elements ===
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const reservationsList = document.getElementById('reservationsList');

    const reservationModal = document.getElementById('reservationModal');
    const quickReserveBtn = document.getElementById('quickReserveBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const reservationForm = document.getElementById('reservationForm');
    const resDateInput = document.getElementById('resDate');
    const startTimeSelect = document.getElementById('startTime');
    const endTimeSelect = document.getElementById('endTime');

    // === Initialization ===
    populateTimeOptions();
    renderCalendar();
    updateScheduleView(selectedDate);
    setupRealtimeListener();

    // === Event Listeners ===
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    quickReserveBtn.addEventListener('click', () => openModal(selectedDate));
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    reservationModal.addEventListener('click', (e) => {
        if (e.target === reservationModal) closeModal();
    });

    reservationForm.addEventListener('submit', handleReservationSubmit);

    // === Firebase Functions ===

    // Initialize Time Dropdowns (30-min intervals)
    function populateTimeOptions() {
        const times = [];
        for (let h = 9; h <= 22; h++) {
            const hour = String(h).padStart(2, '0');
            times.push(`${hour}:00`);
            if (h !== 22) { // 22:30 제외
                times.push(`${hour}:30`);
            }
        }

        times.forEach(time => {
            startTimeSelect.add(new Option(time, time));
            endTimeSelect.add(new Option(time, time));
        });

        // Default values
        startTimeSelect.value = "10:00";
        endTimeSelect.value = "11:00";
    }

    // Listen to real-time updates from Firestore
    function setupRealtimeListener() {
        const q = query(collection(db, "reservations"));
        onSnapshot(q, (snapshot) => {
            reservations = [];
            snapshot.forEach((doc) => {
                reservations.push({ id: doc.id, ...doc.data() });
            });
            // Re-render views when data changes
            renderCalendar();
            updateScheduleView(selectedDate);
        });
    }

    // === Functions ===

    function renderCalendar() {
        calendarGrid.innerHTML = '';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        currentMonthYear.textContent = `${year}년 ${month + 1}월`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Add day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            const dateString = formatDate(cellDate);

            const cell = document.createElement('div');
            cell.className = 'day-cell';

            // Highlight selected date
            if (formatDate(selectedDate) === dateString) {
                cell.classList.add('active');
            }

            // Day Number
            const dayNum = document.createElement('div');
            dayNum.className = 'day-number';
            dayNum.textContent = day;

            // Text color for weekends
            if (cellDate.getDay() === 0) dayNum.style.color = '#ef4444'; // Sunday
            if (cellDate.getDay() === 6) dayNum.style.color = '#3b82f6'; // Saturday

            cell.appendChild(dayNum);

            // Add tiny indicators for existing reservations
            const dayReservations = reservations.filter(r => r.date === dateString);
            dayReservations.forEach(res => {
                const indicator = document.createElement('div');
                indicator.className = 'res-indicator';
                indicator.textContent = `${res.startTime} ${res.teamName}`;
                cell.appendChild(indicator);
            });

            // Cell Click
            cell.addEventListener('click', () => {
                selectedDate = cellDate;
                renderCalendar(); // Re-render to update active styling
                updateScheduleView(selectedDate);
            });

            calendarGrid.appendChild(cell);
        }
    }

    function updateScheduleView(date) {
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        selectedDateTitle.textContent = `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdays[date.getDay()]})`;

        const dateString = formatDate(date);
        const dayReservations = reservations.filter(r => r.date === dateString);

        // Sort by start time
        dayReservations.sort((a, b) => a.startTime.localeCompare(b.startTime));

        reservationsList.innerHTML = '';

        if (dayReservations.length === 0) {
            reservationsList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <p>이 날은 예약이 없습니다.</p>
                </div>
            `;
            return;
        }

        dayReservations.forEach(res => {
            const item = document.createElement('div');
            item.className = 'schedule-item';

            item.innerHTML = `
                <div class="schedule-item-header">
                    <span class="time-range">${res.startTime} - ${res.endTime}</span>
                    <span class="team-badge">${res.teamName}</span>
                </div>
                <div class="schedule-meta">
                    <span><i class="fa-regular fa-user"></i> ${res.userName} (${res.peopleCount}명)</span>
                </div>
                <div class="schedule-purpose">
                    ${res.purpose}
                </div>
            `;

            reservationsList.appendChild(item);
        });
    }

    function openModal(date) {
        // Pre-fill date input if opening from a specific date
        resDateInput.value = formatDate(date);
        reservationModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeModal() {
        reservationModal.classList.remove('active');
        reservationForm.reset();
        document.body.style.overflow = 'auto';
    }

    async function handleReservationSubmit(e) {
        e.preventDefault();

        const date = document.getElementById('resDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        // Validation: End time must be after Start time
        if (startTime >= endTime) {
            alert('종료 시간은 시작 시간보다 늦어야 합니다.');
            return;
        }

        // Validation: Overlap check using local array context (which should be strongly updated by real-time listener)
        const isOverlapping = reservations.some(res => {
            if (res.date === date) {
                // Time overlap logic
                return (startTime < res.endTime && endTime > res.startTime);
            }
            return false;
        });

        if (isOverlapping) {
            alert('해당 시간에 이미 예약된 일정이 있습니다. 다른 시간을 선택해주세요.');
            return;
        }

        const newReservation = {
            date: date,
            startTime: startTime,
            endTime: endTime,
            teamName: document.getElementById('teamName').value,
            userName: document.getElementById('userName').value,
            peopleCount: document.getElementById('peopleCount').value,
            purpose: document.getElementById('purpose').value,
            createdAt: new Date().toISOString()
        };

        // Add to Firestore database
        try {
            const submitBtn = document.querySelector('#reservationForm button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '예약 중...';
            submitBtn.disabled = true;

            await addDoc(collection(db, "reservations"), newReservation);

            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            closeModal();

            // If the submitted date is the currently selected date, change selected Date focus visually
            if (date !== formatDate(selectedDate)) {
                selectedDate = new Date(date);
                currentDate = new Date(date);
            }
            // Realtime listener will automatically trigger UI update shortly!
        } catch (e) {
            console.error("Error adding document: ", e);
            alert('예약 저장에 실패했습니다. 네트워크 연결을 확인해주세요.');
            const submitBtn = document.querySelector('#reservationForm button[type="submit"]');
            submitBtn.textContent = '예약 완료';
            submitBtn.disabled = false;
        }
    }

    // Helper: Format date as YYYY-MM-DD for consistency
    function formatDate(date) {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
});
