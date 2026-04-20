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
    document.getElementById('gradDateInput').value = graduationDate;
    resetTimer(); // لضبط الوقت الأولي بناءً على المدخلات
};

// --- نظام التاريخ والوقت العلوي ---
function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('ar-EG', options);
}

// --- إعدادات اللوحة (حفظ اللون والتاريخ والدقائق) ---
document.getElementById('mainSaveBtn').addEventListener('click', () => {
    // حفظ اللون
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    
    // حفظ تاريخ التخرج
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    
    // إعادة ضبط المؤقت بناءً على الدقائق الجديدة
    resetTimer();
    
    alert("تم حفظ الإعدادات بنجاح! 🩺");
});

// --- عداد التخرج التنازلي ---
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

// --- نظام المؤقت (Pomodoro) ---
function startTimer() {
    if (isRunning) return;
    isRunning = true;

    timer = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timer);
            isRunning = false;
            addPoints(); // إضافة نقاط عند الانتهاء
            alert("أحسنت يا دكتور! انتهت الجلسة وتم إضافة النقاط.");
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

// --- نظام النقاط والمحل ---
function addPoints() {
    const minsWorked = document.getElementById('minsInput').value;
    points += (minsWorked * 15);
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15;
    if (points >= cost) {
        points -= cost;
        savePoints();
        alert(`تم شراء استراحة لمدة ${min} دقائق. استمتع!`);
    } else {
        alert("النقاط غير كافية، استمر في المذاكرة! 💪");
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
    if(confirm("هل تريد تصفير نقاطك حقاً؟")) {
        points = 0;
        savePoints();
    }
}

// --- قائمة المهام ---
function addTask() {
    const input = document.getElementById('taskInput');
    if (input.value === '') return;

    const li = document.createElement('li');
    li.innerHTML = `
        <span>${input.value}</span>
        <button onclick="this.parentElement.remove()" style="min-width:auto; background:none!important; border:none!important;">❌</button>
    `;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
}
