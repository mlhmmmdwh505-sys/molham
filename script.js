// 1. المتغيرات الأساسية (لازم تكون بره أي دالة عشان الكل يشوفها)
let timer;
let timeLeft = 25 * 60; 

// 2. دالة تحديث الشاشة (عشان منكررش الكود)
function updateDisplay(minutes) {
    const display = document.getElementById("pomoDisplay");
    if (display) {
        display.innerText = minutes.toString().padStart(2, '0') + ":00";
    }
}

// 3. كود زرار "تأكيد الإعدادات" - القلب النابض
document.querySelector('.btn-save').onclick = function(e) {
    e.preventDefault();

    // جلب القيمة من الخانة
    const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
    const newMins = minsInput ? minsInput.value : 25;

    // أهم خطوة: تحديث الوقت الفعلي في ذاكرة الكود
    timeLeft = parseInt(newMins) * 60;
    
    // تحديث الشاشة فوراً
    updateDisplay(newMins);

    // حفظ في ذاكرة المتصفح عشان لو قفلت وفتحت
    localStorage.setItem('savedMins', newMins);

    // حتة شياكة: تغيير نص الزرار لحظياً
    const btn = e.target;
    btn.innerText = "تمت العملية بنجاح د. ملهم ✅";
    setTimeout(() => btn.innerText = "تأكيد الإعدادات ⚙️", 1500);
};

// 4. تشغيل التايمر (ابدأ المهمة)
window.startTimer = function() {
    if (timer) return; 
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            document.getElementById("pomoDisplay").innerText = 
                `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            clearInterval(timer);
            timer = null;
            alert("أحسنت يا دكتور! وقت الراحة.");
        }
    }, 1000);
};

// 5. عند تحميل الصفحة أول مرة
window.onload = function() {
    const saved = localStorage.getItem('savedMins');
    if (saved) {
        timeLeft = parseInt(saved) * 60;
        updateDisplay(saved);
        const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
        if (minsInput) minsInput.value = saved;
    }
};
