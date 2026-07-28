// ==========================================
// 1️⃣ المتغيرات والبيانات المحفوظة (State)
// ==========================================
let timer = null;
let timeLeft = null;
let isBreak = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";
let currentLang = localStorage.getItem('userLang') || "ar"; 
let temporaryLang = currentLang;  
let totalSecondsWorked = 0; // لحساب ثواني العمل الفعلية بدقة فائقة من أجل النقاط

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
        startBtnJob: "ابدأ المهمة 🚀", startBtnPause: "إيقاف مؤقت ⏸️", startBtnResume: "استئناف ▶️", startBtnBreak: "ابدأ الاستراحة ☕",
        resetBtn: "إعادة ضبط 🔁", taskPlaceholder: "أضف مهمة جديدة...",
        alertSave: "تم حفظ وتأكيد الإعدادات والاسم بنجاح! 🩺",
        alertBreak: "تم شراء استراحة بنجاح! ☕", alertNoPoints: "عذراً، النقاط غير كافية! 💪", alertResetPoints: "تصفير النقاط؟"
    },
    en: {
        welcome: "Welcome,", mainTitle: "Dashboard of ",
        langLabel: "Lang", nameLabel: "Name", colorLabel: "Color", dateLabel: "Date", minsLabel: "Mins",
        saveBtn: "Confirm Settings", countdownTitle: "⏳ Graduation Dream",
        years: "Years", days: "Days", hours: "Hours", storeTitle: "☕ Energy Store 1m = 15p",
        break5: "5 Min = <small>75p</small>", break10: "10 Min = <small>150p</small>", break15: "15 Min = <small>225p</small>",
        startBtnJob: "Start Task 🚀", startBtnPause: "Pause ⏸️", startBtnResume: "Resume ▶️", startBtnBreak: "Start Break ☕",
        resetBtn: "Reset 🔁", taskPlaceholder: "Add a new task...",
        alertSave: "Settings and Name saved successfully! 🩺",
        alertBreak: "Break purchased successfully! ☕", alertNoPoints: "Sorry, not enough points! 💪", alertResetPoints: "Reset points?"
    }
};

// ==========================================
// 2️⃣ دالة تهيئة الصفحة (Onload)
// ==========================================
window.onload = () => {
    updatePointsDisplay();
    startGraduationCountdown();
    
    currentLang = localStorage.getItem('userLang') || "ar";
    temporaryLang = currentLang; 
    
    if(document.getElementById('langSelect')) {
        document.getElementById('langSelect').value = currentLang;
    }
    applyLanguage(currentLang);
    displayDate();
    
    const savedName = localStorage.getItem('userName') || (currentLang === 'ar' ? "ملهم" : "Molham");
    if(document.getElementById('userNameInput')) {
        document.getElementById('userNameInput').value = savedName;
    }
    
    let savedMins = parseFloat(localStorage.getItem('userMins')) || 25;
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
    
    // ضبط الوقت الابتدائي بدون تعليق برمي الخوارزمية
    timeLeft = Math.floor(savedMins * 60);
    updateTimerDisplay();
    
    if(document.getElementById('taskInput')) {
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
};

// ==========================================
// 3️⃣ دالة تطبيق اللغة وتحديث النصوص الشاشية
// ==========================================
function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('userLang', lang); 
    
    const trans = i18n[lang];
    const savedName = localStorage.getItem('userName') || (lang === 'ar' ? "ملهم" : "Molham");
    
    if(document.getElementById('welcomeWord')) document.getElementById('welcomeWord').innerText = trans.welcome;
    if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').innerText = `${lang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}`;
    if(document.getElementById('mainTitle')) document.getElementById('mainTitle').innerHTML = trans.mainTitle + `<span id="mainTitleName">${lang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}</span> 🩺`;
    
    if(document.getElementById('langLabel')) document.getElementById('langLabel').innerText = trans.langLabel;
    if(document.getElementById('nameLabel')) document.getElementById('nameLabel').innerText = trans.nameLabel;
    if(document.getElementById('colorLabel')) document.getElementById('colorLabel').innerText = trans.colorLabel;
    if(document.getElementById('dateLabel')) document.getElementById('dateLabel').innerText = trans.dateLabel;
    if(document.getElementById('minsLabel')) document.getElementById('minsLabel').innerText = trans.minsLabel;
    if(document.getElementById('mainSaveBtn')) document.getElementById('mainSaveBtn').innerText = trans.saveBtn;
    
    if(document.getElementById('countdownTitle')) document.getElementById('countdownTitle').innerText = trans.countdownTitle;
    if(document.getElementById('labelYears')) document.getElementById('labelYears').innerText = trans.years;
    if(document.getElementById('labelDays')) document.getElementById('labelDays').innerText = trans.days;
    if(document.getElementById('labelHours')) document.getElementById('labelHours').innerText = trans.hours;
    
    if(document.getElementById('storeTitle')) document.getElementById('storeTitle').innerText = trans.storeTitle;
    if(document.getElementById('itemBreak5')) document.getElementById('itemBreak5').innerHTML = trans.break5;
    if(document.getElementById('itemBreak10')) document.getElementById('itemBreak10').innerHTML = trans.break10;
    if(document.getElementById('itemBreak15')) document.getElementById('itemBreak15').innerHTML = trans.break15;
    
    if(document.getElementById('resetBtn')) document.getElementById('resetBtn').innerText = trans.resetBtn;
    if(document.getElementById('taskInput')) document.getElementById('taskInput').setAttribute('placeholder', trans.taskPlaceholder);
    
    // تحديث نص زر العداد حسب الحالة الحالية
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        if (timer === null) {
            startBtn.innerText = isBreak ? trans.startBtnBreak : trans.startBtnJob;
        } else {
            startBtn.innerText = trans.startBtnPause;
        }
    }
    
    changeQuote();
    renderTasks(); 
}

if(document.getElementById('langSelect')) {
    document.getElementById('langSelect').addEventListener('change', function(e) {
        temporaryLang = e.target.value; 
    });
}

// ==========================================
// 4️⃣ زر الحفظ الرئيسي
// ==========================================
document.getElementById('mainSaveBtn').addEventListener('click', function() {
    currentLang = temporaryLang;
    localStorage.setItem('userLang', currentLang);

    const userNameInput = document.getElementById('userNameInput');
    const newName = userNameInput.value.trim() || (currentLang === 'ar' ? "ملهم" : "Molham");
    localStorage.setItem('userName', newName);

    const minsInput = document.getElementById('minsInput');
    const newMins = parseFloat(minsInput.value) || 25;
    localStorage.setItem('userMins', newMins); 

    let newColor = document.getElementById('colorPicker').value || "#6366f1";
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    
    if (timer === null) {
        timeLeft = Math.floor(newMins * 60);
        updateTimerDisplay();
    }

    applyLanguage(currentLang);
    displayDate(); 

    const saveBtn = document.getElementById('mainSaveBtn');
    const originalText = i18n[currentLang].saveBtn;
    
    saveBtn.innerText = currentLang === 'ar' ? "تم الحفظ بنجاح! ✔️" : "Saved Successfully! ✔️";
    saveBtn.style.setProperty('background-color', 'var(--success)', 'important');
    saveBtn.style.setProperty('border-color', 'var(--success)', 'important');
    saveBtn.style.pointerEvents = "none"; 

    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.backgroundColor = "";
        saveBtn.style.borderColor = "";
        saveBtn.style.pointerEvents = "auto";
    }, 2000);
});

// ==========================================
// 5️⃣ نظام المؤقت الذكي المصلح (إيقاف مؤقت / استئناف)
// ==========================================
function toggleTimer() {
    const startBtn = document.getElementById('startBtn');
    const minsInput = document.getElementById('minsInput');
    const trans = i18n[currentLang];
    
    if (timeLeft === null || timeLeft <= 0) {
        const mins = parseFloat(minsInput.value) || 25;
        timeLeft = Math.floor(mins * 60);
    }
    
    if (timer === null) {
        // حالة البداية أو الاستئناف
        startBtn.innerText = trans.startBtnPause;
        
        const endTime = Date.now() + (timeLeft * 1000);
        
        timer = setInterval(() => {
            const remainingMillis = endTime - Date.now();
            timeLeft = Math.ceil(remainingMillis / 1000);
            
            if (!isBreak) {
                totalSecondsWorked++; // تجميع الثواني الفعلية للدراسة فقط
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timer = null;
                playAlarm();
                
                if (!isBreak) {
                    addPoints();
                    changeQuote();
                }
                
                // إعادة ضبط المؤقت تلقائياً بعد الانتهاء
                isBreak = false;
                const mins = parseFloat(minsInput.value) || 25;
                timeLeft = Math.floor(mins * 60);
                totalSecondsWorked = 0;
                updateTimerDisplay();
                startBtn.innerText = trans.startBtnJob;
            } else {
                updateTimerDisplay();
            }
        }, 1000);
        
    } else {
        // حالة الإيقاف المؤقت (Pause)
        clearInterval(timer);
        timer = null;
        
        startBtn.innerText = trans.startBtnResume;
        
        // حساب نقاطك فوراً عما أنجزته حتى ثانية الإيقاف
        if (!isBreak) {
            addPoints(); 
        }
    }
}

function resetTimer() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
    isBreak = false;
    totalSecondsWorked = 0;
    
    const minsInput = document.getElementById('minsInput');
    const mins = parseFloat(minsInput ? minsInput.value : 25) || 25;
    timeLeft = Math.floor(mins * 60);
    
    updateTimerDisplay();
    
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.innerText = i18n[currentLang].startBtnJob;
    }
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const displayElem = document.getElementById('pomoDisplay');
    if (displayElem) {
        displayElem.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

// ==========================================
// 6️⃣ متجر الطاقة وحساب النقاط بدقة
// ==========================================
function addPoints() {
    // كل 20 ثانية عمل حقيقي تساوي 1 نقطة (الدقيقة بـ 3 نقاط)
    if (totalSecondsWorked >= 20) {
        const newPoints = Math.floor(totalSecondsWorked / 20); 
        points += newPoints;
        savePoints();
        
        // الاحتفاظ بالثواني المتبقية التي لم تكتمل لـ 20
        totalSecondsWorked = totalSecondsWorked % 20; 
    }
}

function buyBreak(min) {
    const cost = min * 15; 
    const trans = i18n[currentLang];
    
    if (points >= cost) {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
        
        points -= cost;
        savePoints();
        
        isBreak = true;
        timeLeft = min * 60;
        totalSecondsWorked = 0; // تصفير العداد لعدم حساب نقاط في الراحة
        
        updateTimerDisplay();
        document.getElementById('startBtn').innerText = trans.startBtnBreak;
        alert(trans.alertBreak);
    } else {
        alert(trans.alertNoPoints);
    }
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() { 
    if(document.getElementById('userPoints')) {
        document.getElementById('userPoints').innerText = points; 
    }
}

function resetPoints() {
    if(confirm(i18n[currentLang].alertResetPoints)) {
        points = 0;
        savePoints();
    }
}

// ==========================================
// 7️⃣ المنبه الذكي وخلفية الصوت
// ==========================================
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
        
        // دالة داخلية لتشغيل نغمة تين تون الأصلية بدقة
        function triggerOriginalTintun(startTime) {
            // 🔔 نغمة "تين" (C5)
            const osc1 = context.createOscillator();
            const gain1 = context.createGain();
            osc1.type = 'sine'; // الموجة الناعمة الأصلية
            osc1.frequency.setValueAtTime(523.25, startTime); 
            gain1.gain.setValueAtTime(1.0, startTime); // أعلى درجة صوت 📢
            gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2); 
            osc1.connect(gain1);
            gain1.connect(context.destination);
            
            // 🔔 نغمة "تون" (E5) بعد 150 مللي ثانية
            const osc2 = context.createOscillator();
            const gain2 = context.createGain();
            osc2.type = 'sine'; // الموجة الناعمة الأصلية
            osc2.frequency.setValueAtTime(659.25, startTime + 0.15); 
            gain2.gain.setValueAtTime(1.0, startTime + 0.15); // أعلى درجة صوت 📢
            gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4); 
            osc2.connect(gain2);
            gain2.connect(context.destination);
            
            osc1.start(startTime);
            osc1.stop(startTime + 0.2);
            osc2.start(startTime + 0.15);
            osc2.stop(startTime + 0.4);
        }

        const now = context.currentTime;

        // 🔔 تشغيل النغمة الأصلية 3 مرات متتالية عشان تلفت انتباهك تماماً
        triggerOriginalTintun(now);        // المرة الأولى فوراً
        
    } catch (e) {
        console.log("Audio bypass error:", e);
    }
}
// ==========================================
// 8️⃣ العداد التنازلي للتخرج والاقتباسات
// ==========================================
function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    const currentQuotes = quotes[currentLang];
    if(qElem) qElem.innerText = currentQuotes[Math.floor(Math.random() * currentQuotes.length)];
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    if(document.getElementById('dateDisplay')) {
        document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString(locale, options);
    }
}

function startGraduationCountdown() {
    setInterval(() => {
        const now = new Date().getTime();
        const gap = new Date(graduationDate).getTime() - now;
        if (gap > 0) {
            const second = 1000, minute = second * 60, hour = minute * 60, day = hour * 24, year = day * 365;
            if(document.getElementById('years')) document.getElementById('years').innerText = Math.floor(gap / year);
            if(document.getElementById('days')) document.getElementById('days').innerText = Math.floor((gap % year) / day);
            if(document.getElementById('hours')) document.getElementById('hours').innerText = Math.floor((gap % day) / hour);
        }
    }, 1000);
}

// ==========================================
// 9️⃣ إدارة المهام (To-Do List)
// ==========================================
function addTask() {
    const input = document.getElementById('taskInput');
    if (!input) return;
    const text = input.value.trim();
    if (text === '') return;
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks.push({ text: text, done: false });
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    input.value = '';
    renderTasks();
}

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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered Successfully!'))
      .catch(err => console.log('Service Worker Registration Failed: ', err));
  });
}

// ==========================================
// 🔑 إدارة حسابات المستخدمين والبيانات
// ==========================================

let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// تحميل بيانات المستخدم الحالية عند فتح الموقع
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        updateUIForLoggedInUser(currentUser.name);
        loadUserData(currentUser.email);
    }
});

// فتح وإغلاق النافذة
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// التعامل مع تسجبل الدخول / إنشاء الحساب
function handleAuth(e) {
    e.preventDefault();
    
    const name = document.getElementById('authName').value.trim();
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    const password = document.getElementById('authPassword').value;

    if (!name || !email || !password) return;

    // حفظ المستخدم الحالي
    currentUser = { name, email };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // إنشاء قاعدة بيانات خاصة بملف هذا الإيميل إذا لم تكن موجودة
    let userDatabase = JSON.parse(localStorage.getItem(`userData_${email}`)) || {
        points: points || 0,
        tasks: tasks || [],
        gradDate: graduationDate || "2027-12-31"
    };

    // دمج وتحديث البيانات المحلية
    localStorage.setItem(`userData_${email}`, JSON.stringify(userDatabase));

    // تحديث الواجهة
    updateUIForLoggedInUser(name);
    loadUserData(email);
    closeAuthModal();
}

// تحديث اسم المستخدم في الواجهة
// تحديث اسم المستخدم في عنوان الصفحة وزر الخروج
function updateUIForLoggedInUser(userName) {
    // 1. تحديث عنوان الصفحة (الذي يظهر في أعلى المتصفح)
    document.title = `Surgeon Dashboard D.${userName.toUpperCase()} ❤️`;

    // 2. تحديث الزر ليصبح "خروج"
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.innerText = "خروج";
        authBtn.onclick = logoutUser;
    }
}

// تحميل بيانات المستخدم الخاص بالإيميل
function loadUserData(email) {
    const savedData = localStorage.getItem(`userData_${email}`);
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // استرجاع النقاط والمهام المخصصة لهذا الإيميل
        if (data.points !== undefined) {
            points = data.points;
            localStorage.setItem('userPoints', points);
            if (document.getElementById('userPoints')) {
                document.getElementById('userPoints').innerText = points;
            }
        }
        
        if (data.tasks) {
            tasks = data.tasks;
            localStorage.setItem('userTasks', JSON.stringify(tasks));
            if (typeof renderTasks === 'function') renderTasks();
        }
    }
}

// حفظ أي تعديل أو تقدم على إيميل المستخدم الحالي
function saveCurrentUserData() {
    if (currentUser && currentUser.email) {
        const dataToSave = {
            points: points,
            tasks: tasks,
            gradDate: graduationDate
        };
        localStorage.setItem(`userData_${currentUser.email}`, JSON.stringify(dataToSave));
    }
}

// تسجيل الخروج
function logoutUser() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    location.reload(); // إعادة تحميل الصفحة للعودة للوضع الافتراضي
}
