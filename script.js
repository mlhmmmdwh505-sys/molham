let timer;
let timeLeft;
let isRunning = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";

const quotes = [
    "الطب رسالة، وأنت قدها يا دكتور! 🩺",
    "كل دقيقة مذاكرة هي خطوة نحو لقب 'جراح'. ✨",
    "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
    "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉"
];

window.onload = () => {
    // تحميل الاسم المحفوظ
    const savedName = localStorage.getItem('userName') || "ملهم";
    document.getElementById('userNameInput').value = savedName;
    document.getElementById('displayUserName').innerText = savedName;
    document.getElementById('welcomeTitle').innerText = `لوحة تحكم د. ${savedName} 🩺`;

    updatePointsDisplay();
    displayDate();
    changeQuote();
    
    document.getElementById('gradDateInput').value = graduationDate;
    const savedColor = localStorage.getItem('themeColor') || "#6366f1";
    document.getElementById('colorPicker').value = savedColor;
    document.documentElement.style.setProperty('--primary', savedColor);
    
    resetTimer(); 
};

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
    } catch (e) { alert("انتهى الوقت! 🔔"); }
}

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
    document.getElementById('startBtn').innerText = "ابدأ المهمة";
    const mins = parseFloat(document.getElementById('minsInput').value) || 25;
    timeLeft = Math.floor(mins * 60);
    updateTimerDisplay();
}

function addPoints() {
    const mins = parseFloat(document.getElementById('minsInput').value) || 25;
    // الحسبة: الدقيقة بـ 3 نقاط
    points += Math.floor(mins * 3);
    savePoints();
}

function buyBreak(min) {
    const cost = min * 15; // 5 دقائق بـ 75 نقطة
    if (points >= cost) {
        points -= cost;
        savePoints();
        clearInterval(timer);
        isRunning = false;
        timeLeft = min * 60;
        updateTimerDisplay();
        alert(`استراحة ممتعة يا دكتور! ☕`);
    } else { alert("نقاطك لا تكفي! تحتاج 75 نقطة. 💪"); }
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}

function updatePointsDisplay() {
    document.getElementById('userPoints').innerText = points;
}

function resetPoints() {
    if(confirm("تصفير النقاط؟")) { points = 0; savePoints(); }
}

document.getElementById('mainSaveBtn').addEventListener('click', () => {
    // حفظ الاسم وتحديث الترحيب
    const newName = document.getElementById('userNameInput').value;
    if (newName.trim() !== "") {
        localStorage.setItem('userName', newName);
        document.getElementById('displayUserName').innerText = newName;
        document.getElementById('welcomeTitle').innerText = `لوحة تحكم د. ${newName} 🩺`;
    }
    
    const newColor = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    if (!isRunning) resetTimer();
    alert("تم الحفظ! ✨");
});

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
