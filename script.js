// ==========================================
// 1️⃣ المتغيرات والبيانات المحفوظة (State)
// ==========================================
// Guests keep their dashboard on this device; signed-in users also get instant cloud sync.
const localStorage = window.localStorage;
let timer = null;
let timeLeft = null;
let isBreak = false;
let points = localStorage.getItem('userPoints') ? parseInt(localStorage.getItem('userPoints')) : 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";
let currentLang = localStorage.getItem('userLang') || "ar"; 
let temporaryLang = currentLang;  
let totalSecondsWorked = 0; // لحساب ثواني العمل الفعلية بدقة فائقة من أجل النقاط

// Copy this object from Firebase Console > Project settings > Your apps > Web app.
// Firebase config is public by design; the Firestore security rules protect each user's data.
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyD8BD5gyVpgMEaDuFU9Wn68BVUN-ChQbjw',
    authDomain: 'molham-dash-bord.firebaseapp.com',
    projectId: 'molham-dash-bord',
    storageBucket: 'molham-dash-bord.firebasestorage.app',
    messagingSenderId: '527443679426',
    appId: '1:527443679426:web:a5b4de91a9507f8845c35b'
};
const CLOUD_STATE_KEYS = ['userPoints', 'gradDate', 'userLang', 'userName', 'userMins', 'userRole', 'themeColor', 'surgeonTasks'];
let cloudUser = null;
let cloudUnsubscribe = null;
let guestModeSelected = false;

function isFirebaseConfigured() {
    return !FIREBASE_CONFIG.apiKey.startsWith('PASTE_YOUR') && !FIREBASE_CONFIG.projectId.startsWith('PASTE_YOUR');
}

function showLoginError(message) {
    const errorBox = document.getElementById('googleLoginError');
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
}

function setCloudStatus(message, state = 'connected') {
    const status = document.getElementById('cloudSyncStatus');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

function setSignedInView(user) {
    const loginScreen = document.getElementById('loginScreen');
    const accountControl = document.getElementById('accountControl');
    const guestAccountControl = document.getElementById('guestAccountControl');
    const accountName = document.getElementById('accountName');
    const accountEmail = document.getElementById('accountEmail');
    const accountAvatar = document.getElementById('accountAvatar');

    if (loginScreen) loginScreen.classList.toggle('is-hidden', Boolean(user) || guestModeSelected);
    if (accountControl) accountControl.hidden = !user;
    if (guestAccountControl) guestAccountControl.hidden = Boolean(user) || !guestModeSelected;
    if (!user) return;

    setCloudStatus('جاري تحميل بيانات حسابك…', 'saving');
    if (accountName) accountName.textContent = user.name || user.displayName || user.email;
    if (accountEmail) accountEmail.textContent = user.email || '';
    if (accountAvatar) {
        accountAvatar.onerror = () => {
            accountAvatar.onerror = null;
            accountAvatar.src = 'gnome-books.png';
        };
        accountAvatar.src = user.picture || user.photoURL || 'gnome-books.png';
        accountAvatar.alt = `Account photo for ${user.name || user.displayName || 'user'}`;
    }
}

function continueAsGuest() {
    guestModeSelected = true;
    setSignedInView(null);
}

function getCloudState() {
    return CLOUD_STATE_KEYS.reduce((state, key) => {
        const value = localStorage.getItem(key);
        if (value !== null) state[key] = value;
        return state;
    }, {});
}

function updateColorPickerPreview(color) {
    const colorPicker = document.getElementById('colorPicker');
    const colorControl = document.querySelector('.color-picker-control');
    if (!colorControl) return;

    const selectedColor = color || (colorPicker && colorPicker.value) || '#6366f1';
    colorControl.style.setProperty('--selected-color', selectedColor);
}

function refreshDashboardFromStorage() {
    points = parseInt(localStorage.getItem('userPoints')) || 0;
    graduationDate = localStorage.getItem('gradDate') || '2027-12-31';
    currentLang = localStorage.getItem('userLang') || 'ar';
    temporaryLang = currentLang;

    const savedName = localStorage.getItem('userName') || (currentLang === 'ar' ? 'ملهم' : 'Molham');
    const savedMins = parseFloat(localStorage.getItem('userMins')) || 25;
    const savedColor = localStorage.getItem('themeColor') || '#6366f1';
    document.documentElement.style.setProperty('--primary', savedColor);

    if (document.getElementById('langSelect')) document.getElementById('langSelect').value = currentLang;
    if (document.getElementById('userNameInput')) document.getElementById('userNameInput').value = savedName;
    if (document.getElementById('minsInput')) document.getElementById('minsInput').value = savedMins;
    if (document.getElementById('gradDateInput')) document.getElementById('gradDateInput').value = graduationDate;
    if (document.getElementById('colorPicker')) document.getElementById('colorPicker').value = savedColor;
    updateColorPickerPreview(savedColor);

    timeLeft = Math.floor(savedMins * 60);
    updatePointsDisplay();
    updateTimerDisplay();
    applyLanguage(currentLang);
    displayDate();
}

async function writeCloudState() {
    if (!cloudUser || !isFirebaseConfigured() || !window.firebase) {
        throw new Error('Cloud account is not ready');
    }
    setCloudStatus('جارٍ حفظ التغييرات في حسابك…', 'saving');
    await firebase.firestore().collection('users').doc(cloudUser.uid).set({
        state: getCloudState(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    setCloudStatus('✓ تم الحفظ في حسابك', 'connected');
}

function saveCloudStateImmediately() {
    if (!cloudUser) return;
    writeCloudState().catch(() => {
        setCloudStatus('تعذر الحفظ السحابي', 'error');
        showLoginError('تعذر حفظ التغييرات على السحابة. تحقق من الاتصال.');
    });
}

function clearLocalUserState() {
    CLOUD_STATE_KEYS.forEach(key => localStorage.removeItem(key));
}

function applyCloudState(user, state) {
    clearLocalUserState();
    Object.entries(state).forEach(([key, value]) => localStorage.setItem(key, value));
    localStorage.setItem('molhamCloudUserId', user.uid);
    if (user.displayName) localStorage.setItem('userName', user.displayName);
    refreshDashboardFromStorage();
}

function watchCloudState(user) {
    const previousUserId = localStorage.getItem('molhamCloudUserId');
    // Never allow values left by a different account to appear in this account.
    if (previousUserId && previousUserId !== user.uid) clearLocalUserState();

    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = firebase.firestore().collection('users').doc(user.uid).onSnapshot(snapshot => {
        if (!snapshot.exists || !snapshot.data().state) {
            // First use of an account: turn the current local dashboard into its cloud dashboard.
            if (!snapshot.metadata.hasPendingWrites) saveCloudStateImmediately();
            return;
        }

        // The page has already updated locally. Apply only acknowledged or remote snapshots so an
        // active timer is not reset by Firestore's local echo; other devices update immediately.
        if (snapshot.metadata.hasPendingWrites) return;
        applyCloudState(user, snapshot.data().state);
        setCloudStatus('✓ تمت مزامنة بيانات الحساب', 'connected');
    }, error => {
        setCloudStatus('تعذر الاتصال بالسحابة', 'error');
        console.warn('Cloud sync listener error:', error);
    });
}

async function signInWithGoogle() {
    if (!isFirebaseConfigured() || !window.firebase) {
        showLoginError('أضف إعدادات Firebase في ملف script.js لتفعيل تسجيل الدخول والحفظ بين الأجهزة.');
        return;
    }
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        showLoginError('تعذر إكمال تسجيل الدخول. أعد المحاولة من فضلك.');
    }
}

function initializeCloud() {
    document.getElementById('googleLoginButton')?.addEventListener('click', signInWithGoogle);
    document.getElementById('guestLoginButton')?.addEventListener('click', signInWithGoogle);
    document.getElementById('continueAsGuestButton')?.addEventListener('click', continueAsGuest);
    document.getElementById('logoutButton')?.addEventListener('click', signOut);
    initializeAccountMenu('accountControl', 'accountMenuButton', 'accountMenu');
    initializeAccountMenu('guestAccountControl', 'guestAccountMenuButton', 'guestAccountMenu');

    if (!isFirebaseConfigured()) {
        showLoginError('أضف إعدادات Firebase في ملف script.js لتفعيل تسجيل الدخول والحفظ بين الأجهزة.');
        return;
    }

    if (!window.firebase) {
        showLoginError('تعذر تحميل خدمة الحفظ. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
        return;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(user => {
        cloudUser = user;
        setSignedInView(user);
        if (user) {
            try {
                watchCloudState(user);
            } catch (error) {
                showLoginError('تم تسجيل الدخول، لكن تعذر تحميل بياناتك السحابية.');
            }
        } else if (cloudUnsubscribe) {
            cloudUnsubscribe();
            cloudUnsubscribe = null;
        }
    });
}

function initializeAccountMenu(controlId, triggerId, menuId) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const control = document.getElementById(controlId);
    if (!trigger || !menu || !control) return;

    trigger.addEventListener('click', () => {
        const shouldOpen = menu.hidden;
        menu.hidden = !shouldOpen;
        trigger.setAttribute('aria-expanded', String(shouldOpen));
    });

    document.addEventListener('click', event => {
        if (!control.contains(event.target)) {
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            menu.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
}

function signOut() {
    guestModeSelected = false;
    if (cloudUnsubscribe) {
        cloudUnsubscribe();
        cloudUnsubscribe = null;
    }
    clearLocalUserState();
    localStorage.removeItem('molhamCloudUserId');
    if (window.firebase && firebase.auth) firebase.auth().signOut();
}

const quotes = {
    ar: [
        "الطب رسالة، وأنت قدها! 🩺",
        "كل دقيقة مذاكرة هي خطوة نحو لقب كبير. ✨",
        "تذكر دائماً لماذا بدأت.. العالم ينتظر مهاراتك. 🌍",
        "المعاناة مؤقتة، لكن اللقب أبدي. 💪",
        "أدرس اليوم لتعالج غداً.. استمر يا بطل! 💉",
        "لا مستحيل مع العمل. 💪🏼"
    ],
    en: [
        "Medicine is a mission, and you can do it! 🩺",
        "Every minute of study is a step towards greatness. ✨",
        "Remember why you started.. The world awaits you. 🌍",
        "Pain is temporary, pride is forever. 💪",
        "Study today, heal tomorrow.. Keep going! 💉",
        "Nothing is impossible with hard work. 💪🏼"
    ]
};

const i18n = {
    ar: {
        welcome: "مرحباً بك،", mainTitle: "لوحة تحكم ",
        langLabel: "اللغة", nameLabel: "الاسم", roleLabel: "الدور", colorLabel: "اللون", dateLabel: "التاريخ", minsLabel: "الدقائق", customizeLabel: "⚙️ تخصيص لوحتك", smartLabel: "اقتراح ذكي",
        saveBtn: "تأكيد الإعدادات", countdownTitle: "⏳ حلم التخرج",
        years: "سنة", days: "يوم", hours: "ساعة", storeTitle: "☕ متجر الطاقة 1د = 15ن",
        break5: "5 د = <small>75ن</small>", break10: "10 د = <small>150ن</small>", break15: "15 د = <small>225ن</small>",
        startBtnJob: "ابدأ المهمة 🚀", startBtnPause: "إيقاف مؤقت ⏸️", startBtnResume: "استئناف ▶️", startBtnBreak: "ابدأ الاستراحة ☕",
        resetBtn: "إعادة ضبط 🔁", taskPlaceholder: "أضف مهمة جديدة...",
        alertSave: "تم حفظ وتأكيد الإعدادات والاسم بنجاح! 🩺",
        alertBreak: "تم شراء استراحة بنجاح! ☕", alertNoPoints: "عذراً، النقاط غير كافية! 💪", alertResetPoints: "تصفير النقاط؟"
    },
    en: {
        welcome: "Welcome,", mainTitle: "Dashboard of ",
        langLabel: "Lang", nameLabel: "Name", roleLabel: "Role", colorLabel: "Color", dateLabel: "Date", minsLabel: "Mins", customizeLabel: "⚙️ Customize dashboard", smartLabel: "Smart suggestion",
        saveBtn: "Confirm Settings", countdownTitle: "⏳ Graduation Dream",
        years: "Years", days: "Days", hours: "Hours", storeTitle: "☕ Energy Store 1m = 15p",
        break5: "5 Min = <small>75p</small>", break10: "10 Min = <small>150p</small>", break15: "15 Min = <small>225p</small>",
        startBtnJob: "Start Task 🚀", startBtnPause: "Pause ⏸️", startBtnResume: "Resume ▶️", startBtnBreak: "Start Break ☕",
        resetBtn: "Reset 🔁", taskPlaceholder: "Add a new task...",
        alertSave: "Settings and Name saved successfully! 🩺",
        alertBreak: "Break purchased successfully! ☕", alertNoPoints: "Sorry, not enough points! 💪", alertResetPoints: "Reset points?"
    }
};

// ==========================================
// 2️⃣ دالة تهيئة الصفحة (Onload)
// ==========================================
window.onload = () => {
    updatePointsDisplay();
    startGraduationCountdown();
    
    currentLang = localStorage.getItem('userLang') || "ar";
    temporaryLang = currentLang; 
    
    if(document.getElementById('langSelect')) {
        document.getElementById('langSelect').value = currentLang;
    }
    applyLanguage(currentLang);
    displayDate();
    
    const savedName = localStorage.getItem('userName') || (currentLang === 'ar' ? "ملهم" : "Molham");
    if(document.getElementById('userNameInput')) {
        document.getElementById('userNameInput').value = savedName;
    }
    
    let savedMins = parseFloat(localStorage.getItem('userMins')) || 25;
    if(document.getElementById('minsInput')) {
        document.getElementById('minsInput').value = savedMins;
    }
    
    if(document.getElementById('gradDateInput')) {
        document.getElementById('gradDateInput').value = graduationDate;
    }
    
    let savedColor = localStorage.getItem('themeColor') || "#6366f1";
    if(document.getElementById('colorPicker')) {
        document.getElementById('colorPicker').value = savedColor;
    }
    updateColorPickerPreview(savedColor);
    document.documentElement.style.setProperty('--primary', savedColor);
    
    // ضبط الوقت الابتدائي بدون تعليق برمي الخوارزمية
    timeLeft = Math.floor(savedMins * 60);
    updateTimerDisplay();
    
    if(document.getElementById('taskInput')) {
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
};

// ==========================================
// 3️⃣ دالة تطبيق اللغة وتحديث النصوص الشاشية
// ==========================================
function getRoleOptions(lang) {
    return lang === 'ar'
        ? { medStudent: 'طالب الطب', doctor: 'الطبيب', student: 'الطالب', professional: 'الموظف', ambitious: 'الشخص الطموح' }
        : { medStudent: 'Medical student', doctor: 'Doctor', student: 'Student', professional: 'Professional', ambitious: 'Ambitious person' };
}

function getRoleName(lang) {
    const role = localStorage.getItem('userRole') || 'medStudent';
    return getRoleOptions(lang)[role] || getRoleOptions(lang).medStudent;
}

function updateRoleSelect(lang) {
    const select = document.getElementById('roleSelect');
    if (!select) return;
    const selectedRole = localStorage.getItem('userRole') || 'medStudent';
    select.innerHTML = Object.entries(getRoleOptions(lang)).map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    select.value = selectedRole;
}

function updateSmartSuggestion() {
    const suggestion = document.getElementById('smartSuggestion');
    if (!suggestion) return;
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    const pending = tasks.filter(task => !task.done);
    const role = getRoleName(currentLang);
    if (timer !== null) {
        suggestion.textContent = currentLang === 'ar' ? `أحسنت يا ${role}، ركّز الآن ولا تفتح مهمة جديدة.` : `Great work, ${role}. Stay focused; no new tasks now.`;
    } else if (pending.length) {
        suggestion.textContent = currentLang === 'ar' ? `لديك ${pending.length} مهام متبقية. ابدأ بـ: ${pending[0].text}` : `${pending.length} tasks remain. Start with: ${pending[0].text}`;
    } else {
        suggestion.textContent = currentLang === 'ar' ? `لا توجد مهام معلّقة. اختر خطوة صغيرة تناسب دورك كـ ${role}.` : `No pending tasks. Choose one small step for your role as ${role}.`;
    }
}

function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('userLang', lang); 
    
    const trans = i18n[lang];
    const savedName = localStorage.getItem('userName') || (lang === 'ar' ? "ملهم" : "Molham");
    
    if(document.getElementById('welcomeWord')) document.getElementById('welcomeWord').innerText = trans.welcome;
    if(document.getElementById('userNameDisplay')) document.getElementById('userNameDisplay').innerText = `${getRoleName(lang)} ${savedName}`;
    if(document.getElementById('mainTitle')) document.getElementById('mainTitle').innerHTML = trans.mainTitle + `<span id="mainTitleName">${getRoleName(lang)} ${savedName}</span> 🩺`;
    
    if(document.getElementById('langLabel')) document.getElementById('langLabel').innerText = trans.langLabel;
    if(document.getElementById('nameLabel')) document.getElementById('nameLabel').innerText = trans.nameLabel;
    if(document.getElementById('roleLabel')) document.getElementById('roleLabel').innerText = trans.roleLabel;
    if(document.getElementById('colorLabel')) document.getElementById('colorLabel').innerText = trans.colorLabel;
    if(document.getElementById('dateLabel')) document.getElementById('dateLabel').innerText = trans.dateLabel;
    if(document.getElementById('minsLabel')) document.getElementById('minsLabel').innerText = trans.minsLabel;
    if(document.getElementById('customizeLabel')) document.getElementById('customizeLabel').innerText = trans.customizeLabel;
    if(document.getElementById('smartLabel')) document.getElementById('smartLabel').innerText = trans.smartLabel;
    updateRoleSelect(lang);
    if(document.getElementById('mainSaveBtn')) document.getElementById('mainSaveBtn').innerText = trans.saveBtn;
    
    if(document.getElementById('countdownTitle')) document.getElementById('countdownTitle').innerText = trans.countdownTitle;
    if(document.getElementById('labelYears')) document.getElementById('labelYears').innerText = trans.years;
    if(document.getElementById('labelDays')) document.getElementById('labelDays').innerText = trans.days;
    if(document.getElementById('labelHours')) document.getElementById('labelHours').innerText = trans.hours;
    
    if(document.getElementById('storeTitle')) document.getElementById('storeTitle').innerText = trans.storeTitle;
    if(document.getElementById('itemBreak5')) document.getElementById('itemBreak5').innerHTML = trans.break5;
    if(document.getElementById('itemBreak10')) document.getElementById('itemBreak10').innerHTML = trans.break10;
    if(document.getElementById('itemBreak15')) document.getElementById('itemBreak15').innerHTML = trans.break15;
    
    if(document.getElementById('resetBtn')) document.getElementById('resetBtn').innerText = trans.resetBtn;
    if(document.getElementById('taskInput')) document.getElementById('taskInput').setAttribute('placeholder', trans.taskPlaceholder);
    
    // تحديث نص زر العداد حسب الحالة الحالية
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        if (timer === null) {
            startBtn.innerText = isBreak ? trans.startBtnBreak : trans.startBtnJob;
        } else {
            startBtn.innerText = trans.startBtnPause;
        }
    }
    
    changeQuote();
    renderTasks(); 
    updateSmartSuggestion();
}

if(document.getElementById('langSelect')) {
    document.getElementById('langSelect').addEventListener('change', function(e) {
        temporaryLang = e.target.value; 
    });
}

if (document.getElementById('colorPicker')) {
    document.getElementById('colorPicker').addEventListener('input', function(e) {
        updateColorPickerPreview(e.target.value);
    });
    updateColorPickerPreview();
}

// ==========================================
// 4️⃣ زر الحفظ الرئيسي
// ==========================================
document.getElementById('mainSaveBtn').addEventListener('click', function() {
    currentLang = temporaryLang;
    localStorage.setItem('userLang', currentLang);

    const userNameInput = document.getElementById('userNameInput');
    const newName = userNameInput.value.trim() || (currentLang === 'ar' ? "ملهم" : "Molham");
    localStorage.setItem('userName', newName);

    const roleSelect = document.getElementById('roleSelect');
    localStorage.setItem('userRole', roleSelect ? roleSelect.value : 'medStudent');

    const minsInput = document.getElementById('minsInput');
    const newMins = parseFloat(minsInput.value) || 25;
    localStorage.setItem('userMins', newMins); 

    let newColor = document.getElementById('colorPicker').value || "#6366f1";
    document.documentElement.style.setProperty('--primary', newColor);
    localStorage.setItem('themeColor', newColor);
    
    graduationDate = document.getElementById('gradDateInput').value;
    localStorage.setItem('gradDate', graduationDate);
    
    if (timer === null) {
        timeLeft = Math.floor(newMins * 60);
        updateTimerDisplay();
    }

    applyLanguage(currentLang);
    displayDate(); 
    saveCloudStateImmediately();

    const saveBtn = document.getElementById('mainSaveBtn');
    const originalText = i18n[currentLang].saveBtn;
    
    saveBtn.innerText = currentLang === 'ar' ? "تم الحفظ بنجاح! ✔️" : "Saved Successfully! ✔️";
    saveBtn.style.setProperty('background-color', 'var(--success)', 'important');
    saveBtn.style.setProperty('border-color', 'var(--success)', 'important');
    saveBtn.style.pointerEvents = "none"; 

    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.backgroundColor = "";
        saveBtn.style.borderColor = "";
        saveBtn.style.pointerEvents = "auto";
    }, 2000);
});

// ==========================================
// 5️⃣ نظام المؤقت الذكي المصلح (إيقاف مؤقت / استئناف)
// ==========================================
function toggleTimer() {
    const startBtn = document.getElementById('startBtn');
    const minsInput = document.getElementById('minsInput');
    const trans = i18n[currentLang];
    
    if (timeLeft === null || timeLeft <= 0) {
        const mins = parseFloat(minsInput.value) || 25;
        timeLeft = Math.floor(mins * 60);
    }
    
    if (timer === null) {
        // حالة البداية أو الاستئناف
        startBtn.innerText = trans.startBtnPause;
        updateSmartSuggestion();
        
        const endTime = Date.now() + (timeLeft * 1000);
        
        timer = setInterval(() => {
            const remainingMillis = endTime - Date.now();
            timeLeft = Math.ceil(remainingMillis / 1000);
            
            if (!isBreak) {
                totalSecondsWorked++; // تجميع الثواني الفعلية للدراسة فقط
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timer = null;
                playAlarm();
                
                if (!isBreak) {
                    addPoints();
                    changeQuote();
                }
                
                // إعادة ضبط المؤقت تلقائياً بعد الانتهاء
                isBreak = false;
                const mins = parseFloat(minsInput.value) || 25;
                timeLeft = Math.floor(mins * 60);
                totalSecondsWorked = 0;
                updateTimerDisplay();
                startBtn.innerText = trans.startBtnJob;
            } else {
                updateTimerDisplay();
            }
        }, 1000);
        
    } else {
        // حالة الإيقاف المؤقت (Pause)
        clearInterval(timer);
        timer = null;
        
        startBtn.innerText = trans.startBtnResume;
        updateSmartSuggestion();
        
        // حساب نقاطك فوراً عما أنجزته حتى ثانية الإيقاف
        if (!isBreak) {
            addPoints(); 
        }
    }
}

function resetTimer() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
    isBreak = false;
    totalSecondsWorked = 0;
    
    const minsInput = document.getElementById('minsInput');
    const mins = parseFloat(minsInput ? minsInput.value : 25) || 25;
    timeLeft = Math.floor(mins * 60);
    
    updateTimerDisplay();
    
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.innerText = i18n[currentLang].startBtnJob;
    }
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const displayElem = document.getElementById('pomoDisplay');
    if (displayElem) {
        displayElem.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

// ==========================================
// 6️⃣ متجر الطاقة وحساب النقاط بدقة
// ==========================================
function addPoints() {
    // كل 20 ثانية عمل حقيقي تساوي 1 نقطة (الدقيقة بـ 3 نقاط)
    if (totalSecondsWorked >= 20) {
        const newPoints = Math.floor(totalSecondsWorked / 20); 
        points += newPoints;
        savePoints();
        
        // الاحتفاظ بالثواني المتبقية التي لم تكتمل لـ 20
        totalSecondsWorked = totalSecondsWorked % 20; 
    }
}

function buyBreak(min) {
    const cost = min * 15; 
    const trans = i18n[currentLang];
    
    if (points >= cost) {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
        
        points -= cost;
        savePoints();
        
        isBreak = true;
        timeLeft = min * 60;
        totalSecondsWorked = 0; // تصفير العداد لعدم حساب نقاط في الراحة
        
        updateTimerDisplay();
        document.getElementById('startBtn').innerText = trans.startBtnBreak;
        alert(trans.alertBreak);
    } else {
        alert(trans.alertNoPoints);
    }
}

function savePoints() {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
    saveCloudStateImmediately();
}

function updatePointsDisplay() { 
    if(document.getElementById('userPoints')) {
        document.getElementById('userPoints').innerText = points; 
    }
}

function resetPoints() {
    if(confirm(i18n[currentLang].alertResetPoints)) {
        points = 0;
        savePoints();
    }
}

// ==========================================
// 7️⃣ المنبه الذكي وخلفية الصوت
// ==========================================
function playAlarm() {
    try {
        const bgTrack = document.getElementById('bgTrack');
        if (bgTrack) {
            bgTrack.src = "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wZD1tcDQyAG1vb3YAAABsbXZoZAAAAADXg4bS14OG0gAABeXgAAA+gAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
            bgTrack.play().catch(() => {});
        }

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        const context = new AudioContext();
        
        // دالة داخلية لتشغيل نغمة تين تون الأصلية بدقة
        function triggerOriginalTintun(startTime) {
            // 🔔 نغمة "تين" (C5)
            const osc1 = context.createOscillator();
            const gain1 = context.createGain();
            osc1.type = 'sine'; // الموجة الناعمة الأصلية
            osc1.frequency.setValueAtTime(523.25, startTime); 
            gain1.gain.setValueAtTime(1.0, startTime); // أعلى درجة صوت 📢
            gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2); 
            osc1.connect(gain1);
            gain1.connect(context.destination);
            
            // 🔔 نغمة "تون" (E5) بعد 150 مللي ثانية
            const osc2 = context.createOscillator();
            const gain2 = context.createGain();
            osc2.type = 'sine'; // الموجة الناعمة الأصلية
            osc2.frequency.setValueAtTime(659.25, startTime + 0.15); 
            gain2.gain.setValueAtTime(1.0, startTime + 0.15); // أعلى درجة صوت 📢
            gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4); 
            osc2.connect(gain2);
            gain2.connect(context.destination);
            
            osc1.start(startTime);
            osc1.stop(startTime + 0.2);
            osc2.start(startTime + 0.15);
            osc2.stop(startTime + 0.4);
        }

        const now = context.currentTime;

        // 🔔 تشغيل النغمة الأصلية 3 مرات متتالية عشان تلفت انتباهك تماماً
        triggerOriginalTintun(now);        // المرة الأولى فوراً
        
    } catch (e) {
        console.log("Audio bypass error:", e);
    }
}
// ==========================================
// 8️⃣ العداد التنازلي للتخرج والاقتباسات
// ==========================================
function changeQuote() {
    const qElem = document.getElementById('motivationQuote');
    const currentQuotes = quotes[currentLang];
    if(qElem) qElem.innerText = currentQuotes[Math.floor(Math.random() * currentQuotes.length)];
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    if(document.getElementById('dateDisplay')) {
        document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString(locale, options);
    }
}

function startGraduationCountdown() {
    setInterval(() => {
        const now = new Date().getTime();
        const gap = new Date(graduationDate).getTime() - now;
        if (gap > 0) {
            const second = 1000, minute = second * 60, hour = minute * 60, day = hour * 24, year = day * 365;
            if(document.getElementById('years')) document.getElementById('years').innerText = Math.floor(gap / year);
            if(document.getElementById('days')) document.getElementById('days').innerText = Math.floor((gap % year) / day);
            if(document.getElementById('hours')) document.getElementById('hours').innerText = Math.floor((gap % day) / hour);
        }
    }, 1000);
}

// ==========================================
// 9️⃣ إدارة المهام (To-Do List)
// ==========================================
function addTask() {
    const input = document.getElementById('taskInput');
    if (!input) return;
    const text = input.value.trim();
    if (text === '') return;
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks.push({ text: text, done: false });
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    saveCloudStateImmediately();
    input.value = '';
    renderTasks();
}

window.toggleTask = function(index) {
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks[index].done = !tasks[index].done;
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    saveCloudStateImmediately();
    renderTasks();
}

window.deleteTask = function(index) {
    const tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    tasks.splice(index, 1);
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    saveCloudStateImmediately();
    renderTasks();
}

function renderTasks() {
    var taskList = document.getElementById('taskList');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    var tasks = JSON.parse(localStorage.getItem('surgeonTasks')) || [];
    var isAr = currentLang === 'ar';
    var textAlignment = isAr ? 'text-align: right !important;' : 'text-align: left !important;';
    
    tasks.forEach(function(task, index) {
        var li = document.createElement('li');
        var strikeStyle = task.done ? "text-decoration: line-through !important; opacity: 0.5 !important;" : "";
        var icon = task.done ? "✅" : "⭕";
        
        li.innerHTML = 
            '<div onclick="toggleTask(' + index + ')" style="display: flex !important; flex-direction: row !important; align-items: center !important; gap: 12px !important; flex: 1 !important; min-width: 0 !important; cursor: pointer !important;">' +
                '<span style="flex-shrink: 0 !important; font-size: 16px !important;">' + icon + '</span>' +
                '<span style="flex-grow: 1 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; font-weight: 600 !important; font-size: 15px !important; color: #ffffff !important; ' + textAlignment + ' ' + strikeStyle + '">' + task.text + '</span>' +
            '</div>' +
            '<button onclick="deleteTask(' + index + ')" class="reset-mini" style="min-width: auto !important; width: auto !important; background: none !important; border: none !important; cursor: pointer !important; padding: 0 5px !important; flex-shrink: 0 !important; font-size: 14px !important; color: #ff4444 !important; margin-inline-start: 15px !important;">❌</button>';
            
        taskList.appendChild(li);
    });
    updateSmartSuggestion();
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered Successfully!'))
      .catch(err => console.log('Service Worker Registration Failed: ', err));
  });
}

window.addEventListener('load', () => {
    initializeCloud();
});
