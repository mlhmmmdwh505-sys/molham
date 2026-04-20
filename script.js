window.onload = function() {
    let totalPoints = localStorage.getItem("points") ? parseInt(localStorage.getItem("points")) : 0;
    const pointsDisplay = document.getElementById("userPoints");
    pointsDisplay.innerText = totalPoints;

    let timeLeft = 25 * 60;
    let timer = null;

    window.applySettings = function() {
        const color = document.getElementById('colorPicker').value;
        document.documentElement.style.setProperty('--primary', color);
        timeLeft = document.getElementById('pomoMinutes').value * 60;
        updateDisplay();
    };

    function updateDisplay() {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        document.getElementById("pomoDisplay").innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    window.startPomo = function() {
        if (timer) return;
        timer = setInterval(() => {
            if (timeLeft > 0) { timeLeft--; updateDisplay(); }
            else {
                clearInterval(timer); timer = null;
                const earned = Math.floor(document.getElementById('pomoMinutes').value * 3);
                addPoints(earned);
                alert(`أحسنت يا دكتور! حصلت على ${earned} نقطة.`);
                resetPomo();
            }
        }, 1000);
    };

    window.resetPomo = function() {
        clearInterval(timer); timer = null;
        timeLeft = document.getElementById('pomoMinutes').value * 60;
        updateDisplay();
    };

    function addPoints(amount) {
        totalPoints += amount;
        localStorage.setItem("points", totalPoints);
        pointsDisplay.innerText = totalPoints;
    }

    window.resetPoints = function() {
        if(confirm("هل تريد فعلاً تصفير نقاطك؟")) {
            totalPoints = 0; localStorage.setItem("points", 0);
            pointsDisplay.innerText = 0;
        }
    };

    window.buyBreak = function(min) {
        let cost = min * 15;
        if(totalPoints >= cost) {
            addPoints(-cost);
            timeLeft = min * 60; updateDisplay(); startPomo();
        } else { alert("نقاطك لا تكفي.. استمر في المذاكرة!"); }
    };

    window.addTask = function() {
        const inp = document.getElementById("taskInput");
        if(!inp.value) return;
        const li = document.createElement("li");
        li.innerHTML = `<span>${inp.value}</span><button onclick="this.parentElement.remove()" style="border:none !important; color:#ff4444 !important; min-width:auto !important; background:none !important;">❌</button>`;
        document.getElementById("taskList").appendChild(li);
        inp.value = "";
    };
    document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
};
// استبدل كود العداد التنازلي القديم بهذا الكود الجديد والمطور
let targetDate = localStorage.getItem("graduationDate") || "2036-06-30";
document.getElementById('gradDate').value = targetDate;

window.applySettings = function() {
    const color = document.getElementById('colorPicker').value;
    document.documentElement.style.setProperty('--primary', color);
    
    timeLeft = document.getElementById('pomoMinutes').value * 60;
    
    // حفظ وتحديث تاريخ التخرج الجديد
    targetDate = document.getElementById('gradDate').value;
    localStorage.setItem("graduationDate", targetDate);
    
    updateDisplay();
    alert("تم حفظ الإعدادات بنجاح يا دكتور! ✨");
};

setInterval(() => {
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff > 0) {
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        document.getElementById("years").innerText = years.toString().padStart(2, '0');
        document.getElementById("days").innerText = days.toString().padStart(2, '0');
        document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
    } else {
        document.getElementById("countdown").innerHTML = "<h3>مبروك التخرج! 🎉</h3>";
    }
}, 1000);
// --- كود التحديث اللحظي (بدون ريفريش) ---
document.querySelector('.btn-save').onclick = function(e) {
    e.preventDefault();

    // 1. جلب العناصر
    const minsInput = document.querySelector('input[type="number"]') || document.querySelector('.minutes-input');
    const gradInput = document.getElementById('gradDate');
    const colorInput = document.getElementById('colorPicker');

    // 2. قراءة القيم الجديدة
    const newMins = minsInput ? minsInput.value : "25";
    const newDate = gradInput ? gradInput.value : null;
    const newColor = colorInput ? colorInput.value : null;

    // 3. التحديث اللحظي للدقائق (بدون ريفريش)
    if (document.getElementById('pomoDisplay')) {
        // تحديث النص في الشاشة فوراً
        document.getElementById('pomoDisplay').innerText = newMins.padStart(2, '0') + ":00";
        
        // تحديث متغير الوقت الفعلي (timeLeft) عشان لما تدوس "ابدأ" يبدأ من الرقم الجديد
        // بنحول الدقائق لثواني (دقائق * 60)
        timeLeft = parseInt(newMins) * 60; 
    }

    // 4. التحديث اللحظي للون (بدون ريفريش)
    if (newColor) {
        document.documentElement.style.setProperty('--primary', newColor);
    }

    // 5. حفظ كل شيء في الذاكرة (عشان لو قفلت وفتحت ميرجعش قديم)
    localStorage.setItem('savedMins', newMins);
    if (newDate) {
        localStorage.setItem('graduationDate', newDate);
        // تحديث عداد التخرج برضه لحظياً لو أمكن
        if (typeof updateGraduationCountdown === 'function') updateGraduationCountdown();
    }
    if (newColor) localStorage.setItem('themeColor', newColor);

    // 6. لمسة جمالية: تغيير لون الزرار لحظة عشان تعرف إنه سيف
    const btn = e.target;
    const originalText = btn.innerText;
    btn.innerText = "تم الحفظ! ✅";
    setTimeout(() => btn.innerText = originalText, 2000);
};
