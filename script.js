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

// --- 4. دالة المنبه (توليد صوت نقي وقوي برمجياً) ---
function playAlarm() {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = 'sawtooth'; // نغمة حادة مسموعة
        oscillator.frequency.setValueAtTime(880, context.currentTime); 
        
        // رفع مستوى الصوت برمجياً
        gainNode.gain.setValueAtTime(1, context.currentTime); 

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start();
        setTimeout(() => oscillator.stop(), 3000); // تنبيه لمدة 3 ثوانٍ
    } catch (e) {
        console.error("المتصفح منع تشغيل الصوت تلقائياً.");
    }
}

// --- 5. نظام التحكم في المؤقت (تشغيل / إيقاف مؤقت) ---
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (!isRunning) {
        // حالة البدء أو الاستئناف
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        btn.style.borderColor = "#ff4444"; // تغيير اللون للأحمر عند التشغيل
        
        timer = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(timer);
                isRunning = false;
                btn.innerText = "ابدأ المهمة";
                btn.style.borderColor = "var(--primary)";
                
                playAlarm(); // تشغيل المنبه
                addPoints(); // إضافة النقاط
                changeQuote(); // تغيير العبارة التشجيعية
            } else {
                timeLeft--;
                updateTimerDisplay();
            }
        }, 1000);
    } else {
        // حالة الإيقاف المؤقت
        clearInterval(timer);
        isRunning = false;
        btn.innerText = "استئناف";
        btn.style.borderColor = "var(--primary)";
    }
}

// --- 6. دالة إعادة الضبط ---
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    
    const btn = document.getElementById('startBtn');
    if (btn) {
        btn.innerText = "ابدأ المهمة";
        btn.style.borderColor = "var(--primary)";
    }

    const minsInput = document.getElementById('minsInput');
    const mins = minsInput ? minsInput.value : 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

// --- 7. نظام النقاط الم
