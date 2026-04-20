// 1. المتغيرات الأساسية
let timer;
let timeLeft = 25 * 60;

// 2. دالة تحديث التايمر الكبير (الشاشة)
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = document.getElementById("pomoDisplay");
    if (display) {
        display.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 3. دالة تحديث عداد التخرج
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

// 4. وظائف الأزرار (ابدأ وإعادة ضبط)
function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timer);
            timer = null;
            alert("انتهت المهمة يا دكتور!");
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer);
    timer = null;
    const saved = localStorage.getItem('savedMins') || 25;
    timeLeft = parseInt(saved) * 60;
    updateTimerDisplay();
}

// 5. زرار "تأكيد الإعدادات" (تحديث لحظي لكل شيء)
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.onclick = function(e) {
            e.preventDefault();
            const minsInput = document.querySelector('.minutes-input') || document.querySelector('input[type="number"]');
            const gradInput = document.getElementById('gradDate');
            const colorInput = document.getElementById('colorPicker');

            // تحديث الدقائق
            if (minsInput) {
                timeLeft = parseInt(minsInput.value) * 60;
                localStorage.setItem('savedMins', minsInput.value);
                updateTimerDisplay();
            }
            // تحديث التاريخ
            if (gradInput && gradInput.value) {
                localStorage.setItem('graduationDate', gradInput.value);
                updateGraduationCountdown();
            }
            // تحديث اللون
            if (colorInput) {
                document.documentElement.style.setProperty('--primary', colorInput.value);
                localStorage.setItem('themeColor', colorInput.value);
            }
            
            this.innerText = "تم الحفظ ✅";
            setTimeout(() => { this.innerText = "تأكيد الإعدادات"; }, 2000);
        };
    }

    // ربط الأزرار السفلية (ابدأ وإعادة ضبط)
    const startBtn = document.querySelector('.btn-start') || document.querySelector('button:contains("ابدأ")');
    const resetBtn = document.querySelector('.btn-reset') || document.querySelector('button:contains("إعادة")');
    
    // لو مفيش كلاسات، هنربطهم بالترتيب أو من خلال الـ HTML مباشرة
    if (startBtn) startBtn.onclick = startTimer;
    if (resetBtn) resetBtn.onclick = resetTimer;
});

// 6. التحميل عند فتح الصفحة
window.onload = function() {
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) document.documentElement.style.setProperty('--primary', savedColor);

    const savedDate = localStorage.getItem('graduationDate');
    if (savedDate && document.getElementById('gradDate')) document.getElementById('gradDate').value = savedDate;

    const savedMins = localStorage.getItem('savedMins');
    if (savedMins) {
        timeLeft = parseInt(savedMins) * 60;
        updateTimerDisplay();
    }

    updateGraduationCountdown();
    setInterval(updateGraduationCountdown, 1000);
};
