// --- المتغيرات الأساسية ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

// قائمة العبارات التشجيعية التي طلبتها
const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور ملهم! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

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

// --- دالة تشغيل المنبه بأعلى صوت ممكن (مضخم برمي) ---
function playHighVolumeAlarm() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // توليد نغمة حادة جداً ومنبهة
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth'; // نغمة "منشارية" مسموعة جداً
    oscillator.frequency.setValueAtTime(500, audioContext.currentTime); 
    
    // --- هنا نرفع الصوت برمجياً (5 يعني 5 أضعاف القوة العادية) ---
    gainNode.gain.setValueAtTime(5, audioContext.currentTime); 

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    setTimeout(() => oscillator.stop(), 100); // يستمر لـ 3 ثواني
}

function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    if(qElem) qElem.innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

// --- نظام المؤقت المعدل مع الإيقاف المؤقت ---
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
                
                playHighVolumeAlarm(); // تشغيل المنبه الجبار
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

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const display = document.getElementById('pomoDisplay');
    if(display) display.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// بقية الدوال كما هي مع تعديل دالة النقاط
function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 0;
    points += (minsWorked * 3); // 3 نقاط لكل دقيقة كما طلبت
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
// دالة لمحاولة شراء شيء ما (مثلاً استراحة أو مكافأة)
function purchaseItem(cost, itemName) {
    if (points >= cost) {
        points -= cost; // خصم النقاط
        savePoints();   // تحديث التخزين والعرض
        alert(`تم شراء ${itemName} بنجاح! استمتع يا دكتور. 🎉`);
    } else {
        // هذه هي الرسالة التي ستحذر المستخدم إذا لم يملك نقاط كافية
        const missingPoints = cost - points;
        alert(`عذراً يا دكتور، رصيدك غير كافٍ. تحتاج إلى ${missingPoints} نقطة إضافية لشراء ${itemName}. استمر في المذاكرة! 💪`);
    }
}
