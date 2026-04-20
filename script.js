// --- 1. المتغيرات الأساسية ---
let timer = null;
let coins = parseInt(localStorage.getItem('userCoins')) || 0;
// قراءة الدقائق المحفوظة أو البدء بـ 25 دقيقة افتراضياً
let savedMins = parseInt(localStorage.getItem('savedMins')) || 25;
let timeLeft = savedMins * 60;

// --- 2. دالة تحديث الشاشة (النقاط فوق والتايمر) ---
function updateUI() {
    // تحديث التايمر (id="pomoDisplay")
    const timerElem = document.getElementById('pomoDisplay');
    if (timerElem) {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        timerElem.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // تحديث النقاط في الشنطة فوق (id="coinCount")
    const coinElem = document.getElementById('coinCount');
    if (coinElem) {
        coinElem.innerText = coins;
    }

    // حفظ النقاط في ذاكرة المتصفح
    localStorage.setItem('userCoins', coins);
}

// --- 3. وظيفة زر "ابدأ المهمة" وحسبة الـ 3 نقاط ---
window.startTimer = function() {
    if (timer) return; 

    // تسجيل الدقائق اللي هتبدأ بيها عشان نحسب النقاط في الآخر
    const sessionMinutes = Math.floor(timeLeft / 60);

    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateUI();
        } else {
            clearInterval(timer);
            timer = null;
            
            // الحسبة المطلوبة: الدقيقة بـ 3 نقاط
            const earnedPoints = sessionMinutes * 3;
            coins += earnedPoints; 
            
            updateUI();
            alert(`مبروك يا دكتور! أتممت ${sessionMinutes} دقيقة وحصلت على ${earnedPoints} نقطة 🌟`);
        }
    }, 1000);
};

// --- 4. وظيفة زر "إعادة ضبط" ---
window.resetTimer = function() {
    clearInterval(timer);
    timer = null;
    timeLeft = (parseInt(localStorage.getItem('savedMins')) || 25) * 60;
    updateUI();
};

// --- 5. وظيفة زر السلة (تصفير النقاط) ---
window.resetPoints = function() {
    if (confirm("هل تريد تصفير نقاطك يا دكتور ملهم؟ 🗑️")) {
        coins = 0;
        updateUI();
    }
};

// --- 6. نظام المتجر (شراء دقائق بالنقاط) ---
document.addEventListener('click', function(e) {
    const shopItem = e.target.closest('.item');
    if (shopItem) {
        // استخراج عدد الدقائق من النص (مثلاً: 5 دق)
        const minsToBuy = parseInt(shopItem.innerText.match(/\d+/)[0]);
        const cost = minsToBuy * 15; // تكلفة الشراء ثابتة: الدقيقة بـ 15 نقطة

        if (coins >= cost) {
            coins -= cost;
            timeLeft += (minsToBuy * 60);
            updateUI();
            alert(`تم شراء ${minsToBuy} دقائق إضافية! ✅`);
        } else {
            alert(`رصيدك ${coins} نقطة، وتحتاج إلى ${cost} نقطة للشراء.`);
        }
    }
});

// --- 7. زر تأكيد الإعدادات (تغيير الوقت واللون) ---
// استبدل الجزء رقم 7 في ملف script.js بهذا الكود
const saveBtn = document.querySelector('.btn-save') || document.querySelector('.confirm-btn');

if (saveBtn) {
    saveBtn.addEventListener('click', function(e) {
        e.preventDefault(); // منع أي سلوك افتراضي
        
        // 1. جلب العناصر
        const minsInput = document.getElementById('minsInput') || document.querySelector('.minutes-input');
        const colorInput = document.getElementById('colorPicker');
        const gradDateInput = document.getElementById('gradDateInput');

        // 2. حفظ وقت الدراسة
        if (minsInput && minsInput.value) {
            const newMins = parseInt(minsInput.value);
            localStorage.setItem('savedMins', newMins);
            
            // تحديث الوقت فوراً لو التايمر مش شغال
            if (!timer) {
                timeLeft = newMins * 60;
            }
        }
        
        // 3. حفظ اللون وتطبيقه
        if (colorInput) {
            const newColor = colorInput.value;
            localStorage.setItem('themeColor', newColor);
            document.documentElement.style.setProperty('--primary', newColor);
        }

        // 4. حفظ تاريخ التخرج
        if (gradDateInput && gradDateInput.value) {
            localStorage.setItem('gradDate', gradDateInput.value);
        }

        // 5. تحديث الشاشة
        updateUI();

        // 6. تأثير بصري للزرار
        const originalText = this.innerText;
        this.innerText = "تم الحفظ ✅";
        this.style.borderColor = "#00ff88"; // تأكيد بصري باللون الأخضر
        
        setTimeout(() => {
            this.innerText = originalText;
            this.style.borderColor = ""; // إعادة اللون الأصلي
        }, 2000);
    });
}
        
        if (colorInput) {
            localStorage.setItem('themeColor', colorInput.value);
            document.documentElement.style.setProperty('--primary', colorInput.value);
        }

        updateUI();
        this.innerText = "تم الحفظ ✅";
        setTimeout(() => this.innerText = "تأكيد الإعدادات", 2000);
    };
}

// --- 8. تشغيل كل شيء عند فتح الصفحة ---
window.onload = function() {
    // استعادة اللون المحفوظ
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);
    
    updateUI();
};
