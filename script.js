// --- 1. المتغيرات الأساسية ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

// --- 2. تهيئة الصفحة عند التحميل ---
window.onload = () => {
    // استعادة الاسم
    const savedName = localStorage.getItem('userName') || "ملهم ممدوح";
    document.getElementById('userNameInput').value = savedName;
    document.getElementById('welcomeTitle').innerText = `لوحة تحكم د. ${savedName} 🩺`;

    updatePointsDisplay();
    displayDate();
    changeQuote();
    
    // استعادة اللون والتاريخ
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
};

// --- 3. نظام المنبه القوي ---
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
        alert("انتهى الوقت يا دكتور! 🔔");
    }
}

// --- 4. المؤقت الذكي (مقاوم للتأخير 100%) ---
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (!isRunning) {
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        
        let startTime = Date.now();
        let initialTimeLeft = timeLeft;

        timer = setInterval(() => {
            let elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
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
        }, 1000);
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
    
    const mins = parseFloat(document.getElementById('minsInput').value) || 25;
    timeLeft = Math.floor(mins * 60);
    updateTimerDisplay();
}

// --- 5. نظام النقاط والمتجر (دقيقة=3ن | 5د راحة=75ن) ---
function addPoints() {
    const minsWorked = parseFloat(document.getElementById('minsInput').value) || 25;
    // الحسبة: الدقيقة بـ 3 نقاط (الـ 25 دقيقة تعطيك 75 نقطة)
    const earned = Math.floor(minsWorked * 3);
    points += earned;
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15; // الـ 5 دقائق بـ 75 نقطة
    if (points >= cost) {
        points -= cost;
        savePoints();
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        alert(`تم شراء استراحة ${min} دقائق.. استمتع يا دكتور! ☕`);
    } else {
        alert("عذراً، نقاطك لا تكفي! تحتاج لـ 75 نقطة لشراء 5 دقائق. 💪");
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
    if(confirm("هل تريد تصفير النقاط؟")) {
        points = 0;
        savePoints();
    }
}

// --- 6. الإعدادات العامة وحفظ الاسم ---
document.getElementById('mainSaveBtn').addEventListener('click', () => {
    // حفظ اللون والتاريخ
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);

    // حفظ وتحديث الاسم
    const newName = document.getElementById('userNameInput').value;
    if (newName.trim() !== "") {
        localStorage.setItem('userName', newName);
        document.getElementById('welcomeTitle').innerText = `لوحة تحكم د. ${newName} 🩺`;
    }

    if (!isRunning) resetTimer();
    alert("تم حفظ جميع التعديلات! ✨");
});

// --- 7. دوال مساعدة ---
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
