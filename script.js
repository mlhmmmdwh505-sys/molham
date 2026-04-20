// --- المتغيرات الأساسية ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

// تحديث الشاشة عند التحميل
window.onload = () => {
    updatePointsDisplay();
    displayDate();
    startGraduationCountdown();
    
    // استعادة القيم المحفوظة في الواجهة
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
};

// --- التحديث الفوري (بدون زر حفظ) ---

// 1. تحديث اللون فوراً عند اختياره
document.getElementById('colorPicker').addEventListener('input', (e) => {
    const newColor = e.target.value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
});

// 2. تحديث تاريخ التخرج فوراً عند تغييره
document.getElementById('gradDateInput').addEventListener('change', (e) => {
    graduationDate = e.target.value;
    localStorage.setItem('gradDate', graduationDate);
});

// 3. تحديث وقت المؤقت فوراً عند تغيير الدقائق
document.getElementById('minsInput').addEventListener('input', () => {
    if (!isRunning) resetTimer();
});

// --- بقية الدوال الوظيفية ---

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('ar-EG', options);
}

function startGraduationCountdown() {
    setInterval(() => {
        const now = new Date().getTime();
        const gap = new Date(graduationDate).getTime() - now;
        if (gap > 0) {
            const second = 1000, minute = second * 60, hour = minute * 60, day = hour * 24, year = day * 365;
            document.getElementById('years').innerText = Math.floor(gap / year);
            document.getElementById('days').innerText = Math.floor((gap % year) / day);
            document.getElementById('hours').innerText = Math.floor((gap % day) / hour);
        }
    }, 1000);
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timer = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timer);
            isRunning = false;
            addPoints();
        } else {
            timeLeft--;
            updateTimerDisplay();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    const mins = document.getElementById('minsInput').value || 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = 
        `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value);
    points += (minsWorked * 15);
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15;
    if (points >= cost) {
        points -= cost;
        savePoints();
    } else {
        alert("النقاط غير كافية! 🩺");
    }
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    document.getElementById('userPoints').innerText = points;
}

function resetPoints() {
    points = 0;
    savePoints();
}

function addTask() {
    const input = document.getElementById('taskInput');
    if (input.value.trim() === '') return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span><button onclick="this.parentElement.remove()" style="min-width:auto; background:none!important; border:none!important;">❌</button>`;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
}
