/**
 * لوحة تحكم د. ملهم ممدوح - النسخة النهائية المستقرة
 */

// 1. المتغيرات العالمية (Global Variables)
let timer = null;
let timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
let coins = parseInt(localStorage.getItem('userCoins')) || 1000; // رصيد افتراضي 1000

// 2. دالة التحديث الشاملة (تحديث الأرقام على الشاشة)
function updateUI() {
    // تحديث النقاط فوق
    const coinDisplay = document.getElementById('coinCount');
    if (coinDisplay) coinDisplay.innerText = coins;
    localStorage.setItem('userCoins', coins);

    // تحديث التايمر (الدقائق : الثواني)
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const pomoDisplay = document.getElementById('pomoDisplay');
    if (pomoDisplay) {
        pomoDisplay.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 3. أزرار التايمر (ابدأ / إعادة ضبط)
window.startTimer = function() {
    if (timer) return; // منع تشغيل أكثر من تايمر في نفس الوقت
    
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
            alert("انتهت جلسة التركيز يا دكتور ملهم! وقت الراحة.");
        }
    }, 1000);
};

window.resetTimer = function() {
    clearInterval(timer);
    timer = null;
    // العودة للدقائق المحفوظة في الإعدادات
    const saved = parseInt(localStorage.getItem('savedMins')) || 25;
    timeLeft = saved * 60;
    updateUI();
};

// 4. نظام متجر الطاقة (شراء وقت بالنقاط)
document.addEventListener('click', function(e) {
    // البحث عن أقرب عنصر يحمل كلاس item (المربعات الخاصة بالدقائق)
    const storeItem = e.target.closest('.item');
    if (storeItem) {
        const minsToBuy = parseInt(storeItem.innerText.match(/\d+/)[0]);
        const cost = minsToBuy * 15; // الدقيقة بـ 15 نقطة

        if (coins >= cost) {
            coins -= cost;
            timeLeft += (minsToBuy * 60);
            updateUI();
            alert(`تم شراء ${minsToBuy} دقائق بنجاح! ✅`);
        } else {
            alert(`عذراً دكتور، رصيدك ${coins} والمطلوب ${cost} نقطة!`);
        }
    }
});

// 5. تصفير النقاط (زر السلة)
window.resetPoints = function() {
    if (confirm("هل أنت متأكد من تصفير رصيد النقاط؟")) {
        coins = 0;
        updateUI();
    }
};

// 6. زر تأكيد الإعدادات (حفظ الوقت واللون والتاريخ)
const saveSettingsBtn = document.querySelector('.btn-save');
if (saveSettingsBtn) {
    saveSettingsBtn.onclick = function(e) {
        e.preventDefault();
        
        const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
        const colorInput = document.getElementById('colorPicker');
        const gradInput = document.getElementById('gradDate');

        // حفظ الدقائق وتغيير التايمر فوراً
        if (minsInput && minsInput.value) {
            const newMins = parseInt(minsInput.value);
            localStorage.setItem('savedMins', newMins);
            timeLeft = newMins * 60;
        }

        // حفظ اللون وتطبيقه
        if (colorInput) {
            localStorage.setItem('themeColor', colorInput.value);
            document.documentElement.style.setProperty('--primary', colorInput.value);
        }

        // حفظ التاريخ
        if (gradInput && gradInput.value) {
            localStorage.setItem('graduationDate', gradInput.value);
        }

        updateUI(); // تحديث الشاشة بالبيانات الجديدة
        if (typeof updateGraduationCountdown === 'function') updateGraduationCountdown();

        // حركة تأكيد على الزرار
        const originalText = this.innerText;
        this.innerText = "تم الحفظ ✅";
        setTimeout(() => this.innerText = originalText, 2000);
    };
}

// 7. تشغيل الصفحة لأول مرة (Load)
window.onload = function() {
    // تطبيق اللون المحفوظ من قبل
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);

    // تحديث كل شيء على الشاشة
    updateUI();
    
    // تشغيل عداد التخرج إذا كان موجوداً
    if (document.getElementById('years')) {
        updateGraduationCountdown();
        setInterval(updateGraduationCountdown, 1000);
    }
};

// 8. دالة عداد التخرج (حلم التخرج)
function updateGraduationCountdown() {
    const targetDate = localStorage.getItem('graduationDate');
    if (!targetDate) return;

    const diff = new Date(targetDate).getTime() - new Date().getTime();
    if (diff > 0) {
        const y = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const d = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (document.getElementById("years")) document.getElementById("years").innerText = y.toString().padStart(2, '0');
        if (document.getElementById("days")) document.getElementById("days").innerText = d.toString().padStart(2, '0');
        if (document.getElementById("hours")) document.getElementById("hours").innerText = h.toString().padStart(2, '0');
    }
}
