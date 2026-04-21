// --- المتغيرات الأساسية ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

// قائمة العبارات التشجيعية
const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور ملهم! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

// تحديث الشاشة عند التحميل
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

// --- دالة تشغيل المنبه (بدون روابط خارجية لضمان العمل) ---
function playAlarm() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sawtooth'; 
    oscillator.frequency.setValueAtTime(500, context.currentTime); 
    gainNode.gain.setValueAtTime(5, context.currentTime); 

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    setTimeout(() => oscillator.stop(), 500); // يصفر لمدة ثانيتين
}

function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    if(qElem) qElem.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

// --- نظام التحكم في المؤقت (تشغيل / إيقاف مؤقت) ---
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
                
                playAlarm(); // تشغيل المنبه
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

// دالة إعادة الضبط
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    const btn = document.getElementById('startBtn');
    if(btn) btn.innerText = "ابدأ المهمة";
    
    const mins = document.getElementById('minsInput').value || 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

// بقية الدوال (تحديث الشاشة، النقاط، التاريخ) كما هي في ملفك الأصلي
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 0;
    points += (minsWorked * 3); // الدقيقة بـ 3 نقاط
    savePoints();
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    document.getElementById('userPoints').innerText = points;
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
