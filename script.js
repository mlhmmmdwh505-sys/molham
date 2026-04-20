// 1. المتغيرات الأساسية
let timer;
let timeLeft = 25 * 60;

// 2. دالة تحديث التايمر الكبير
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = document.getElementById("pomoDisplay");
    if (display) {
        display.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 3. دالة تحديث عداد حلم التخرج
function updateGraduationCountdown() {
    const targetDate = localStorage.getItem('graduationDate');
    if (!targetDate) return;

    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff > 0) {
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if(document.getElementById("years")) document.getElementById("years").innerText = years.toString().padStart(2, '0');
        if(document.getElementById("days")) document.getElementById("days").innerText = days.toString().padStart(2, '0');
        if(document.getElementById("hours")) document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
    }
}

// 4. زرار "تأكيد الإعدادات" السحري (بيصلح الألوان والتاريخ والدقائق فوراً)
document.querySelector('.btn-save').onclick = function(e) {
    e.preventDefault();

    const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
    const gradInput = document.getElementById('gradDate');
    const colorInput = document.getElementById('colorPicker');

    // حفظ وتطبيق اللون فوراً
    if (colorInput) {
        const newColor = colorInput.value;
        document.documentElement.style.setProperty('--primary', newColor);
        localStorage.setItem('themeColor', newColor);
    }

    // حفظ وتطبيق تاريخ التخرج فوراً
    if (gradInput && gradInput.value) {
        localStorage.setItem('graduationDate', gradInput.value);
        updateGraduationCountdown();
    }

    // حفظ وتحديث الدقائق فوراً (بدون ريفريش)
    if (minsInput) {
        const newMins = minsInput.value;
        timeLeft = parseInt(newMins) * 60;
        updateTimerDisplay();
        localStorage.setItem('savedMins', newMins);
    }

    // رسالة شيك للدكتور
    const originalText = this.innerText;
    this.innerText = "تم الضبط يا دكتور ✅";
    setTimeout(() => { this.innerText = originalText; }, 2000);
};

// 5. أزرار التايمر (ابدأ وإعادة ضبط)
window.startTimer = function() {
    if (timer) return;
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timer);
            timer = null;
            alert("وقت الراحة يا دكتور!");
        }
    }, 1000);
};

window.resetTimer = function() {
    clearInterval(timer);
    timer = null;
    const saved = localStorage.getItem('savedMins') || 25;
    timeLeft = parseInt(saved) * 60;
    updateTimerDisplay();
};

// 6. تحميل كل حاجة أول ما الصفحة تفتح
window.onload = function() {
    // تحميل اللون
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) {
        document.documentElement.style.setProperty('--primary', savedColor);
        if(document.getElementById('colorPicker')) document.getElementById('colorPicker').value = savedColor;
    }

    // تحميل التاريخ
    const savedDate = localStorage.getItem('graduationDate');
    if (savedDate && document.getElementById('gradDate')) {
        document.getElementById('gradDate').value = savedDate;
    }

    // تحميل الدقائق
    const savedMins = localStorage.getItem('savedMins');
    if (savedMins) {
        timeLeft = parseInt(savedMins) * 60;
        const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
        if (minsInput) minsInput.value = savedMins;
    }

    updateTimerDisplay();
    updateGraduationCountdown();
    setInterval(updateGraduationCountdown, 1000);
};
