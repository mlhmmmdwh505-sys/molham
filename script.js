// --- 1. المتغيرات ---
let timer = null;
let coins = parseInt(localStorage.getItem('userCoins')) || 0;
let savedMins = parseInt(localStorage.getItem('savedMins')) || 25;
let timeLeft = savedMins * 60;

// --- 2. تحديث الشاشة ---
function updateUI() {
    // تحديث التايمر
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('pomoDisplay').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    // تحديث الرصيد
    document.getElementById('coinCount').innerText = coins;
    localStorage.setItem('userCoins', coins);
}

// --- 3. حل مشكلة زر التاكيد (الإصلاح الجذري) ---
document.getElementById('mainSaveBtn').addEventListener('click', function() {
    const minsVal = document.getElementById('minsInput').value;
    const colorVal = document.getElementById('colorPicker').value;
    const dateVal = document.getElementById('gradDateInput').value;

    // حفظ الوقت وتحديثه فوراً
    if (minsVal) {
        localStorage.setItem('savedMins', minsVal);
        if (!timer) { // لو التايمر مش شغال، حدث الرقم فوراً
            timeLeft = parseInt(minsVal) * 60;
        }
    }

    // حفظ وتطبيق اللون
    if (colorVal) {
        localStorage.setItem('themeColor', colorVal);
        document.documentElement.style.setProperty('--primary', colorVal);
    }

    // حفظ التاريخ
    if (dateVal) {
        localStorage.setItem('gradDate', dateVal);
    }

    updateUI(); // الإنعاش اللحظي للشاشة
    
    // تغيير شكل الزرار للتأكيد
    this.innerText = "تم الحفظ ✅";
    this.classList.add('saved-active');
    setTimeout(() => {
        this.innerText = "تأكيد الإعدادات";
        this.classList.remove('saved-active');
    }, 2000);
});

// --- 4. التايمر وحسبة الـ 3 نقاط ---
function startTimer() {
    if (timer) return;
    const sessionMins = Math.floor(timeLeft / 60);
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
            coins += (sessionMins * 3); // 3 نقاط لكل دقيقة
            updateUI();
            alert(`مبروك يا دكتور ملهم! حصلت على ${sessionMins * 3} نقطة`);
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer);
    timer = null;
    timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
    updateUI();
}

// --- 5. شراء الراحة (15 نقطة للدقيقة) ---
function buyRest(mins) {
    const cost = mins * 15;
    if (coins >= cost) {
        coins -= cost;
        timeLeft += (mins * 60);
        updateUI();
    } else {
        alert("رصيدك لا يكفي يا دكتور");
    }
}

// --- 6. تشغيل النظام عند الفتح ---
window.onload = function() {
    const color = localStorage.getItem('themeColor');
    if (color) document.documentElement.style.setProperty('--primary', color);
    
    const savedDate = localStorage.getItem('gradDate');
    if (savedDate) document.getElementById('gradDateInput').value = savedDate;

    updateUI();
    setInterval(updateGradTimer, 1000);
};

// حساب عداد التخرج
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
