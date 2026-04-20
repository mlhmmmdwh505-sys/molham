// 1. المتغيرات الأساسية
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

// 2. قائمة العبارات التشجيعية
const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور ملهم! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

// 3. تشغيل الوظائف عند تحميل الصفحة
window.onload = () => {
    updatePointsDisplay();
    displayDate();
    startGraduationCountdown();
    changeQuote();
    
    // استعادة الإعدادات
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.documentElement.style.setProperty('--primary', savedColor);
    document.getElementById('colorPicker').value = savedColor;
    
    resetTimer();
};

// 4. دالة التحكم في التايمر (ابدأ / إيقاف مؤقت)
// دالة لتوليد صوت تنبيه من المتصفح مباشرة (بدون روابط)
function playEmergencyAlarm() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine'; // نوع الصوت
    oscillator.frequency.setValueAtTime(880, context.currentTime); // تردد عالي (صوت حاد)
    
    gainNode.gain.setValueAtTime(1, context.currentTime); // أعلى مستوى صوت
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    // يتوقف الصوت بعد ثانيتين
    setTimeout(() => oscillator.stop(), 2000);
}

// تعديل جزء انتهاء الوقت داخل toggleTimer
// ابحث عن (timeLeft <= 0) وضع هذا الكود:
if (timeLeft <= 0) {
    clearInterval(timer);
    isRunning = false;
    
    const btn = document.getElementById('startBtn');
    btn.innerText = "ابدأ المهمة";
    btn.style.borderColor = "var(--primary)";
    
    // تشغيل الصوت المضمون
    playEmergencyAlarm();
    
    // تغيير العبارة والنقاط
    if(typeof changeQuote === "function") changeQuote();
    addPoints();
}
                
                changeQuote();
            } else {
                timeLeft--;
                updateTimerDisplay();
            }
        }, 1000);
    } else {
        // إيقاف مؤقت
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "استئناف";
        btn.style.borderColor = "var(--primary)";
    }
}

// 5. دالة إعادة الضبط (إصلاح شامل)
function resetTimer() {
    clearInterval(timer);
    isRunning = false;

    // إعادة نص الزر
    const btn = document.getElementById('startBtn');
    if (btn) {
        btn.innerText = "ابدأ المهمة";
        btn.style.borderColor = "var(--primary)";
    }

    // إيقاف الصوت
    const audio = document.getElementById('alarmSound');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    // تحديث الوقت من المدخلات
    const minsValue = document.getElementById('minsInput').value || 25;
    timeLeft = minsValue * 60;
    updateTimerDisplay();
}

// 6. الدوال المساعدة
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 0;
    points += (minsWorked * 3); // الدقيقة بـ 3 نقاط
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    document.getElementById('userPoints').innerText = points;
}

function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    if(qElem) {
        qElem.innerText = quotes[Math.floor(Math.random() * quotes.length)];
    }
}

// 7. حفظ الإعدادات عند الضغط على تأكيد
document.getElementById('mainSaveBtn').addEventListener('click', () => {
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);

    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);

    if (!isRunning) resetTimer();
});

// بقية الدوال (التاريخ، المتجر، المهام)
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

function buyBreak(min) {
    const cost = min * 3;
    if (points >= cost) {
        points -= cost;
        localStorage.setItem('userPoints', points);
        updatePointsDisplay();
    } else {
        alert("النقاط غير كافية يا دكتور! 💪");
    }
}

function addTask() {
    const input = document.getElementById('taskInput');
    if (input.value.trim() === '') return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span><button onclick="this.parentElement.remove()" style="background:none!important; border:none!important;">❌</button>`;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
}

function resetPoints() {
    if(confirm("تصفير النقاط؟")) {
        points = 0;
        localStorage.setItem('userPoints', points);
        updatePointsDisplay();
    }
}
