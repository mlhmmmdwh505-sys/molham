// 1. المتغيرات الأساسية (Global)
let timer;
let timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
let coins = parseInt(localStorage.getItem('userCoins')) || 1000;

// 2. دالة تحديث الشاشة الشاملة
function updateUI() {
    // تحديث النقاط فوق
    const coinDisplay = document.getElementById('coinCount') || document.querySelector('.coins span');
    if (coinDisplay) coinDisplay.innerText = coins;
    localStorage.setItem('userCoins', coins);

    // تحديث التايمر الكبير
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const pomoDisplay = document.getElementById('pomoDisplay');
    if (pomoDisplay) {
        pomoDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 3. دالة تصفير النقاط (السلة)
window.resetPoints = function() {
    if (confirm("هل تريد تصفير نقاطك يا دكتور؟")) {
        coins = 0;
        updateUI();
    }
};

// 4. أزرار التايمر (ابدأ وإعادة ضبط)
window.startTimer = function() {
    if (timer) return;
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
            alert("أحسنت يا دكتور! وقت الراحة.");
        }
    }, 1000);
};

window.resetTimer = function() {
    clearInterval(timer);
    timer = null;
    timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
    updateUI();
};

// 5. نظام المتجر (شراء الدقائق)
document.addEventListener('click', function(e) {
    if (e.target.closest('.item')) {
        const item = e.target.closest('.item');
        const minsToAdd = parseInt(item.innerText.match(/\d+/)[0]);
        const price = minsToAdd * 15;

        if (coins >= price) {
            coins -= price;
            timeLeft += (minsToAdd * 60);
            updateUI();
            alert(`تم الشراء! +${minsToAdd} دقائق.`);
        } else {
            alert("نقاطك لا تكفي يا دكتور.");
        }
    }
});

// 6. زرار تأكيد الإعدادات
const saveBtn = document.querySelector('.btn-save');
if (saveBtn) {
    saveBtn.onclick = function(e) {
        e.preventDefault();
        const minsInput = document.querySelector('.minutes-input');
        const colorInput = document.getElementById('colorPicker');
        const gradInput = document.getElementById('gradDate');

        if (minsInput) {
            const newMins = parseInt(minsInput.value);
            timeLeft = newMins * 60;
            localStorage.setItem('savedMins', newMins);
        }
        if (colorInput) {
            document.documentElement.style.setProperty('--primary', colorInput.value);
            localStorage.setItem('themeColor', colorInput.value);
        }
        if (gradInput && gradInput.value) {
            localStorage.setItem('graduationDate', gradInput.value);
        }

        updateUI();
        updateGraduationCountdown();
        this.innerText = "تم الحفظ ✅";
        setTimeout(() => this.innerText = "تأكيد الإعدادات", 2000);
    };
}

// 7. عداد التخرج
function updateGraduationCountdown() {
    const targetDate = localStorage.getItem('graduationDate');
    if (!targetDate) return;
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    if (diff > 0) {
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if(document.getElementById("years")) document.getElementById("years").innerText = years.toString().padStart(2, '0');
        if(document.getElementById("days")) document.getElementById("days").innerText = days.toString().padStart(2, '0');
        if(document.getElementById("hours")) document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
    }
}

// 8. تشغيل كل شيء عند البداية
window.onload = function() {
    updateUI();
    updateGraduationCountdown();
    setInterval(updateGraduationCountdown, 1000);
    
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);
};
