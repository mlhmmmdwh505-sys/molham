// --- 1. المتغيرات الأساسية واستعادة البيانات ---
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
    
    // استعادة الإعدادات المحفوظة
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
};

// --- 4. نظام المنبه (صوت قوي) ---
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
    } catch (e) {
        console.error("المتصفح منع تشغيل الصوت تلقائياً.");
    }
}

// --- 5. نظام التحكم في المؤقت (تشغيل / إيقاف مؤقت) ---
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
    if (btn) btn.innerText = "ابدأ المهمة";

    const minsInput = document.getElementById('minsInput');
    const mins = (minsInput && minsInput.value) ? minsInput.value : 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

// --- 6. نظام النقاط والمحل (الحسبة التي طلبتها) ---

function addPoints() {
    const minsInput = document.getElementById('minsInput');
    const minsWorked = (minsInput && minsInput.value) ? parseInt(minsInput.value) : 25;
    
    // الدقيقة مذاكرة = 3 نقاط (الـ 25 دقيقة تعطي 75 نقطة)
    points += (minsWorked * 3); 
    savePoints();
}

function buyBreak(min) {
    // استراحة 5 دقائق = 75 نقطة (يعني الدقيقة بـ 15 نقطة)
    const cost = min * 15; 
    
    if (points >= cost) {
        points -= cost;
        savePoints();
        
        // تحويل المؤقت لوقت الاستراحة
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        
        const btn = document.getElementById('startBtn');
        if(btn) btn.innerText = "ابدأ الاستراحة ☕";
        
        alert(`تم شراء استراحة لمدة ${min} دقائق.. استمتع يا دكتور!`);
    } else {
        alert("عذراً دكتور، نقاطك لا تكفي! تحتاج للمذاكرة أكثر لجمع 75 نقطة. 💪");
    }
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    const pointsDisplay = document.getElementById('userPoints');
    if (pointsDisplay) pointsDisplay.innerText = points;
}

function resetPoints() {
    if (confirm("هل تريد تصفير جميع نقاطك يا دكتور؟ 🩺")) {
        points = 0;
        savePoints();
    }
}

// --- 7. الدوال المساعدة ---
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const display = document.getElementById('pomoDisplay');
    if (display) {
        display.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    if (qElem) {
        qElem.innerText = quotes[Math.floor(Math.random() * quotes.length)];
    }
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateDisp = document.getElementById('dateDisplay');
    if (dateDisp) {
        dateDisp.innerText = new Date().toLocaleDateString('ar-EG', options);
    }
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

// --- 8. حفظ الإعدادات وقائمة المهام ---
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
    if (!input || input.value.trim() === '') return;
    const li = document.createElement('li');
    li.innerHTML = `<span>${input.value}</span><button onclick="this.parentElement.remove()" style="background:none!important; border:none!important; cursor:pointer;">❌</button>`;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
}
