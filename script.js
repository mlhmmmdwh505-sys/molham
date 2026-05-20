// --- 1. المتغيرات والبيانات المحفوظة ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";
let currentLang = localStorage.getItem('userLang') || "ar"; 

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

// قاموس الترجمة الكامل المتوافق مع الـ HTML
const i18n = {
    ar: {
        welcome: "مرحباً بك،",
        mainTitle: "لوحة تحكم ",
        langLabel: "اللغة", nameLabel: "الاسم", colorLabel: "اللون", dateLabel: "التاريخ", minsLabel: "الدقائق",
        saveBtn: "تأكيد الإعدادات", countdownTitle: "⏳ حلم التخرج",
        years: "سنة", days: "يوم", hours: "ساعة",
        storeTitle: "☕ متجر الطاقة 1د = 15ن",
        break5: "5 د = <small>75ن</small>", break10: "10 د = <small>150ن</small>", break15: "15 د = <small>225ن</small>",
        startBtnJob: "ابدأ المهمة", startBtnPause: "إيقاف مؤقت", startBtnResume: "استئناف", startBtnBreak: "ابدأ الاستراحة ☕",
        resetBtn: "اعادة ضبط", taskPlaceholder: "أضف مهمة جديدة...",
        alertSave: "تم حفظ وتأكيد الإعدادات والاسم بنجاح! 🩺",
        alertBreak: "تم شراء استراحة بنجاح! ☕", alertNoPoints: "عذراً، النقاط غير كافية! 💪", alertResetPoints: "تصفير النقاط؟"
    },
    en: {
        welcome: "Welcome,",
        mainTitle: "Dashboard of ",
        langLabel: "Lang", nameLabel: "Name", colorLabel: "Color", dateLabel: "Date", minsLabel: "Mins",
        saveBtn: "Confirm Settings", countdownTitle: "⏳ Graduation Dream",
        years: "Years", days: "Days", hours: "Hours",
        storeTitle: "☕ Energy Store 1m = 15p",
        break5: "5 Min = <small>75p</small>", break10: "10 Min = <small>150p</small>", break15: "15 Min = <small>225p</small>",
        startBtnJob: "Start Task", startBtnPause: "Pause", startBtnResume: "Resume", startBtnBreak: "Start Break ☕",
        resetBtn: "Reset", taskPlaceholder: "Add a new task...",
        alertSave: "Settings and Name saved successfully! 🩺",
        alertBreak: "Break purchased successfully! ☕", alertNoPoints: "Sorry, not enough points! 💪", alertResetPoints: "Reset points?"
    }
};

// --- 2. دالة تهيئة الصفحة وتشغيلها عند الفتح ---
window.onload = () => {
    updatePointsDisplay();
    startGraduationCountdown();
    renderTasks();
    
    // جلب وتطبيق اللغة المحفوظة أولاً
    currentLang = localStorage.getItem('userLang') || "ar";
    document.getElementById('langSelect').value = currentLang;
    applyLanguage(currentLang);
    displayDate();
    
    // جلب وعرض الاسم المحفوظ
    const savedName = localStorage.getItem('userName') || (currentLang === 'ar' ? "ملهم" : "Molham");
    document.getElementById('userNameInput').value = savedName;
    
    const trans = i18n[currentLang];
    document.getElementById('userNameDisplay').innerText = currentLang === 'ar' ? `دكتور ${savedName}` : `Dr. ${savedName}`;
    document.getElementById('mainTitle').innerHTML = trans.mainTitle + `<span id="mainTitleName">${currentLang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}</span> 🩺`;
    
    // جلب وعرض الدقائق المحفوظة
    const savedMins = localStorage.getItem('userMins') || "25";
    document.getElementById('minsInput').value = savedMins;
    
    // جلب التاريخ واللون المحفوظين
    document.getElementById('gradDateInput').value = graduationDate;
    
    let savedColor = localStorage.getItem('themeColor');
    if (!savedColor || savedColor === "#000000" || savedColor === "transparent") {
        savedColor = "#6366f1"; 
        localStorage.setItem('themeColor', savedColor);
    }
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    // ضبط الوقت بناءً على الدقائق المحفوظة
    timeLeft = parseInt(savedMins) * 60;
    updateTimerDisplay();
    
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
};

// --- 3. دالة تطبيق وترجمة اللغة ---
function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('userLang', lang);
    
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    const trans = i18n[lang];
    const savedName = localStorage.getItem('userName') || (lang === 'ar' ? "ملهم" : "Molham");
    
    document.getElementById('welcomeWord').innerText = trans.welcome;
    document.getElementById('mainTitleName').innerText = `${lang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}`;
    document.getElementById('userNameDisplay').innerText = `${lang === 'ar' ? 'دكتور' : 'Dr.'} ${savedName}`;
    
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
}

// --- 4. زر الحفظ الرئيسي والتأكيد ---
document.getElementById('mainSaveBtn').addEventListener('click', (e) => {
    e.preventDefault(); 
    
    const selectedLang = document.getElementById('langSelect').value;
    currentLang = selectedLang;
    localStorage.setItem('userLang', selectedLang);
    applyLanguage(selectedLang);
    displayDate(); 

    const userNameInput = document.getElementById('userNameInput');
    const newName = userNameInput.value.trim() || (selectedLang === 'ar' ? "ملهم" : "Molham");
    localStorage.setItem('userName', newName);
    
    const trans = i18n[selectedLang];
    document.getElementById('welcomeWord').innerText = trans.welcome;
    document.getElementById('userNameDisplay').innerText = selectedLang === 'ar' ? `دكتور ${newName}` : `Dr. ${newName}`;
    document.getElementById('mainTitle').innerHTML = trans.mainTitle + `<span id="mainTitleName">${selectedLang === 'ar' ? 'دكتور' : 'Dr.'} ${newName}</span> 🩺`;

    const minsInput = document.getElementById('minsInput');
    const newMins = parseInt(minsInput.value) || 25;
    localStorage.setItem('userMins', newMins); 

    let newColor = document.getElementById('colorPicker').value;
    if (!newColor || newColor === "#000000") { newColor = "#6366f1"; } 
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    
    if (!isRunning) {
        timeLeft = newMins * 60;
        updateTimerDisplay();
    }
});

// --- 5. نظام المنبه والمؤقت الذكي ---
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

function toggleTimer() {
    const btn = document.getElementById('startBtn');
    const trans = i18n[currentLang];
    
    if (!isRunning) {
        isRunning = true;
        btn.innerText = trans.startBtnPause;
        
        let startTime = Date.now();
        let initialTimeLeft = timeLeft;

        timer = setInterval(() => {
            let elapsed = Math.floor((Date.now() - startTime) / 1000);
            timeLeft = initialTimeLeft - elapsed;

            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(timer);
                isRunning = false;
                btn.innerText = trans.startBtnJob;
                playAlarm();
                addPoints();
                changeQuote();
            }
            updateTimerDisplay();
        }, 1000);
    } else {
        clearInterval(timer);
        isRunning = false;
        btn.innerText = trans.startBtnResume;
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

// --- 6. نظام النقاط ومتجر الطاقة ---
function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 25;
    points += (minsWorked * 3);  
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15; 
    const trans = i18n[currentLang];
    if (points >= cost) {
        points -= cost;
        savePoints();
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
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
function updatePointsDisplay() { document.getElementById('userPoints').innerText = points; }
function resetPoints() {
    if(confirm(i18n[currentLang].alertResetPoints)) {
        points = 0;
        savePoints();
    }
}

// --- 7. الدوال المساعدة والعد التنازلي ---
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

// --- 8. نظام إدارة المهام (To-Do List) - 🎯 النسخة المحدثة لحل مشكلة اللاب توب بالكامل ---
function addTask() {
    const input = document.getElementById('taskInput');
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
    const taskList = document.getElementById('taskList');
    if (!taskList) return;
    
    // 1. تنظيف القائمة
    taskList.innerHTML = '';
    
    // 2. إجبار الكارد الخارجي الكبير نفسه (.todo-box) على التمدد بالعرض الكامل فوراً
    const parentCard = taskList.closest('.todo-box') || taskList.parentElement;
    if (parentCard) {
        parentCard.style.cssText = "display: flex !important; flex-direction: column !important; width: 100% !important; min-width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; padding: 25px !important; overflow: hidden !important;";
    }
    
    // 3. ضبط حاوية المهام (الـ ul) لتظهر بعرض كامل وتتسع لمهمتين بالظبط مع مغناطيس ناعم
    taskList.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        min-width: 100% !important;
        gap: 10px !important;
        padding: 0 !important;
        margin: 15px 0 0 0 !important;
        text-align: right !important;
        box-sizing: border-box !important;
        height: 124px !important;
        max-height: 124px !important;
        overflow-y: scroll !important;
        scroll-snap-type: y mandatory !important;
        scroll-behavior: smooth !important;
    `;

    // حقن ستايل مخفي لإخفاء شريط السكرول المزعج
    if (!document.getElementById('scroll-hide-style')) {
        const style = document.createElement('style');
        style.id = 'scroll-hide-style';
        style.innerHTML = `#taskList::-webkit-scrollbar { width: 0px !important; background: transparent !important; }`;
        document.head.appendChild(style);
    }
    
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'fixed-task-item'; 
        
        // 4. كبسولة المهمة الفردية: مفرودة تماماً وواخدة العرض كله ومجهّزة للمغناطيس
        li.style.cssText = `
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            min-width: 100% !important;
            box-sizing: border-box !important;
            height: 52px !important;
            min-height: 52px !important;
            max-height: 52px !important;
            padding: 0 20px !important;
            background: rgba(255, 255, 255, 0.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 15px !important;
            flex-shrink: 0 !important;
            scroll-snap-align: start !important;
            scroll-snap-stop: always !important;
        `;
        
        li.innerHTML = `
            <div style="display: flex !important; align-items: center !important; gap: 12px !important; flex: 1 !important; min-width: 0 !important; cursor: pointer !important; direction: rtl !important;" onclick="toggleTask(${index})">
                <span style="flex-shrink: 0 !important; font-size: 16px !important;">${task.done ? '✅' : '⭕'}</span>
                <span style="flex-grow: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; text-align: right !important; font-weight: 600 !important; font-size: 15px !important; color: #ffffff !important; ${task.done ? 'text-decoration: line-through !important; opacity: 0.5 !important;' : ''}">
                    ${task.text}
                </span>
            </div>
            <button onclick="deleteTask(${index})" class="reset-mini" style="min-width: auto !important; width: auto !important; background: none !important; border: none !important; cursor: pointer !important; padding: 0 5px !important; flex-shrink: 0 !important; font-size: 14px !important; margin-right: 15px !important; color: #ff4444 !important;">❌</button>
        `;
        taskList.appendChild(li);
    });
}
