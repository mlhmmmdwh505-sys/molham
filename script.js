// --- دالة تصفير النقاط النهائية يا دكتور ملهم ---
window.resetPoints = function() {
    // 1. التأكد من رغبتك في التصفير
    const confirmReset = confirm("هل تريد تصفير نقاطك والبدء من جديد؟ 🗑️");
    
    if (confirmReset) {
        // 2. تصفير المتغير في الكود
        coins = 0; 
        
        // 3. تصفير القيمة في ذاكرة المتصفح الدائمة
        localStorage.setItem('userCoins', 0);
        
        // 4. تحديث الرقم اللي ظاهر قدامك في الصفحة فوراً
        const coinDisplay = document.querySelector('.coins span') || 
                            document.querySelector('.coin-count') || 
                            document.querySelector('.points-value');
                            
        if (coinDisplay) {
            coinDisplay.innerText = "0";
        }

        // 5. رسالة تأكيد سريعة
        alert("تم التصفير بنجاح! بالتوفيق في جمع نقاط جديدة 🚀");
    }
};
