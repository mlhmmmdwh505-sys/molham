// 1. تعريف المتغيرات (تبدأ بـ 1000 نقطة هدية لو مفيش رصيد سابق)
let coins = parseInt(localStorage.getItem('userCoins')) || 1000;
let timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
let timer;

// 2. دالة تحديث الشاشة (النقاط فوق والتايمر تحت)
function updateUI() {
    // تحديث رصيد النقاط في الشنطة فوق
    const coinDisplay = document.getElementById('coinCount');
    if (coinDisplay) {
        coinDisplay.innerText = coins;
    }
    
    // تحديث التايمر الكبير
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const pomoDisplay = document.getElementById('pomoDisplay');
    if (pomoDisplay) {
        pomoDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // حفظ النقاط في الذاكرة
    localStorage.setItem('userCoins', coins);
}

// 3. دالة تصفير النقاط (السلة)
window.resetPoints = function() {
    if (confirm("هل تريد تصفير نقاطك يا دكتور؟")) {
        coins = 0;
        updateUI();
    }
};

// 4. نظام الشراء من المتجر
document.querySelectorAll('.item').forEach(button => {
    button.onclick = function() {
        const minsToAdd = parseInt(this.innerText.match(/\d+/)[0]);
        const price = minsToAdd * 15; // الدقيقة بـ 15 نقطة

        if (coins >= price) {
            coins -= price;
            timeLeft += (minsToAdd * 60);
            updateUI();
            alert(`تم شراء ${minsToAdd} دقائق بنجاح! ✅`);
        } else {
            alert(`نقاطك لا تكفي! تحتاج ${price} نقطة.`);
        }
    };
});

// 5. زرار تأكيد الإعدادات (حفظ الدقائق واللون والتاريخ)
document.querySelector('.btn-save').onclick = function(e) {
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
    alert("تم حفظ الإعدادات بنجاح! ✨");
};

// 6. تشغيل السيستم أول ما الصفحة تفتح
window.onload = function() {
    // تطبيق اللون المحفوظ
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);

    // تحديث كل الأرقام
    updateUI();
    
    // تشغيل عداد التخرج لو موجود
    if (typeof updateGraduationCountdown === 'function') {
        setInterval(updateGraduationCountdown, 1000);
    }
};

// دوال التايمر الأساسية
window.startTimer = function() {
    if (timer) return;
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
        }
    }, 1000);
};

window.resetTimer = function() {
    clearInterval(timer);
    timer = null;
    timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
    updateUI();
};
