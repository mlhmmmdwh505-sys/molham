// 1. الحالة والبيانات
let timer = null;
let coins = parseInt(localStorage.getItem('userCoins')) || 0;
let timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;

// 2. تحديث الشاشة
function updateUI() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    document.getElementById('coinCount').innerText = coins;
    localStorage.setItem('userCoins', coins);
}

// 3. وظائف التايمر (دقيقة = 3 نقاط)
document.getElementById('startBtn').addEventListener('click', () => {
    if (timer) return;
    const sessionMins = Math.floor(timeLeft / 60);
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
            coins += (sessionMins * 3); // الحسبة المطلوبة
            updateUI();
            alert(`مبروك يا دكتور! حصلت على ${sessionMins * 3} نقطة`);
        }
    }, 1000);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    clearInterval(timer);
    timer = null;
    timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
    updateUI();
});

// 4. حفظ الإعدادات (حل مشكلة الفيديو)
document.getElementById('saveConfigBtn').addEventListener('click', function() {
    const mVal = document.getElementById('minsInput').value;
    const cVal = document.getElementById('colorPicker').value;
    const dVal = document.getElementById('gradDateInput').value;

    if (mVal) {
        localStorage.setItem('savedMins', mVal);
        if (!timer) timeLeft = parseInt(mVal) * 60;
    }
    if (cVal) {
        localStorage.setItem('themeColor', cVal);
        document.documentElement.style.setProperty('--primary', cVal);
    }
    if (dVal) localStorage.setItem('gradDate', dVal);

    updateUI();
    this.innerText = "تم الحفظ ✅";
    setTimeout(() => this.innerText = "تأكيد الإعدادات 🩺", 2000);
});

// 5. متجر الطاقة (شراء راحة بـ 15 نقطة)
document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mins = parseInt(btn.getAttribute('data-mins'));
        const cost = mins * 15;
        if (coins >= cost) {
            coins -= cost;
            timeLeft += (mins * 60);
            updateUI();
        } else {
            alert("رصيدك لا يكفي يا دكتور!");
        }
    });
});

// 6. إدارة المهام وتصفير النقاط
document.getElementById('addTaskBtn').addEventListener('click', () => {
    const input = document.getElementById('taskInput');
    if (!input.value) return;
    const li = document.createElement('li');
    li.innerHTML = `${input.value} <button onclick="this.parentElement.remove()">✕</button>`;
    document.getElementById('taskList').appendChild(li);
    input.value = '';
});

document.getElementById('resetPointsBtn').addEventListener('click', () => {
    if (confirm("تصفير النقاط؟")) { coins = 0; updateUI(); }
});

// 7. عند التحميل
window.onload = () => {
    const color = localStorage.getItem('themeColor');
    if (color) document.documentElement.style.setProperty('--primary', color);
    updateUI();
    setInterval(updateGradTimer, 1000);
};

function updateGradTimer() {
    const gDate = localStorage.getItem('gradDate');
    if (!gDate) return;
    const diff = new Date(gDate) - new Date();
    if (diff > 0) {
        document.getElementById('years').innerText = Math.floor(diff / (1000*60*60*24*365));
        document.getElementById('days').innerText = Math.floor((diff % (1000*60*60*24*365)) / (1000*60*60*24));
        document.getElementById('hours').innerText = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    }
}
