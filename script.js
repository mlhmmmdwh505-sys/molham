// --- 1. المتغيرات والبيانات المحفوظة ---
let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

const quotes = [
    "الطب رسالة، وأنت قدها! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب كبيير. ✨",
    "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉",
    "كل ساعة مذاكرة الان هي حياة تنقذها غدا.🫀",
    "لا مستحيل مع العمل .💪🏼"
];

// --- 2. تهيئة الصفحة عند الفتح ---
window.onload = () => {
    updatePointsDisplay();
    displayDate();
    startGraduationCountdown();
    changeQuote();
    renderTasks();
    
    // جلب وعرض اسم المستخدم المحفوظ
    const savedName = localStorage.getItem('userName') || "دكتور ملهم";
    document.getElementById('userNameDisplay').innerText = savedName;
    document.getElementById('userNameInput').value = savedName;
    
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
    
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
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

// --- 4. التحكم في المؤقت ---
function toggleTimer() {
    const btn = document.getElementById('startBtn');
    
    if (!isRunning) {
        isRunning = true;
        btn.innerText = "إيقاف مؤقت";
        
        let startTime = Date.now();
        let initialTimeLeft = timeLeft;

        timer = setInterval(() => {
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

// --- 5. نظام النقاط والمتجر ---
function addPoints() {
    const minsWorked = parseInt(document.getElementById('minsInput').value) || 25;
    points += (minsWorked * 3);  
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15; 
    if (points >= cost) {
        points -= cost;
        savePoints();
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        alert(`تم شراء استراحة لمدة ${min} دقائق! ☕`);
    } else {
        alert("عذراً، النقاط غير كافية! 💪");
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

// --- 6. الدوال المساعدة والعد التنازلي ---
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

// حفظ الإعدادات بالكامل بما فيها الاسم
document.getElementById('mainSaveBtn').addEventListener('click', () => {
    // حفظ الاسم وتحديث الشاشة فوراً
    const newName = document.getElementById('userNameInput').value.trim() || "دكتور ملهم";
    localStorage.setItem('userName', newName);
    document.getElementById('userNameDisplay').innerText = newName;

    // حفظ باقي الإعدادات القديمة
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    if (!isRunning) resetTimer();
    
    alert("تم حفظ وتأكيد الإعدادات والاسم بنجاح! 🩺");
});

// --- 7. نظام إدارة المهام (To-Do List) ---
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

function toggleTask(index) {
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks[index].done = !tasks[index].done;
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    renderTasks();
}

function deleteTask(index) {
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks.splice(index, 1);
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="cursor:pointer; ${task.done ? 'text-decoration: line-through; opacity: 0.5;' : ''}" onclick="toggleTask(${index})">
                ${task.done ? '✅' : '⭕'} ${task.text}
            </span>
            <button onclick="deleteTask(${index})" class="reset-mini" style="min-width:auto !important; background:none !important; border:none !important;">❌</button>
        `;
        taskList.appendChild(li);
    });
}
