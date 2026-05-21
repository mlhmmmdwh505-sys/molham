// --- 1. المتغيرات والبيانات المحفوظة --- 
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";
let currentLang = localStorage.getItem('userLang') || "ar"; 
let temporaryLang = currentLang; // 🧲 متغير مؤقت لحفظ اللغة المختارة حتى يتم التأكيد
let isBreak = false; // 🔒 راية أمان لمعرفة هل الوقت الحالي للمذاكرة أم للاستراحة

const quotes = {
    ar: [
        "الطب رسالة، وأنت قدها! 🩺",
        "كل دقيقة مذاكرة هي خطوة نحو لقب كبير. ✨",
        "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
        "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
        "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉",
        "لا مستحيل مع العمل. 💪🏼"
    ],
    en: [
        "Medicine is a mission, and you can do it! 🩺",
        "Every minute of study is a step towards greatness. ✨",
        "Remember why you started.. The world awaits you. 🌍",
        "Pain is temporary, pride is forever. 💪",
        "Study today, heal tomorrow.. Keep going! 💉",
        "Nothing is impossible with hard work. 💪🏼"
    ]
};

const i18n = {
    ar: {
        welcome: "مرحباً بك،", mainTitle: "لوحة تحكم ",
        langLabel: "اللغة", nameLabel: "الاسم", colorLabel: "اللون", dateLabel: "التاريخ", minsLabel: "الدقائق",
        saveBtn: "تأكيد الإعدادات", countdownTitle: "⏳ حلم التخرج",
        years: "سنة", days: "يوم", hours: "ساعة", storeTitle: "☕ متجر الطاقة 1د = 15ن",
        break5: "5 د = <small>75ن</small>", break10: "10 د = <small>150ن</small>", break15: "15 د = <small>225ن</small>",
        startBtnJob: "ابدأ المهمة", startBtnPause: "إيقاف مؤقت", startBtnResume: "استئناف", startBtnBreak: "ابدأ الاستراحة ☕",
        resetBtn: "اعادة ضبط", taskPlaceholder: "أضف مهمة جديدة...",
        alertSave: "تم حفظ وتأكيد الإعدادات والاسم بنجاح! 🩺",
        alertBreak: "تم شراء استراحة بنجاح! ☕", alertNoPoints: "عذراً، النقاط غير كافية! 💪", alertResetPoints: "تصفير النقاط؟"
    },
    en: {
        welcome: "Welcome,", mainTitle: "Dashboard of ",
        langLabel: "Lang", nameLabel: "Name", colorLabel: "Color", dateLabel: "Date", minsLabel: "Mins",
        saveBtn: "Confirm Settings", countdownTitle: "⏳ Graduation Dream",
        years: "Years", days: "Days", hours: "Hours", storeTitle: "☕ Energy Store 1m = 15p",
        break5: "5 Min = <small>75p</small>", break10: "10 Min = <small>150p</small>", break15: "15 Min = <small>225p</small>",
        startBtnJob: "Start Task", startBtnPause: "Pause", startBtnResume: "Resume", startBtnBreak: "Start Break ☕",
        resetBtn: "Reset", taskPlaceholder: "Add a new task...",
        alertSave: "Settings and Name saved successfully! 🩺",
        alertBreak: "Break purchased successfully! ☕", alertNoPoints: "Sorry, not enough points! 💪", alertResetPoints: "Reset points?"
    }
};

// --- 2. دالة تهيئة الصفحة ---
window.onload = () => {
    
    updatePointsDisplay();

    points += 75; savePoints();
    
    startGraduationCountdown();
    
    currentLang = localStorage.getItem('userLang') || "ar";
    temporaryLang = currentLang; // مزامنة المتغير المؤقت عند الإقلاع
    
    if(document.getElementById('langSelect')) {
        document.getElementById('langSelect').value = currentLang;
    }
    applyLanguage(currentLang);
    displayDate();
    
    const savedName = localStorage.getItem('userName') || (currentLang === 'ar' ? "ملهم" : "Molham");
    if(document.getElementById('userNameInput')) {
        document.getElementById('userNameInput').value = savedName;
    }
    
    const savedMins = localStorage.getItem('userMins') || "25";
    if(document.getElementById('minsInput')) {
        document.getElementById('minsInput').value = savedMins;
    }
    
    if(document.getElementById('gradDateInput')) {
        document.getElementById('gradDateInput').value = graduationDate;
    }
    
    let savedColor = localStorage.getItem('themeColor') || "#6366f1";
    if(document.getElementById('colorPicker')) {
        document.getElementById('colorPicker').value = savedColor;
    }
    document.documentElement.style.setProperty('--primary', savedColor);
    
    timeLeft = parseInt(savedMins) * 60;
    updateTimerDisplay();
    
    if(document.getElementById('taskInput')) {
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
};

// --- 3. دالة تطبيق اللغة وتحديث النصوص الشاشية ---
function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('userLang', lang); 
    
    const trans = i18n[lang];
    const savedName = localStorage.getItem('userName') || (lang === 'ar' ? "ملهم" : "Molham");
    
    document.getElementById('welcomeWord').innerText = trans.welcome;
    document.getElementById('userNameDisplay').innerText = `${lang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}`;
    document.getElementById('mainTitle').innerHTML = trans.mainTitle + `<span id="mainTitleName">${lang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}</span> 🩺`;
    
    document.getElementById('langLabel').innerText = trans.langLabel;
    document.getElementById('nameLabel').innerText = trans.nameLabel;
    document.getElementById('colorLabel').innerText = trans.colorLabel;
    document.getElementById('dateLabel').innerText = trans.dateLabel;
    document.getElementById('minsLabel').innerText = trans.minsLabel;
    document.getElementById('mainSaveBtn').innerText = trans.saveBtn;
    
    document.getElementById('countdownTitle').innerText = trans.countdownTitle;
    document.getElementById('labelYears').innerText = trans.years;
    document.getElementById('labelDays').innerText = trans.days;
    document.getElementById('labelHours').innerText = trans.hours;
    
    document.getElementById('storeTitle').innerText = trans.storeTitle;
    document.getElementById('itemBreak5').innerHTML = trans.break5;
    document.getElementById('itemBreak10').innerHTML = trans.break10;
    document.getElementById('itemBreak15').innerHTML = trans.break15;
    
    document.getElementById('resetBtn').innerText = trans.resetBtn;
    document.getElementById('taskInput').setAttribute('placeholder', trans.taskPlaceholder);
    
    if (!isRunning) {
        document.getElementById('startBtn').innerText = trans.startBtnJob;
    }
    
    changeQuote();
    renderTasks(); 
}

// 🛠️ التعديل الجراحي هنا: عند تغيير القائمة نقوم بتحديث المتغير المؤقت فقط ولا نغير لغة الموقع
if(document.getElementById('langSelect')) {
    document.getElementById('langSelect').addEventListener('change', function(e) {
        temporaryLang = e.target.value; // احتفاظ بالاختيار سرًا بدون تطبيق فوري
    });
}

// --- 4. زر الحفظ الرئيسي المطور والمصلح ---
document.getElementById('mainSaveBtn').addEventListener('click', function() {
    // 1. تثبيت وحفظ اللغة المعتمدة من المتغير المؤقت الآن
    currentLang = temporaryLang;
    localStorage.setItem('userLang', currentLang);

    // 2. جلب وحفظ الاسم فوراً
    const userNameInput = document.getElementById('userNameInput');
    const newName = userNameInput.value.trim() || (currentLang === 'ar' ? "ملهم" : "Molham");
    localStorage.setItem('userName', newName);

    // 3. جلب وحفظ الدقائق
    const minsInput = document.getElementById('minsInput');
    const newMins = parseInt(minsInput.value) || 25;
    localStorage.setItem('userMins', newMins); 

    // 4. جلب وحفظ اللون المختار للثيم
    let newColor = document.getElementById('colorPicker').value || "#6366f1";
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    // 5. جلب وحفظ تاريخ التخرج
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    
    // 6. إذا كان المؤقت واقفاً، يتم تحديث زمن المؤقت فوراً طبقاً للدقائق الجديدة
    if (!isRunning) {
        timeLeft = newMins * 60;
        updateTimerDisplay();
    }

    // 🚀 تطبيق التغييرات اللغوية والاسم فورا عند الضغط الحقيقي
    applyLanguage(currentLang);
    displayDate(); 

    // ✨ تحويل الزر للشكل الأخضر التأكيدي اللحظي
    const saveBtn = document.getElementById('mainSaveBtn');
    const originalText = i18n[currentLang].saveBtn;
    
    saveBtn.innerText = currentLang === 'ar' ? "تم الحفظ بنجاح! ✔️" : "Saved Successfully! ✔️";
    saveBtn.style.setProperty('background-color', 'var(--success)', 'important');
    saveBtn.style.setProperty('border-color', 'var(--success)', 'important');
    saveBtn.style.pointerEvents = "none"; 

    // إعادة الزر لوضعه الطبيعي بعد ثانيتين
    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.backgroundColor = "";
        saveBtn.style.borderColor = "";
        saveBtn.style.pointerEvents = "auto";
    }, 2000);
});

function playAlarm() {
    try {
        const bgTrack = document.getElementById('bgTrack');
        if (bgTrack) {
            bgTrack.src = "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wZD1tcDQyAG1vb3YAAABsbXZoZAAAAADXg4bS14OG0gAABeXgAAA+gAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
            bgTrack.play().catch(() => {});
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const context = new AudioContext();
        const now = context.currentTime;
        
        // نغمة تين
        const osc1 = context.createOscillator();
        const gain1 = context.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); 
        gain1.gain.setValueAtTime(0.3, now); 
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15); 
        osc1.connect(gain1);
        gain1.connect(context.destination);
        
        // نغمة تون
        const osc2 = context.createOscillator();
        const gain2 = context.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(392.00, now + 0.15); 
        gain2.gain.setValueAtTime(0.3, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3); 
        osc2.connect(gain2);
        gain2.connect(context.destination);
        
        osc1.start(now);
        osc1.stop(now + 0.15);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.3);
        
    } catch (e) {
        console.log("Audio bypass error:", e);
    }
}
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    const trans = i18n[currentLang];
    
    if (!isRunning) {
        if (timeLeft <= 0) {
          const resetMins = parseFloat(document.getElementById('minsInput').value) || 1;
timeLeft = Math.floor(resetMins * 60);
            updateTimerDisplay();
        }

        isRunning = true;
        btn.innerText = trans.startBtnPause;
        
        // 🎯 اللحظة الحقيقية: حساب وقت النهاية الفعلي بناءً على ساعة الجهاز الحالية (مستحيل تتأخر)
        const endTime = Date.now() + (timeLeft * 1000);

        timer = setInterval(() => {
            // طرح وقت النهاية الثابت من ساعة الجهاز الحركية الآن
            const remainingMillis = endTime - Date.now();
            timeLeft = Math.ceil(remainingMillis / 1000);

            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(timer);
                isRunning = false;
                btn.innerText = trans.startBtnJob;
                
                // 🔒 حماية: توزيع النقاط للمذاكرة فقط، وممنوع لو كانت استراحة
                if (!isBreak) {
                    addPoints(); 
                }
                
                playAlarm();
                changeQuote();

                // العودة للحالة الطبيعية بعد انتهاء الوقت
                isBreak = false; 

                const mins = parseInt(document.getElementById('minsInput').value) || 25;
                timeLeft = mins * 60;
                updateTimerDisplay();
            }
            updateTimerDisplay();
        }, 200); // تحديث سريع جداً كل 200 مللي ثانية لضمان الدقة المطلقة والسلاسة
    } else {
        clearInterval(timer);
        isRunning = false;
        btn.innerText = trans.startBtnResume;
        
        // حماية عند الإيقاف المؤقت
        if (!isBreak) {
            addPoints(); 
        }
    }
}

function addPoints() {
    const minsInput = parseInt(document.getElementById('minsInput').value) || 25;
    const totalSecondsSeconds = minsInput * 60;
    
    // حساب الثواني اللي انقضت بالفعل
    const secondsWorked = totalSecondsSeconds - timeLeft;
    
    // شرط حماة الثغرة: لازم يكون اشتغل أكتر من 20 ثانية حقيقية، وميكونش المؤقت لسه مشحون بالكامل
    if (secondsWorked >= 20 && timeLeft < totalSecondsSeconds) {
        const newPoints = Math.floor(secondsWorked / 20); 
        points += newPoints;
        savePoints();
        
        // 🔒 تصفير الثواني المحسوبة داخلياً عن طريق جعل timeLeft مساوياً للوقت الكلي منعاً للتكرار
        timeLeft = totalSecondsSeconds; 
    }
}
function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    document.getElementById('startBtn').innerText = i18n[currentLang].startBtnJob;
    const mins = document.getElementById('minsInput').value || 25;
    timeLeft = mins * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}


function buyBreak(min) {
    const cost = min * 15; 
    const trans = i18n[currentLang];
    
    if (points >= cost) {
        // 1. خصم النقاط فوراً
        points -= cost;
        savePoints();
        
        // 2. إيقاف أي مؤقت قديم تماماً وتصفير حالته
        clearInterval(timer);
        isRunning = false;
        
        // 3. تفعيل راية الاستراحة (قفل حنفية المكافآت)
        isBreak = true; 
        
        // 4. شحن وقت الاستراحة الجديد على الشاشة (بأمان وبدون تشغيل تلقائي)
        timeLeft = min * 60;
        updateTimerDisplay();
        
        // 5. تحديث نص الزرار ليصبح "ابدأ الاستراحة ☕" وينتظر ضغطتك
        document.getElementById('startBtn').innerText = trans.startBtnBreak;
        
        alert(trans.alertBreak);
    } else {
        alert(trans.alertNoPoints);
    }
}
// دالة حفظ النقاط
function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}
function updatePointsDisplay() { document.getElementById('userPoints').innerText = points; }
function resetPoints() {
    if(confirm(i18n[currentLang].alertResetPoints)) {
        points = 0;
        savePoints();
    }
}

// --- 7. العد التنازلي ---
function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    const currentQuotes = quotes[currentLang];
    if(qElem) qElem.innerText = currentQuotes[Math.floor(Math.random() * currentQuotes.length)];
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString(locale, options);
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

// --- 8. إدارة المهام ---

window.toggleTask = function(index) {
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks[index].done = !tasks[index].done;
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    renderTasks();
}

window.deleteTask = function(index) {
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks.splice(index, 1);
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    renderTasks();
}

function renderTasks() {
    var taskList = document.getElementById('taskList');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    var tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    var isAr = currentLang === 'ar';
    var textAlignment = isAr ? 'text-align: right !important;' : 'text-align: left !important;';
    
    tasks.forEach(function(task, index) {
        var li = document.createElement('li');
        var strikeStyle = task.done ? "text-decoration: line-through !important; opacity: 0.5 !important;" : "";
        var icon = task.done ? "✅" : "⭕";
        
        li.innerHTML = 
            '<div onclick="toggleTask(' + index + ')" style="display: flex !important; flex-direction: row !important; align-items: center !important; gap: 12px !important; flex: 1 !important; min-width: 0 !important; cursor: pointer !important;">' +
                '<span style="flex-shrink: 0 !important; font-size: 16px !important;">' + icon + '</span>' +
                '<span style="flex-grow: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; font-weight: 600 !important; font-size: 15px !important; color: #ffffff !important; ' + textAlignment + ' ' + strikeStyle + '">' + task.text + '</span>' +
            '</div>' +
            '<button onclick="deleteTask(' + index + ')" class="reset-mini" style="min-width: auto !important; width: auto !important; background: none !important; border: none !important; cursor: pointer !important; padding: 0 5px !important; flex-shrink: 0 !important; font-size: 14px !important; color: #ff4444 !important; margin-inline-start: 15px !important;">❌</button>';
            
        taskList.appendChild(li);
    });
}
