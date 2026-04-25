// --- 1. المتغيرات والبيانات المحفوظة ---
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
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉",
    "كل ساعة مذاكرة الان هي حياة تنقذها غدا.🫀",
    "لا مستحيل مع العمل .💪🏼"
];

// --- 2. تهيئة الصفحة ---
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

// --- 3. نظام المنبه القوي ---
function playAlarm() {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sawtooth'; 
        oscillator.frequency.setValueAtTime(400, context.currentTime); 
        gainNode.gain.setValueAtTime(5, context.currentTime); 

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        setTimeout(() => oscillator.stop(), 300); 
    } catch (e) { console.log("Audio Blocked"); }
}

// --- 4. التحكم في المؤقت (مقاوم للتأخير) ---
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (!isRunning) {
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        
        // تسجيل وقت البداية الحقيقي من ساعة النظام
        let startTime = Date.now();
        let initialTimeLeft = timeLeft;

        timer = setInterval(() => {
            // حساب الفرق الزمني الفعلي
            let elapsed = Math.floor((Date.now() - startTime) / 1000);
            timeLeft = initialTimeLeft - elapsed;

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
    
    const mins = document.getElementById('minsInput').value || 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

// --- 5. نظام النقاط والمتجر (دقيقة=3ن | 5د استراحة=75ن) ---
function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 25;
    points += (minsWorked * 3);  // الدقيقة بـ 3 نقاط
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15; // الاستراحة الـ 5 دقائق بـ 75 نقطة
    
    if (points >= cost) {
        points -= cost;
        savePoints();
        
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        alert(`تم شراء استراحة لمدة ${min} دقائق! ☕`);
    } else {
        alert("عذراً دكتور، النقاط غير كافية! 💪");
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

// --- 6. الدوال المساعدة ---
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    if(qElem) qElem.innerText = quotes[Math.floor(Math.random() * quotes.length)];
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
// 1. تعريف النصوص
const translations = {
    ar: {
        title: "لوحة تحكم د. ملهم ممدوح 🩺",
        welcome: "مرحباً بك، دكتور ملهم ✨",
        saveBtn: "تأكيد الإعدادات",
        gradTitle: "⏳ حلم التخرج",
        years: "سنة", days: "يوم", hours: "ساعة",
        storeTitle: "☕ متجر الطاقة",
        startBtn: "ابدأ المهمة",
        resetBtn: "إعادة ضبط",
        taskPlaceholder: "أضف مهمة طبية جديدة..."
    },
    en: {
        title: "Dr. Molham's Dashboard 🩺",
        welcome: "Welcome, Dr. Molham ✨",
        saveBtn: "Save Settings",
        gradTitle: "⏳ Graduation Dream",
        years: "Years", days: "Days", hours: "Hours",
        storeTitle: "☕ Energy Store",
        startBtn: "Start Mission",
        resetBtn: "Reset",
        taskPlaceholder: "Add new medical task..."
    }
};

let currentLang = localStorage.getItem('lang') || 'ar';

// 2. دالة التبديل
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', currentLang);
    applyLanguage();
}

// 3. دالة التطبيق
function applyLanguage() {
    const t = translations[currentLang];
    const isAr = currentLang === 'ar';
    
    // تغيير اتجاه الصفحة
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    
    // تحديث النصوص
    document.getElementById('welcomeTitle').innerText = isAr ? `لوحة تحكم د. ${userName} 🩺` : `Dr. ${userName}'s Dashboard 🩺`;
    document.querySelector('.welcome-msg').innerText = isAr ? `مرحباً بك، دكتور ${userName} ✨` : `Welcome, Dr. ${userName} ✨`;
    document.getElementById('mainSaveBtn').innerText = t.saveBtn;
    document.querySelector('.info-card h3').innerText = t.gradTitle;
    document.getElementById('startBtn').innerText = t.startBtn;
    document.getElementById('taskInput').placeholder = t.taskPlaceholder;
    
    // تحديث لغة زر التبديل نفسه
    document.getElementById('langToggle').innerText = isAr ? "English" : "العربية";
}

// أضف applyLanguage() داخل window.onload لتعمل عند فتح الصفحة
