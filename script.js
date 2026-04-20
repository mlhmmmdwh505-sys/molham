// 1. المتغيرات الأساسية
let timer;
let timeLeft = 25 * 60;
// قراءة النقاط من الذاكرة أو وضع 1000 نقطة كهدية بداية للدكتور
let coins = parseInt(localStorage.getItem('userCoins')) || 1000; 

// 2. تحديث الشاشة (التايمر والنقاط)
function updateUI() {
    // تحديث التايمر
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById("pomoDisplay").innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // تحديث رقم النقاط فوق
    const coinSpan = document.querySelector('.coins span') || document.querySelector('.coin-count');
    if (coinSpan) coinSpan.innerText = coins;
    
    localStorage.setItem('userCoins', coins);
}

// 3. نظام متجر الطاقة (خصم نقاط وإضافة دقائق)
document.querySelectorAll('.item').forEach(item => {
    item.onclick = function() {
        const mins = parseInt(this.innerText.match(/\d+/)[0]);
        const price = mins * 15; // الدقيقة بـ 15 نقطة

        if (coins >= price) {
            coins -= price;
            timeLeft += (mins * 60);
            updateUI();
            alert(`تم الشراء بنجاح! +${mins} دقائق. الرصيد المتبقي: ${coins}`);
        } else {
            alert(`رصيدك ${coins} نقطة فقط. تحتاج إلى ${price} نقطة لشراء هذا العنصر!`);
        }
    };
});

// 4. زرار "تأكيد الإعدادات" (تحديث لحظي بدون ريفريش)
document.querySelector('.btn-save').onclick = function(e) {
    e.preventDefault();
    const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
    const gradInput = document.getElementById('gradDate');
    const colorInput = document.getElementById('colorPicker');

    if (minsInput) {
        timeLeft = parseInt(minsInput.value) * 60;
        localStorage.setItem('savedMins', minsInput.value);
    }
    if (gradInput && gradInput.value) localStorage.setItem('graduationDate', gradInput.value);
    if (colorInput) {
        document.documentElement.style.setProperty('--primary', colorInput.value);
        localStorage.setItem('themeColor', colorInput.value);
    }
    
    updateUI();
    updateGraduationCountdown();
    this.innerText = "تم الحفظ ✅";
    setTimeout(() => this.innerText = "تأكيد الإعدادات", 2000);
};

// 5. عداد حلم التخرج
function updateGraduationCountdown() {
    const targetDate = localStorage.getItem('graduationDate');
    if (!targetDate) return;
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    if (diff > 0) {
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        document.getElementById("years").innerText = years.toString().padStart(2, '0');
        document.getElementById("days").innerText = days.toString().padStart(2, '0');
        document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
    }
}

// 6. أزرار التايمر الأساسية
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

// تشغيل العدادات عند الفتح
window.onload = () => {
    updateUI();
    updateGraduationCountdown();
    setInterval(updateGraduationCountdown, 1000);
    
    // تحميل اللون المحفوظ
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);
};
