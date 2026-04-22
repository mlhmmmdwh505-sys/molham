// --- 1. المتغيرات الأساسية ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

// --- 2. قائمة العبارات التشجيعية ---
const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور ملهم! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

// --- 3. تهيئة الصفحة عند التحميل ---
window.onload = () => {
    updatePointsDisplay();
    displayDate();
    startGraduationCountdown();
    changeQuote();
    
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
};

// --- 4. نظام النقاط والمحل (جديد: شراء/شحن) ---

// دالة لشراء/إضافة نقاط مباشرة (بدون مذاكرة)
function purchasePoints(amount) {
    points += amount;
    savePoints();
    // تأثير بسيط للتأكيد
    const display = document.getElementById('userPoints');
    display.style.color = "#4ade80"; // فلاش أخضر
    setTimeout(() => display.style.color = "var(--primary)", 500);
}

// دالة شراء استراحة (تبديل النقاط بوقت)
function buyBreak(min) {
    const cost = min * 3; // التكلفة: 3 نقاط لكل دقيقة استراحة
    if (points >= cost) {
        points -= cost;
        savePoints();
        
        // ضبط التايمر فوراً على وقت الاستراحة
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        
        const btn = document.getElementById('startBtn');
        if(btn) btn.innerText = "ابدأ الاستراحة ☕";
        
        alert(`تم شراء استراحة لمدة ${min} دقائق.. استمتع يا دكتور!`);
    } else {
        alert("عذراً يا دكتور، نقاطك لا تكفي لهذه الاستراحة. استمر في المذاكرة! 💪");
    }
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    const pDisp = document.getElementById('userPoints');
    if(pDisp) pDisp.innerText = points;
}

function resetPoints() {
    if (confirm("تصفير جميع النقاط؟")) {
        points = 0;
        savePoints();
    }
}

// --- 5. نظام المنبه والمؤقت ---
function playAlarm() {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gainNode.gain.setValueAtTime(1, context.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        setTimeout(() => oscillator.stop(), 3000);
    } catch (e) { console.error("Audio blocked"); }
}

function toggleTimer() {
    const btn = document.getElementById('startBtn');
    if (!isRunning) {
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        btn.style.borderColor = "#ff4444";
        timer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timer);
                isRunning = false;
                btn.innerText = "ابدأ المهمة";
                btn.style.borderColor = "var(--primary)";
                playAlarm();
                addPoints();
                changeQuote();
            } else {
                timeLeft--;
                updateTimerDisplay();
            }
        }, 1000);
    } else {
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "استئناف";
        btn.style.borderColor = "var(--primary)";
    }
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    const btn = document.getElementById('startBtn');
    if(btn) btn.innerText = "ابدأ المهمة";
    const mins = document.getElementById('minsInput').value || 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

// --- 6. الدوال المساعدة ---
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const disp = document.getElementById('pomoDisplay');
    if(disp) disp.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function addPoints() {
    const mins = parseInt(document.getElementById('minsInput').value) || 25;
    points += (mins * 3);
    savePoints();
}

function changeQuote() {
    const q = document.getElementById('motivationQuote');
    if(q) q.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

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

document.getElementById('mainSaveBtn').addEventListener('click', () => {
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    if (!isRunning) resetTimer();
});

function addTask() {
    const input = document.getElementById('taskInput');
    if (input.value.trim() === '') return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span><button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer;">❌</button>`;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
}
