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
    
    // استعادة القيم من المتصفح ووضعها في الخانات
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
};

// --- تفعيل زر "تأكيد الإعدادات" ليعمل فورا وبصمت ---
document.getElementById('mainSaveBtn').addEventListener('click', () => {
    // 1. تحديث وحفظ اللون
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    // 2. تحديث وحفظ تاريخ التخرج
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    
    // 3. إعادة ضبط المؤقت بناءً على الدقائق الجديدة (إذا لم يكن يعمل)
    if (!isRunning) {
        resetTimer();
    }
    
    // ملاحظة: تم حذف الـ alert هنا ليكون التنفيذ فورياً وصامتاً
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
// دالة التحكم الشاملة (تشغيل / إيقاف مؤقت)
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (!isRunning) {
        // إذا كان متوقفاً -> ابدأ التشغيل
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        btn.style.borderColor = "#ff4444"; // تغيير اللون للأحمر للتنبيه

        timer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timer);
                isRunning = false;
                btn.innerText = "ابدأ المهمة";
                btn.style.borderColor = "var(--primary)";
                
                // تشغيل المنبه
                const audio = document.getElementById('alarmSound');
                if(audio) audio.play();
                
                addPoints();
            } else {
                timeLeft--;
                updateTimerDisplay();
            }
        }, 1000);
    } else {
        // إذا كان يعمل -> أوقف مؤقتاً
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "استئناف";
        btn.style.borderColor = "var(--primary)";
    }
}

// تعديل دالة إعادة الضبط لتصفير النص أيضاً
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    
    // إيقاف المنبه إذا كان يعمل
    const audio = document.getElementById('alarmSound');
    if(audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    // إعادة نص الزر للحالة الأصلية
    const btn = document.getElementById('startBtn');
    if(btn) {
        btn.innerText = "ابدأ المهمة";
        btn.style.borderColor = "var(--primary)";
    }

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
    const minsWorked = parseInt(document.getElementById('minsInput').value);
    points += (minsWorked * 3);
    savePoints();
}

function buyBreak(min) {
    const cost = min * 3;
    if (points >= cost) {
        points -= cost;
        savePoints();
    } else {
        alert("عذراً دكتور، النقاط غير كافية! 🩺");
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

// --- التاريخ وقائمة المهام ---
function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('ar-EG', options);
}

function addTask() {
    const input = document.getElementById('taskInput');
    if (input.value.trim() === '') return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span><button onclick="this.parentElement.remove()" style="min-width:auto; background:none!important; border:none!important;">❌</button>`;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
}
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    
    // إيقاف الصوت وإعادته للبداية
    const audio = document.getElementById('alarmSound');
    audio.pause();
    audio.currentTime = 0;
    
    const mins = document.getElementById('minsInput').value || 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}
