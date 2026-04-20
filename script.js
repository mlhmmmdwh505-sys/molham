// ==========================================
// 1. الإعدادات والبيانات الأساسية
// ==========================================
let timer;
let timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
let coins = parseInt(localStorage.getItem('userCoins')) || 1000; // هدية 1000 نقطة

// ==========================================
// 2. دالة التحديث الشاملة (القلب النابض)
// ==========================================
function updateAllUI() {
    // تحديث النقاط فوق
    const coinDisplay = document.getElementById('coinCount');
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

// ==========================================
// 3. وظائف أزرار التحكم (التايمر)
// ==========================================
window.startTimer = function() {
    if (timer) return; // منع التكرار
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateAllUI();
        } else {
            clearInterval(timer);
            timer = null;
            alert("انتهى الوقت! خذ استراحة يا دكتور.");
        }
    }, 1000);
};

window.resetTimer = function() {
    clearInterval(timer);
    timer = null;
    timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
    updateAllUI();
};

// ==========================================
// 4. نظام المتجر وتصفير النقاط
// ==========================================
// دالة السلة (تصفير)
window.resetPoints = function() {
    if (confirm("هل تريد تصفير نقاطك يا دكتور؟")) {
        coins = 0;
        updateAllUI();
    }
};

// تشغيل المتجر (شراء الدقائق)
document.addEventListener('click', function(e) {
    const storeItem = e.target.closest('.item');
    if (storeItem) {
        const mins = parseInt(storeItem.innerText.match(/\d+/)[0]);
        const price = mins * 15;

        if (coins >= price) {
            coins -= price;
            timeLeft += (mins * 60);
            updateAllUI();
            alert(`تم إضافة ${mins} دقائق لرصيدك ✅`);
        } else {
            alert(`عذراً دكتور، رصيدك ${coins} والمطلوب ${price} نقطة.`);
        }
    }
});

// ==========================================
// 5. حفظ الإعدادات (اللون، الوقت، التاريخ)
// ==========================================
const saveBtn = document.querySelector('.btn-save');
if (saveBtn) {
    saveBtn.onclick = function(e) {
        e.preventDefault();
        const minsInput = document.querySelector('.minutes-input');
        const colorInput = document.getElementById('colorPicker');
        const gradInput = document.getElementById('gradDate');

        // حفظ الدقائق
        if (minsInput && minsInput.value) {
            const val = parseInt(minsInput.value);
            timeLeft = val * 60;
            localStorage.setItem('savedMins', val);
        }
        // حفظ اللون
        if (colorInput) {
            document.documentElement.style.setProperty('--primary', colorInput.value);
            localStorage.setItem('themeColor', colorInput.value);
        }
        // حفظ التاريخ
        if (gradInput && gradInput.value) {
            localStorage.setItem('graduationDate', gradInput.value);
        }

        updateAllUI();
        if (typeof updateGraduationCountdown === 'function') updateGraduationCountdown();
        
        this.innerText = "تم الحفظ ✅";
        setTimeout(() => this.innerText = "تأكيد الإعدادات", 2000);
    };
}

// ==========================================
// 6. عداد التخرج وتشغيل الصفحة
// ==========================================
function updateGraduationCountdown() {
    const targetDate = localStorage.getItem('graduationDate');
    if (!targetDate) return;
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    if (diff > 0) {
        const y = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const d = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if(document.getElementById("years")) document.getElementById("years").innerText = y.toString().padStart(2, '0');
        if(document.getElementById("days")) document.getElementById("days").innerText = d.toString().padStart(2, '0');
        if(document.getElementById("hours")) document.getElementById("hours").innerText = h.toString().padStart(2, '0');
    }
}

window.onload = function() {
    // استعادة اللون
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);

    updateAllUI();
    updateGraduationCountdown();
    setInterval(updateGraduationCountdown, 1000);
};
