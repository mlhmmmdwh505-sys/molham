// --- 1. المتغيرات والبيانات ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور ملهم! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

// --- 2. تشغيل عند التحميل ---
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

// --- 3. المنبه القوي (حل مشكلة عدم التشغيل) ---
function playAlarm() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sawtooth'; 
        oscillator.frequency.setValueAtTime(880, context.currentTime); 
        gainNode.gain.setValueAtTime(1, context.currentTime); 

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        setTimeout(() => { oscillator.stop(); context.close(); }, 4000); 
    } catch (e) {
        alert("انتهى الوقت يا دكتور ملهم! 🔔");
    }
}

// --- 4. المؤقت الذكي (مقاوم للتأخير 100%) ---
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (!isRunning) {
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        
        // السر هنا: بنسجل اللحظة الحالية بالمللي ثانية
        let startTime = Date.now();
        let initialTimeLeft = timeLeft;

        timer = setInterval(() => {
            // بنحسب الفرق بين "دلوقتي" و "وقت البداية"
            let currentTime = Date.now();
            let elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
            
            timeLeft = initialTimeLeft - elapsedSeconds;

            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(timer);
                isRunning = false;
                btn.innerText = "ابدأ المهمة";
                playAlarm();
                addPoints();
                changeQuote();
            }
            updateTimerDisplay();
        }, 100); // التحديث سريع جداً عشان لو رجعت للتطبيق تلاقي الوقت اتعدل فوراً
    } else {
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "استئناف";
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

// --- 5. نظام النقاط والمتجر ---
function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 25;
    points += (minsWorked * 3); // دقيقة مذاكرة = 3 نقاط
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15; // 5 دقائق استراحة = 75 نقطة
    if (points >= cost) {
        points -= cost;
        savePoints();
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        alert(`تم شراء استراحة ${min} دقائق! استمتع ☕`);
    } else {
        alert("نقاطك لا تكفي! ذاكر أكتر يا دكتور 💪");
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
    if(confirm("تصفير النقاط؟")) {
        points = 0;
        savePoints();
    }
}

// --- 6. دوال مساعدة ---
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
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
