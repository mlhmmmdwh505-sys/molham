// ==========================================
// 1️⃣ المتغيرات والبيانات المحفوظة (State)
// ==========================================
// Guests keep their dashboard on this device; signed-in users also get instant cloud sync.
const localStorage = window.localStorage;
let timer = null;
let timeLeft = null;
let timerDurationSeconds = 25 * 60;
let timerUsesHoursFormat = false;
let isBreak = false;
let points = Number.parseInt(localStorage.getItem('userPoints') || '0', 10);
if (!Number.isFinite(points)) points = 0;
let graduationDate = localStorage.getItem('gradDate') || "2027-12-31";
let currentLang = localStorage.getItem('userLang') || "ar"; 
let temporaryLang = currentLang;  
let totalSecondsWorked = 0; // لحساب ثواني العمل الفعلية بدقة فائقة من أجل النقاط
let focusStartedAt = null;
let focusSegmentEndsAt = null;
let focusToastTimeout = null;
const GAME_PASS_COST = 150;
const GAME_PASS_DURATION_MS = 10 * 60 * 1000;
const TASK_REWARD_POINTS = 5;
const DAILY_TASK_REWARD_LIMIT = 30;
const SCRATCH_GAME_EMBED_URL = './pong.html?v=5';
let gameSessionEndsAt = 0;
let gameSessionInterval = null;
let gameSessionTimeout = null;
let gameSessionActive = false;
let mushafSessionOpen = false;
let contentOverlayKind = null;
let contentOverlayOpener = null;

// Copy this object from Firebase Console > Project settings > Your apps > Web app.
// Firebase config is public by design; the Firestore security rules protect each user's data.
const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyApPkvZBmE24_coF-OSn3l463X2MdJCXtc',
    authDomain: 'molham-dashboard-sync.firebaseapp.com',
    projectId: 'molham-dashboard-sync',
    storageBucket: 'molham-dashboard-sync.firebasestorage.app',
    messagingSenderId: '41203898641',
    appId: '1:41203898641:web:527ba65d32364e5c9494b0'
};
const CLOUD_STATE_KEYS = [
    'userPoints', 'gradDate', 'userLang', 'userName', 'userMins', 'userRole', 'themeColor', 'colorScheme',
    'surgeonTasks', 'focusLog', 'dailyTaskRewardState', 'pongDifficulty',
    'mushafColorScheme', 'mushafLastPage', 'mushafKhatmaPlan', 'mushafDailySurahPlan',
    'tasbeehCounterState', 'tasbeehDailyTracker', 'userAvatarData'
];
const CLOUD_SYNC_PENDING_KEY = 'molhamCloudSyncPending';
const TIMER_STATE_KEY = 'localPausedTimerState';
const DEVICE_SESSION_ID_KEY = 'molhamCloudDeviceSessionId';
const DEVICE_SESSION_USER_KEY = 'molhamCloudDeviceSessionUserId';
let cloudUser = null;
let cloudUnsubscribe = null;
let deviceSessionUnsubscribe = null;
let cloudSaveSequence = 0;
let guestModeSelected = false;
let emailVerificationUser = null;
let sessionActivationPending = false;
let sessionActivationId = '';
let sessionRegistrationId = '';

function updateThemeToggleLabel() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const isLight = document.documentElement.dataset.theme === 'light';
    const label = currentLang === 'ar'
        ? (isLight ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح')
        : (isLight ? 'Switch to dark mode' : 'Switch to light mode');
    toggle.setAttribute('aria-checked', String(isLight));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
}

function setColorScheme(theme, persist = true) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    if (persist) {
        localStorage.setItem('colorScheme', nextTheme);
        saveCloudStateImmediately();
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = nextTheme === 'light' ? '#fffaf1' : '#11190f';
    updateThemeToggleLabel();
}

function initializeThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    setColorScheme(document.documentElement.dataset.theme, false);
    toggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        setColorScheme(nextTheme);
    });
}

const dashboardLabels = {
    ar: {
        overview: 'ملخص اليوم', completed: 'إنجاز اليوم', remaining: 'مهام متبقية', focus: 'مذاكرة اليوم', streak: 'سلسلة الالتزام',
        waiting: 'مهام تنتظر إنجازك', focusHint: 'وقت تركيز فعلي', streakEmpty: 'ابدأ جلسة مذاكرة اليوم',
        noTasksToday: 'كل مهمة تمنحك ٥ نقاط، بحد أقصى ٣٠ نقطة مهام يوميًا', taskProgress: (done, total) => `أنجزت ${done} من ${total} مهام نشطة اليوم`,
        taskRewardNotice: 'أحسنت! +٥ نقاط 🪙', taskRewardLimitNotice: 'وصلت للحد اليومي لنقاط المهام (٣٠). نقاط التركيز ما زالت تُحسب.',
        gameTitle: 'استراحة ألعاب بدون إنترنت', gameSubtitle: '٥ ألعاب محلية لمدة ١٠ دقائق', gameCost: '١٥٠ 🪙',
        enterGame: 'اختر لعبة • ١٥٠ نقطة', endGame: 'إنهاء اللعب', gameTimerButton: 'باقي',
        gameNeedPoints: points => `رصيدك ${points} / ١٥٠ نقطة`,
        gameReady: 'جاهز للعب', gameActive: 'اللعبة مفتوحة داخل الموقع.',
        gameNote: 'تُغلق اللعبة تلقائيًا بعد ١٠ دقائق. إنهاؤها مبكرًا لا يعيد النقاط.',
        gameExpired: 'انتهت ١٠ دقائق وأُغلقت اللعبة.', gameClosed: 'أنهيت اللعب مبكرًا. لا تُسترد النقاط.',
        gameModalTitle: 'ألعاب الاستراحة', gameModalHint: 'تبقّى من وقت اللعب', closeGameModal: 'إنهاء وإغلاق اللعبة',
        priority: 'الأولوية', taskAdd: 'إضافة مهمة',
        priorityHigh: 'عالية', priorityMedium: 'متوسطة', priorityLow: 'منخفضة',
        noTasks: 'أضف أول مهمة من الحقل أعلاه.',
        weekKicker: 'استمرارية هادئة', weekTitle: 'سجل المذاكرة هذا الأسبوع', weekEmpty: 'ابدأ جلسة تركيز ليظهر تقدمك هنا.', weekTotal: total => `ذاكرت ${total} خلال آخر 7 أيام`,
        focusMode: 'وضع التركيز', exitFocus: 'إنهاء التركيز', quickAdd: 'إضافة مهمة', quickFocus: 'بدء التركيز', quickResume: 'متابعة التركيز', quickBreak: 'بدء الاستراحة',
        sessionComplete: minutes => `أحسنت! أنهيت جلسة تركيز مدتها ${minutes}.`, streakDays: count => `${count} ${count === 1 ? 'يوم' : 'أيام'}`,
        taskPriorityLabel: 'الأولوية',
        emptyStreak: 'ابدأ جلسة مذاكرة اليوم'
    },
    en: {
        overview: 'Today at a glance', completed: 'Completed today', remaining: 'Tasks remaining', focus: 'Study time today', streak: 'Study streak',
        waiting: 'Tasks waiting for you', focusHint: 'Focused time', streakEmpty: 'Start a study session today',
        noTasksToday: 'Each task earns 5 points, up to 30 task points per day', taskProgress: (done, total) => `${done} of ${total} active tasks completed today`,
        taskRewardNotice: 'Well done! +5 points 🪙', taskRewardLimitNotice: 'Daily task reward limit reached (30). Focus points still count.',
        gameTitle: 'Offline games break', gameSubtitle: '5 local games for 10 minutes', gameCost: '150 🪙',
        enterGame: 'Choose a game • 150 points', endGame: 'End game', gameTimerButton: 'Left',
        gameNeedPoints: points => `Balance: ${points} / 150 points`,
        gameReady: 'Ready to play', gameActive: 'The game is open inside the dashboard.',
        gameNote: 'The game closes automatically after 10 minutes. Ending early does not refund points.',
        gameExpired: 'Ten minutes are up and the game was closed.', gameClosed: 'You ended the game early. Points are not refunded.',
        gameModalTitle: 'Break games', gameModalHint: 'Time left', closeGameModal: 'End and close game',
        priority: 'Priority', taskAdd: 'Add task',
        priorityHigh: 'High', priorityMedium: 'Medium', priorityLow: 'Low',
        noTasks: 'Add your first task above.',
        weekKicker: 'Steady progress', weekTitle: 'Study log this week', weekEmpty: 'Start a focus session to see your progress here.', weekTotal: total => `${total} studied over the last 7 days`,
        focusMode: 'Focus mode', exitFocus: 'Exit focus', quickAdd: 'Add task', quickFocus: 'Start focus', quickResume: 'Resume focus', quickBreak: 'Start break',
        sessionComplete: minutes => `Well done! You completed a ${minutes} focus session.`, streakDays: count => `${count} ${count === 1 ? 'day' : 'days'}`,
        taskPriorityLabel: 'Priority',
        emptyStreak: 'Start a study session today'
    }
};

function getDashboardLabels() {
    return dashboardLabels[currentLang] || dashboardLabels.ar;
}

function getLocalDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function readStoredJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null ? fallback : value;
    } catch (error) {
        return fallback;
    }
}

function getDailyTaskRewardState() {
    const today = getLocalDayKey();
    const stored = readStoredJSON('dailyTaskRewardState', null);
    if (stored && typeof stored === 'object' && stored.day === today) {
        const earned = Number(stored.points);
        return { day: today, points: Math.min(DAILY_TASK_REWARD_LIMIT, Math.max(0, Number.isFinite(earned) ? Math.floor(earned) : 0)) };
    }

    // Migrate today's task rewards from the previous 10-point system when possible.
    const previouslyAwardedToday = getStoredTasks().filter(task => task.pointsAwarded && task.completedAt === today).length * 10;
    const migratedState = { day: today, points: Math.min(DAILY_TASK_REWARD_LIMIT, previouslyAwardedToday) };
    localStorage.setItem('dailyTaskRewardState', JSON.stringify(migratedState));
    return migratedState;
}

function getStoredTasks() {
    const tasks = readStoredJSON('surgeonTasks', []);
    return Array.isArray(tasks) ? tasks.map(task => task && typeof task === 'object' ? task : { text: String(task || ''), done: false }) : [];
}

function safeSeconds(value) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function getFocusLog() {
    const log = readStoredJSON('focusLog', {});
    return log && typeof log === 'object' && !Array.isArray(log) ? log : {};
}

function getLiveFocusSeconds() {
    return focusStartedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - focusStartedAt) / 1000));
}

function formatStudyDuration(seconds) {
    const safeDuration = safeSeconds(seconds);
    const totalMinutes = Math.floor(safeDuration / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hourLabel = currentLang === 'ar' ? 'س' : 'h';
    const minuteLabel = currentLang === 'ar' ? 'د' : 'm';
    if (hours) return minutes ? `${hours}${hourLabel} ${minutes}${minuteLabel}` : `${hours}${hourLabel}`;
    if (!totalMinutes && safeDuration > 0) return `<1${minuteLabel}`;
    return `${totalMinutes}${minuteLabel}`;
}

function getStudyStreak(focusLog) {
    const activeDates = new Set(Object.entries(focusLog)
        .filter(([, seconds]) => safeSeconds(seconds) > 0)
        .map(([date]) => date));
    const today = getLocalDayKey();
    if (getLiveFocusSeconds() > 0) activeDates.add(today);

    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!activeDates.has(today)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (activeDates.has(getLocalDayKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

function renderDailyOverview() {
    if (!document.getElementById('dailyOverview')) return;
    const labels = getDashboardLabels();
    const tasks = getStoredTasks();
    const today = getLocalDayKey();
    const completedToday = tasks.filter(task => task.done && task.completedAt === today).length;
    const remaining = tasks.filter(task => !task.done).length;
    const dailyTaskTotal = remaining + completedToday;
    const focusLog = getFocusLog();
    const focusToday = safeSeconds(focusLog[today]) + getLiveFocusSeconds();
    const streak = getStudyStreak(focusLog);
    const percent = dailyTaskTotal ? Math.round((completedToday / dailyTaskTotal) * 100) : 0;

    document.getElementById('dailyCompletedStat').textContent = String(completedToday);
    document.getElementById('dailyRemainingStat').textContent = String(remaining);
    document.getElementById('dailyFocusStat').textContent = formatStudyDuration(focusToday);
    document.getElementById('dailyStreakStat').textContent = labels.streakDays(streak);
    document.getElementById('dailyProgressBar').style.width = `${percent}%`;
    const taskRewardState = getDailyTaskRewardState();
    document.getElementById('dailyProgressText').textContent = dailyTaskTotal
        ? labels.taskProgress(completedToday, dailyTaskTotal)
        : taskRewardState.points >= DAILY_TASK_REWARD_LIMIT ? labels.taskRewardLimitNotice : labels.noTasksToday;
    document.getElementById('dailyRemainingHint').textContent = labels.waiting;
    document.getElementById('dailyFocusHint').textContent = labels.focusHint;
    document.getElementById('dailyStreakHint').textContent = streak ? labels.streak : labels.streakEmpty;

    const quickFocusButton = document.getElementById('quickFocusButton');
    const quickFocusLabel = quickFocusButton?.querySelector('span:last-child');
    if (quickFocusLabel) quickFocusLabel.textContent = timer === null ? (isBreak ? labels.quickBreak : labels.quickFocus) : labels.quickResume;
}

function renderStudyWeek() {
    const chart = document.getElementById('studyWeekChart');
    if (!chart) return;
    const labels = getDashboardLabels();
    const log = getFocusLog();
    const today = getLocalDayKey();
    const dates = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - 6 + index);
        return date;
    });
    const entries = dates.map(date => {
        const key = getLocalDayKey(date);
        const seconds = safeSeconds(log[key]) + (key === today ? getLiveFocusSeconds() : 0);
        return { date, key, seconds };
    });
    const maxSeconds = Math.max(3600, ...entries.map(entry => entry.seconds));
    const weekSeconds = entries.reduce((total, entry) => total + entry.seconds, 0);
    const weekdayNames = currentLang === 'ar'
        ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';

    chart.replaceChildren();
    entries.forEach(entry => {
        const day = document.createElement('div');
        day.className = `study-day-column${entry.key === today ? ' is-today' : ''}${entry.seconds ? ' has-study' : ''}`;
        const dateText = entry.date.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' });
        const minutes = Math.floor(entry.seconds / 60);
        day.setAttribute('aria-label', `${dateText}: ${formatStudyDuration(entry.seconds)}`);

        const duration = document.createElement('span');
        duration.className = 'study-day-duration';
        duration.textContent = minutes
            ? String(minutes)
            : entry.seconds
                ? (currentLang === 'ar' ? '<1د' : '<1m')
                : '–';
        const track = document.createElement('span');
        track.className = 'study-day-track';
        const fill = document.createElement('span');
        fill.className = 'study-day-fill';
        fill.style.height = entry.seconds ? `${Math.max(8, Math.round((entry.seconds / maxSeconds) * 100))}%` : '0%';
        track.append(fill);
        const dayLabel = document.createElement('span');
        dayLabel.className = 'study-day-label';
        dayLabel.textContent = weekdayNames[entry.date.getDay()];
        const dateNumber = document.createElement('span');
        dateNumber.className = 'study-day-number';
        dateNumber.textContent = String(entry.date.getDate());
        day.append(duration, track, dayLabel, dateNumber);
        chart.append(day);
    });

    document.getElementById('weeklyStudyTotal').textContent = formatStudyDuration(weekSeconds);
    document.getElementById('studyWeekCaption').textContent = weekSeconds
        ? labels.weekTotal(formatStudyDuration(weekSeconds))
        : labels.weekEmpty;
}

function renderDashboardInsights() {
    renderDailyOverview();
    renderStudyWeek();
}

function commitActiveFocusTime() {
    if (focusStartedAt === null) return 0;
    const elapsedMilliseconds = Math.max(0, Date.now() - focusStartedAt);
    const plannedMilliseconds = focusSegmentEndsAt === null ? elapsedMilliseconds : Math.max(0, focusSegmentEndsAt - focusStartedAt);
    const elapsed = Math.floor(Math.min(elapsedMilliseconds, plannedMilliseconds) / 1000);
    focusStartedAt = null;
    focusSegmentEndsAt = null;
    if (!elapsed) return 0;

    const focusLog = getFocusLog();
    const today = getLocalDayKey();
    focusLog[today] = safeSeconds(focusLog[today]) + elapsed;
    localStorage.setItem('focusLog', JSON.stringify(focusLog));
    saveCloudStateImmediately();
    renderDashboardInsights();
    return elapsed;
}

function showDashboardNotice(message) {
    const toast = document.getElementById('focusSessionToast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(focusToastTimeout);
    focusToastTimeout = setTimeout(() => { toast.hidden = true; }, 5200);
}

function showFocusSessionSummary(seconds) {
    if (seconds < 1) return;
    const minutes = Math.max(1, Math.round(seconds / 60));
    showDashboardNotice(getDashboardLabels().sessionComplete(currentLang === 'ar' ? `${minutes} دقيقة` : `${minutes} minutes`));
}

function formatGameTimeRemaining() {
    const seconds = Math.max(0, Math.ceil((gameSessionEndsAt - Date.now()) / 1000));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function updateGamePassUI(statusMessage = '') {
    const enterButton = document.getElementById('gameEnterButton');
    const closeButton = document.getElementById('closeGameSessionButton');
    const status = document.getElementById('gamePassStatus');
    if (!enterButton || !status) return;

    const labels = getDashboardLabels();
    const currentPoints = Number.isFinite(points) ? Math.max(0, points) : 0;
    const active = gameSessionActive && gameSessionEndsAt > Date.now();
    enterButton.disabled = active || currentPoints < GAME_PASS_COST;
    enterButton.textContent = active ? `${labels.gameTimerButton} • ${formatGameTimeRemaining()}` : labels.enterGame;
    if (closeButton) closeButton.hidden = !active;
    status.textContent = statusMessage || (active
        ? labels.gameActive
        : currentPoints < GAME_PASS_COST ? labels.gameNeedPoints(currentPoints) : labels.gameReady);

    const modalCountdown = document.getElementById('gameSessionCountdown');
    if (modalCountdown && active) modalCountdown.textContent = formatGameTimeRemaining();
    const progress = document.getElementById('gameSessionProgress');
    if (progress && active) {
        const remaining = Math.max(0, gameSessionEndsAt - Date.now());
        progress.style.transform = `scaleX(${remaining / GAME_PASS_DURATION_MS})`;
    }
}

function setGameSessionBackgroundInert(inert) {
    const modal = document.getElementById('gameSessionModal');
    Array.from(document.body.children).forEach(element => {
        if (element !== modal && element.tagName !== 'SCRIPT') element.inert = inert;
    });
}

function setMushafSessionBackgroundInert(inert) {
    const overlay = document.getElementById('mushafSessionOverlay');
    Array.from(document.body.children).forEach(element => {
        if (element !== overlay && element.tagName !== 'SCRIPT') element.inert = inert;
    });
}

function openContentOverlay(kind) {
    if (contentOverlayKind) return;
    const overlay = document.getElementById('mushafSessionOverlay');
    const frame = document.getElementById('mushafFrame');
    if (!overlay || !frame) return;

    contentOverlayKind = kind;
    contentOverlayOpener = document.activeElement;
    mushafSessionOpen = kind === 'mushaf';
    const isMushaf = mushafSessionOpen;
    overlay.classList.remove('is-mushaf-zoomed', 'is-tasbeeh-zoomed');
    const title = document.getElementById('mushafOverlayTitle');
    const closeButton = document.getElementById('closeMushafOverlayButton');
    if (title) title.textContent = isMushaf ? 'المصحف الشريف' : 'السبحة';
    if (closeButton) closeButton.setAttribute('aria-label', isMushaf ? 'إغلاق المصحف' : 'إغلاق السبحة');
    frame.title = isMushaf ? 'المصحف الشريف' : 'السبحة';
    overlay.hidden = false;
    document.documentElement.classList.add('mushaf-session-open');
    document.body.classList.add('mushaf-session-open');
    setMushafSessionBackgroundInert(true);
    updateMushafBreakStatus();
    frame.addEventListener('load', () => {
        if (!contentOverlayKind) return;
        try {
            const initialFocus = isMushaf
                ? frame.contentDocument?.getElementById('pagePaper')
                : frame.contentDocument?.getElementById('countButton');
            if (initialFocus) initialFocus.focus({ preventScroll: true });
            else frame.contentWindow?.focus();
        } catch (error) {
            frame.focus({ preventScroll: true });
        }
    }, { once: true });
    frame.src = isMushaf ? './mushaf.html?v=60' : './tasbeeh.html?v=31';
}

function openMushafOverlay() {
    openContentOverlay('mushaf');
}

function openTasbeehOverlay() {
    openContentOverlay('tasbeeh');
}

function closeMushafOverlay() {
    if (!contentOverlayKind) return;
    contentOverlayKind = null;
    mushafSessionOpen = false;
    const overlay = document.getElementById('mushafSessionOverlay');
    const frame = document.getElementById('mushafFrame');
    if (overlay) overlay.classList.remove('is-mushaf-zoomed', 'is-tasbeeh-zoomed');
    document.documentElement.classList.remove('mushaf-session-open');
    document.body.classList.remove('mushaf-session-open');
    if (overlay) overlay.hidden = true;
    if (frame) frame.src = 'about:blank';
    setMushafSessionBackgroundInert(false);
    const opener = contentOverlayOpener;
    contentOverlayOpener = null;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
}

function endEmbeddedGameSession(expired = false) {
    if (!gameSessionActive) return;
    if (gameSessionInterval !== null) {
        clearInterval(gameSessionInterval);
        gameSessionInterval = null;
    }
    if (gameSessionTimeout !== null) {
        clearTimeout(gameSessionTimeout);
        gameSessionTimeout = null;
    }
    gameSessionActive = false;
    gameSessionEndsAt = 0;
    const frame = document.getElementById('embeddedGameFrame');
    if (frame) frame.src = 'about:blank';
    const modal = document.getElementById('gameSessionModal');
    if (modal) modal.hidden = true;
    setGameSessionBackgroundInert(false);
    updateGamePassUI(expired ? getDashboardLabels().gameExpired : getDashboardLabels().gameClosed);
    document.getElementById('gameEnterButton')?.focus({ preventScroll: true });
}

function scheduleGameSessionExpiry() {
    if (gameSessionTimeout !== null) clearTimeout(gameSessionTimeout);
    const remaining = Math.max(0, gameSessionEndsAt - Date.now());
    gameSessionTimeout = setTimeout(() => endEmbeddedGameSession(true), remaining);
}

function updateEmbeddedGameSession() {
    if (!gameSessionActive) return;
    if (Date.now() >= gameSessionEndsAt) {
        endEmbeddedGameSession(true);
        return;
    }
    updateGamePassUI();
}

function checkGameSessionOnReturn() {
    if (gameSessionActive && document.visibilityState === 'visible') updateEmbeddedGameSession();
}

function enterEmbeddedGame() {
    if (gameSessionActive) return;
    if (!Number.isFinite(points) || points < GAME_PASS_COST) {
        updateGamePassUI(getDashboardLabels().gameNeedPoints(Number.isFinite(points) ? Math.max(0, points) : 0));
        return;
    }

    const modal = document.getElementById('gameSessionModal');
    const frame = document.getElementById('embeddedGameFrame');
    if (!modal || !frame) return;

    gameSessionActive = true;
    gameSessionEndsAt = Date.now() + GAME_PASS_DURATION_MS;
    points -= GAME_PASS_COST;
    localStorage.setItem('userPoints', String(points));
    updatePointsDisplay();
    saveCloudStateImmediately();
    setGameSessionBackgroundInert(true);
    modal.hidden = false;
    frame.src = SCRATCH_GAME_EMBED_URL;
    document.getElementById('closeGameModalButton')?.focus({ preventScroll: true });
    updateGamePassUI();
    gameSessionInterval = setInterval(updateEmbeddedGameSession, 1000);
    scheduleGameSessionExpiry();
}

function updateFocusModeButton() {
    const button = document.getElementById('focusModeToggle');
    if (!button) return;
    const isActive = document.body.classList.contains('focus-mode');
    button.setAttribute('aria-pressed', String(isActive));
    button.textContent = isActive ? getDashboardLabels().exitFocus : getDashboardLabels().focusMode;
}

function setFocusMode(enabled) {
    const isEnabled = Boolean(enabled);
    document.body.classList.toggle('focus-mode', isEnabled);
    document.documentElement.classList.toggle('focus-mode-active', isEnabled);
    updateFocusModeButton();
    if (isEnabled) {
        changeFocusVerse();
        const root = document.documentElement;
        const requestFullscreen = root.requestFullscreen?.bind(root)
            || root.webkitRequestFullscreen?.bind(root);
        try {
            const request = requestFullscreen?.();
            request?.catch(() => {});
        } catch (error) { /* The full-window focus layout remains available. */ }
    } else if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exitFullscreen = document.exitFullscreen?.bind(document)
            || document.webkitExitFullscreen?.bind(document);
        try {
            const exit = exitFullscreen?.();
            exit?.catch(() => {});
        } catch (error) { /* Focus mode is already closed in the dashboard. */ }
    }
    const quickFocusButton = document.getElementById('quickFocusButton');
    if (quickFocusButton) {
        const label = quickFocusButton.querySelector('span:last-child');
        if (label) label.textContent = timer === null ? (isBreak ? getDashboardLabels().quickBreak : getDashboardLabels().quickFocus) : getDashboardLabels().quickResume;
    }
}

function syncFocusModeAfterFullscreenExit() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    if (!document.body.classList.contains('focus-mode')) return;
    document.body.classList.remove('focus-mode');
    document.documentElement.classList.remove('focus-mode-active');
    updateFocusModeButton();
}

document.addEventListener('fullscreenchange', syncFocusModeAfterFullscreenExit);
document.addEventListener('webkitfullscreenchange', syncFocusModeAfterFullscreenExit);

function applyDashboardLanguage() {
    const labels = getDashboardLabels();
    const textById = {
        dailyCompletedLabel: labels.completed,
        dailyRemainingLabel: labels.remaining,
        dailyFocusLabel: labels.focus,
        dailyStreakLabel: labels.streak,
        dailyRemainingHint: labels.waiting,
        dailyFocusHint: labels.focusHint,
        studyWeekKicker: labels.weekKicker,
        studyWeekTitle: labels.weekTitle,
        taskPriorityLabel: labels.taskPriorityLabel,
        gamePassTitle: labels.gameTitle,
        gamePassSubtitle: labels.gameSubtitle,
        gamePassCost: labels.gameCost,
        gamePassNote: labels.gameNote,
        quickAddTaskLabel: labels.quickAdd,
        quickFocusLabel: labels.quickFocus
    };
    Object.entries(textById).forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    });

    const overview = document.getElementById('dailyOverview');
    if (overview) overview.setAttribute('aria-label', labels.overview);
    const chart = document.getElementById('studyWeekChart');
    if (chart) chart.setAttribute('aria-label', currentLang === 'ar' ? 'سجل دقائق المذاكرة خلال آخر سبعة أيام' : 'Study minutes over the last seven days');
    const priority = document.getElementById('taskPriority');
    if (priority) {
        priority.options[0].textContent = labels.priorityMedium;
        priority.options[1].textContent = labels.priorityHigh;
        priority.options[2].textContent = labels.priorityLow;
    }
    const addButton = document.getElementById('taskAddButton');
    if (addButton) {
        addButton.setAttribute('aria-label', labels.taskAdd);
        addButton.title = labels.taskAdd;
    }
    const gameButton = document.getElementById('gameEnterButton');
    if (gameButton) gameButton.textContent = labels.enterGame;
    const endGameButton = document.getElementById('closeGameSessionButton');
    if (endGameButton) endGameButton.textContent = labels.endGame;
    const modalTitle = document.getElementById('gameSessionModalTitle');
    if (modalTitle) modalTitle.textContent = labels.gameModalTitle;
    const modalHint = document.getElementById('gameSessionModalHint');
    if (modalHint) modalHint.textContent = labels.gameModalHint;
    const modalClose = document.getElementById('closeGameModalButton');
    if (modalClose) modalClose.setAttribute('aria-label', labels.closeGameModal);
    updateFocusModeButton();
    updateGamePassUI();
}

function initializeDashboardFeatures() {
    const taskList = document.getElementById('taskList');
    const taskInput = document.getElementById('taskInput');
    const mushafOpenLink = document.getElementById('mushafOpenLink');
    const tasbeehOpenLink = document.getElementById('tasbeehOpenLink');
    const topActions = document.querySelector('.top-actions');
    const topActionsToggle = document.getElementById('topActionsToggle');
    const dashboardActionMenu = document.getElementById('dashboardActionMenu');
    const focusButton = document.getElementById('focusModeToggle');
    const quickAddButton = document.getElementById('quickAddTaskButton');
    const quickFocusButton = document.getElementById('quickFocusButton');
    const gameButton = document.getElementById('gameEnterButton');
    const endGameButton = document.getElementById('closeGameSessionButton');

    const setDashboardActionMenuOpen = (open, restoreFocus = false) => {
        if (!topActionsToggle || !dashboardActionMenu) return;
        dashboardActionMenu.hidden = !open;
        topActionsToggle.setAttribute('aria-expanded', String(open));
        topActions?.closest('.glass-card')?.classList.toggle('action-menu-open', open);
        if (restoreFocus) topActionsToggle.focus({ preventScroll: true });
    };

    if (topActionsToggle && dashboardActionMenu) topActionsToggle.addEventListener('click', () => {
        setDashboardActionMenuOpen(dashboardActionMenu.hidden);
    });
    document.addEventListener('click', event => {
        if (dashboardActionMenu && !dashboardActionMenu.hidden && !topActions?.contains(event.target)) {
            setDashboardActionMenuOpen(false);
        }
    });

    if (mushafOpenLink) mushafOpenLink.addEventListener('click', event => {
        event.preventDefault();
        setDashboardActionMenuOpen(false);
        topActionsToggle?.focus({ preventScroll: true });
        openMushafOverlay();
    });
    if (tasbeehOpenLink) tasbeehOpenLink.addEventListener('click', event => {
        event.preventDefault();
        setDashboardActionMenuOpen(false);
        topActionsToggle?.focus({ preventScroll: true });
        openTasbeehOverlay();
    });

    if (taskList) {
        taskList.addEventListener('click', event => {
            const action = event.target.closest('[data-task-action]');
            if (!action) return;
            const index = Number(action.dataset.taskIndex);
            if (action.dataset.taskAction === 'toggle') window.toggleTask(index);
            if (action.dataset.taskAction === 'delete') window.deleteTask(index);
        });
    }
    if (focusButton) focusButton.addEventListener('click', () => setFocusMode(!document.body.classList.contains('focus-mode')));
    if (quickAddButton) quickAddButton.addEventListener('click', () => {
        setFocusMode(false);
        document.querySelector('.tasks-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => taskInput?.focus({ preventScroll: true }), 180);
    });
    if (quickFocusButton) quickFocusButton.addEventListener('click', () => {
        if (timer === null) toggleTimer();
        setFocusMode(true);
    });
    if (gameButton) gameButton.addEventListener('click', enterEmbeddedGame);
    if (endGameButton) endGameButton.addEventListener('click', () => endEmbeddedGameSession(false));
    const modalCloseButton = document.getElementById('closeGameModalButton');
    if (modalCloseButton) modalCloseButton.addEventListener('click', () => endEmbeddedGameSession(false));
    document.getElementById('closeMushafOverlayButton')?.addEventListener('click', closeMushafOverlay);
    document.getElementById('mushafSessionOverlay')?.addEventListener('click', event => {
        if (event.target.id === 'mushafSessionOverlay') closeMushafOverlay();
    });
    const mushafFrame = document.getElementById('mushafFrame');
    window.addEventListener('message', event => {
        if (event.origin !== window.location.origin || event.source !== mushafFrame?.contentWindow) return;
        if (event.data?.type === 'molham:close-mushaf' || event.data?.type === 'molham:close-tasbeeh') closeMushafOverlay();
        if (event.data?.type === 'molham:mushaf-zoom-mode') {
            document.getElementById('mushafSessionOverlay')?.classList.toggle('is-mushaf-zoomed', Boolean(event.data.enabled));
        }
        if (event.data?.type === 'molham:tasbeeh-zoom-mode') {
            document.getElementById('mushafSessionOverlay')?.classList.toggle('is-tasbeeh-zoomed', Boolean(event.data.enabled));
        }
    });
    document.addEventListener('keydown', event => {
        if (!mushafSessionOpen) return;
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && contentOverlayKind) {
            closeMushafOverlay();
            return;
        }
        if (event.key === 'Escape' && dashboardActionMenu && !dashboardActionMenu.hidden) {
            setDashboardActionMenuOpen(false, true);
            return;
        }
        if (event.key === 'Escape' && gameSessionActive) {
            endEmbeddedGameSession(false);
            return;
        }
        if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) setFocusMode(false);
    });
    document.addEventListener('visibilitychange', checkGameSessionOnReturn);
    window.addEventListener('focus', checkGameSessionOnReturn);
    window.addEventListener('pagehide', event => {
        if (!event.persisted) commitActiveFocusTime();
    });
    window.addEventListener('pagehide', () => {
        if (gameSessionActive) endEmbeddedGameSession(false);
    }, { once: true });

    applyDashboardLanguage();
    updateGamePassUI();
    renderTasks();
    renderDashboardInsights();
}

function isFirebaseConfigured() {
    return !FIREBASE_CONFIG.apiKey.startsWith('PASTE_YOUR') && !FIREBASE_CONFIG.projectId.startsWith('PASTE_YOUR');
}

function showLoginError(message) {
    const errorBox = document.getElementById('googleLoginError');
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
    const status = document.getElementById('loginStatus');
    if (status) status.hidden = true;
}

function setLoginStatus(message) {
    const status = document.getElementById('loginStatus');
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    const errorBox = document.getElementById('googleLoginError');
    if (errorBox) errorBox.hidden = true;
}

function loginMessage(arabic, english) {
    return currentLang === 'en' ? english : arabic;
}

function canStartCloudSignIn() {
    if (!navigator.onLine) {
        showLoginError(loginMessage('تسجيل الدخول والمزامنة يحتاجان اتصالًا بالإنترنت. يمكنك المتابعة كضيف الآن.', 'Sign-in and cloud sync require an internet connection. You can continue as a guest.'));
        return false;
    }
    if (!isFirebaseConfigured() || !window.firebase) {
        showLoginError(loginMessage('خدمة تسجيل الدخول غير جاهزة حاليًا.', 'Sign-in is not available right now.'));
        return false;
    }
    return true;
}

function authErrorMessage(error, fallback) {
    const code = String(error?.code || '').replace(/^auth\//, '');
    const messages = {
        'operation-not-allowed': loginMessage('طريقة تسجيل الدخول دي لم تُفعّل في Firebase بعد.', 'This sign-in method is not enabled in Firebase yet.'),
        'unauthorized-domain': loginMessage('نطاق الموقع غير مضاف ضمن النطاقات المسموح بها في Firebase.', 'This website domain is not authorized in Firebase.'),
        'account-exists-with-different-credential': loginMessage('هذا البريد مرتبط بطريقة دخول أخرى. سجّل بالطريقة الأصلية أولًا.', 'This email already uses another sign-in method. Sign in with that method first.'),
        'popup-blocked': loginMessage('المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.', 'Your browser blocked the sign-in popup. Allow popups and try again.'),
        'too-many-requests': loginMessage('طلبات كثيرة؛ انتظر قليلًا ثم أعد المحاولة.', 'Too many attempts. Wait a little and try again.'),
        'invalid-email': loginMessage('اكتب بريدًا إلكترونيًا صحيحًا.', 'Enter a valid email address.'),
        'email-already-in-use': loginMessage('هذا البريد لديه حساب بالفعل. سجّل الدخول بدل إنشاء حساب جديد.', 'This email already has an account. Switch to sign in instead.'),
        'weak-password': loginMessage('كلمة المرور ضعيفة؛ استخدم 6 أحرف على الأقل.', 'That password is too weak. Use at least 6 characters.'),
        'user-not-found': loginMessage('لم نعثر على حساب بهذا البريد. أنشئ حسابًا جديدًا أولًا.', 'No account was found for that email. Create an account first.'),
        'wrong-password': loginMessage('كلمة المرور غير صحيحة.', 'That password is incorrect.'),
        'invalid-credential': loginMessage('البريد أو كلمة المرور غير صحيحة.', 'The email or password is incorrect.'),
        'credential-already-in-use': loginMessage('كلمة المرور دي مرتبطة بحساب آخر؛ استخدم بريدًا غير مرتبط بحساب آخر.', 'That email credential is already linked to another account.'),
        'provider-already-linked': loginMessage('طريقة البريد وكلمة المرور مربوطة بهذا الحساب بالفعل.', 'Email and password are already linked to this account.'),
        'user-disabled': loginMessage('هذا الحساب غير متاح حاليًا.', 'This account is currently disabled.')
    };
    return messages[code] || fallback;
}

function setCloudStatus(message, state = 'connected') {
    const status = document.getElementById('cloudSyncStatus');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

function refreshAccountAvatar(user = cloudUser) {
    const accountAvatar = document.getElementById('accountAvatar');
    if (!accountAvatar) return;
    const savedAvatar = localStorage.getItem('userAvatarData');
    const source = savedAvatar || user?.picture || user?.photoURL || 'gnome-books.png';
    accountAvatar.classList.toggle('account-avatar-custom', Boolean(savedAvatar));
    accountAvatar.classList.toggle('account-avatar-default', !savedAvatar);
    accountAvatar.onerror = () => {
        accountAvatar.onerror = null;
        accountAvatar.classList.remove('account-avatar-custom');
        accountAvatar.classList.add('account-avatar-default');
        accountAvatar.src = 'gnome-books.png';
    };
    if (accountAvatar.src !== new URL(source, document.baseURI).href) accountAvatar.src = source;
    accountAvatar.alt = currentLang === 'en' ? 'Account photo' : 'صورة الحساب';
    const resetButton = document.getElementById('resetAvatarButton');
    if (resetButton) resetButton.hidden = !savedAvatar;
}

function updateAvatarActionLabels() {
    const isEnglish = currentLang === 'en';
    const changeButton = document.getElementById('changeAvatarButton');
    const resetButton = document.getElementById('resetAvatarButton');
    const input = document.getElementById('avatarFileInput');
    if (changeButton) changeButton.textContent = isEnglish ? 'Change account photo' : 'تغيير صورة الحساب';
    if (resetButton) resetButton.textContent = isEnglish ? 'Restore original picture' : 'استعادة الصورة الأصلية';
    if (input) input.setAttribute('aria-label', isEnglish ? 'Choose account photo' : 'اختيار صورة الحساب');
}

function updateAccountEmailActionLabels() {
    const isEnglish = currentLang === 'en';
    const button = document.getElementById('changeLoginEmailButton');
    const label = document.getElementById('changeLoginEmailLabel');
    const submit = document.getElementById('changeLoginEmailSubmit');
    if (button) button.textContent = isEnglish ? 'Change sign-in and recovery email' : 'تغيير بريد الدخول والاستعادة';
    if (label) label.textContent = isEnglish ? 'New email for sign-in and password recovery' : 'البريد الجديد للدخول واستعادة كلمة المرور';
    if (submit) submit.textContent = isEnglish ? 'Send verification link' : 'إرسال رابط التأكيد';
}

function makeDeviceSessionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function beginDeviceSessionActivation() {
    const id = makeDeviceSessionId();
    sessionActivationPending = true;
    sessionActivationId = id;
    localStorage.setItem(DEVICE_SESSION_ID_KEY, id);
    localStorage.removeItem(DEVICE_SESSION_USER_KEY);
    sessionRegistrationId = '';
    return id;
}

function abandonDeviceSessionActivation(id) {
    if (localStorage.getItem(DEVICE_SESSION_ID_KEY) === id) {
        localStorage.removeItem(DEVICE_SESSION_ID_KEY);
        localStorage.removeItem(DEVICE_SESSION_USER_KEY);
    }
    if (sessionActivationId === id) {
        sessionActivationPending = false;
        sessionActivationId = '';
    }
}

async function registerDeviceSession(user, id) {
    localStorage.setItem(DEVICE_SESSION_ID_KEY, id);
    localStorage.setItem(DEVICE_SESSION_USER_KEY, user.uid);
    sessionRegistrationId = id;
    const userReference = firebase.firestore().collection('users').doc(user.uid);
    await userReference.collection('deviceSessions').doc('active').set({
        activeSessionId: id,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (sessionActivationId === id) {
        sessionActivationPending = false;
        sessionActivationId = '';
    }
    userReference.set({
        activeSessionId: id,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(error => console.warn('Legacy device session update error:', error));
}

function registerSessionForExistingSignIn(user, id) {
    if (sessionRegistrationId === id) return;
    registerDeviceSession(user, id).catch(error => {
        sessionRegistrationId = '';
        setCloudStatus(loginMessage('تعذر تحديث جلسة الحساب. تحقق من الاتصال ثم سجّل الدخول مجددًا.', 'Could not update this account session. Check the connection and sign in again.'), 'error');
        console.warn('Device session registration error:', error);
    });
}

function releaseReplacedDeviceSession() {
    if (cloudUnsubscribe) {
        cloudUnsubscribe();
        cloudUnsubscribe = null;
    }
    if (deviceSessionUnsubscribe) {
        deviceSessionUnsubscribe();
        deviceSessionUnsubscribe = null;
    }
    resetTimerForSignOut();
    localStorage.removeItem(DEVICE_SESSION_ID_KEY);
    localStorage.removeItem(DEVICE_SESSION_USER_KEY);
    localStorage.removeItem('molhamCloudUserId');
    localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
    clearLocalUserState();
    setLoginStatus(loginMessage('تم تسجيل الخروج لأن الحساب فُتح من جهاز آخر.', 'You were signed out because this account was opened on another device.'));
    firebase.auth().signOut();
}

function synchronizeDeviceSession(user, snapshot) {
    if (sessionActivationPending || snapshot.metadata.fromCache) return true;
    const data = snapshot.exists ? snapshot.data() : {};
    const activeSessionId = data.activeSessionId;
    const localUserId = localStorage.getItem(DEVICE_SESSION_USER_KEY);
    let localSessionId = localUserId === user.uid ? localStorage.getItem(DEVICE_SESSION_ID_KEY) : null;

    if (activeSessionId && !localSessionId) {
        const pendingSessionId = localStorage.getItem(DEVICE_SESSION_ID_KEY);
        if (pendingSessionId === activeSessionId) {
            localSessionId = pendingSessionId;
            localStorage.setItem(DEVICE_SESSION_USER_KEY, user.uid);
        } else {
            releaseReplacedDeviceSession();
            return false;
        }
    }

    if (activeSessionId && activeSessionId !== localSessionId) {
        releaseReplacedDeviceSession();
        return false;
    }
    if (!localSessionId) {
        localSessionId = makeDeviceSessionId();
        localStorage.setItem(DEVICE_SESSION_ID_KEY, localSessionId);
        localStorage.setItem(DEVICE_SESSION_USER_KEY, user.uid);
    }
    if (!activeSessionId) registerSessionForExistingSignIn(user, localSessionId);
    return true;
}

function imageFileToAvatarData(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const sourceSide = Math.min(image.naturalWidth, image.naturalHeight);
            const sourceX = (image.naturalWidth - sourceSide) / 2;
            const sourceY = (image.naturalHeight - sourceSide) / 2;
            for (const size of [256, 192, 160]) {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const context = canvas.getContext('2d');
                if (!context) {
                    reject(new Error('Image processing is unavailable'));
                    return;
                }
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, size, size);
                context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, size, size);
                for (const quality of [0.84, 0.76, 0.68, 0.58]) {
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    if (dataUrl.length <= 96 * 1024) {
                        resolve(dataUrl);
                        return;
                    }
                }
            }
            reject(new Error('Image is too large after compression'));
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image could not be loaded'));
        };
        image.src = objectUrl;
    });
}

async function updateAccountPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        setCloudStatus(loginMessage('اختر ملف صورة صالحًا.', 'Choose a valid image file.'), 'error');
        return;
    }
    if (file.size > 15 * 1024 * 1024) {
        setCloudStatus(loginMessage('حجم الصورة كبير؛ اختر صورة أصغر من 15 ميجابايت.', 'The image is too large. Choose one under 15 MB.'), 'error');
        return;
    }
    const changeButton = document.getElementById('changeAvatarButton');
    if (changeButton) changeButton.disabled = true;
    setCloudStatus(loginMessage('جارٍ تجهيز صورة الحساب…', 'Preparing account photo…'), 'saving');
    try {
        const dataUrl = await imageFileToAvatarData(file);
        localStorage.setItem('userAvatarData', dataUrl);
        refreshAccountAvatar();
        saveCloudStateImmediately();
    } catch (error) {
        setCloudStatus(loginMessage('تعذر تجهيز الصورة. اختر صورة أخرى.', 'Could not prepare the image. Choose another one.'), 'error');
        console.warn('Account photo update error:', error);
    } finally {
        if (changeButton) changeButton.disabled = false;
        const input = document.getElementById('avatarFileInput');
        if (input) input.value = '';
    }
}

function setSignedInView(user) {
    const loginScreen = document.getElementById('loginScreen');
    const accountControl = document.getElementById('accountControl');
    const guestAccountControl = document.getElementById('guestAccountControl');
    const accountName = document.getElementById('accountName');
    const accountEmail = document.getElementById('accountEmail');
    const linkEmailPasswordButton = document.getElementById('linkEmailPasswordButton');
    const linkEmailPasswordForm = document.getElementById('linkEmailPasswordForm');
    const changeLoginEmailButton = document.getElementById('changeLoginEmailButton');
    const changeLoginEmailForm = document.getElementById('changeLoginEmailForm');

    if (loginScreen) loginScreen.classList.toggle('is-hidden', Boolean(user) || guestModeSelected);
    document.body.classList.toggle('login-visible', !user && !guestModeSelected);
    if (accountControl) accountControl.hidden = !user;
    if (guestAccountControl) guestAccountControl.hidden = Boolean(user) || !guestModeSelected;
    if (linkEmailPasswordForm) linkEmailPasswordForm.hidden = true;
    if (changeLoginEmailForm) changeLoginEmailForm.hidden = true;
    if (!user) return;

    setCloudStatus('جاري تحميل بيانات حسابك…', 'saving');
    if (accountName) accountName.textContent = user.name || user.displayName || user.email;
    if (accountEmail) accountEmail.textContent = user.email || '';
    const hasEmailPassword = (user.providerData || []).some(provider => provider.providerId === 'password');
    if (linkEmailPasswordButton) {
        linkEmailPasswordButton.hidden = hasEmailPassword || !user.email;
        linkEmailPasswordButton.textContent = currentLang === 'en' ? 'Add a password to this account' : 'إضافة كلمة مرور لهذا الحساب';
    }
    const linkLabel = document.getElementById('linkEmailPasswordLabel');
    const linkSubmit = document.getElementById('linkEmailPasswordSubmit');
    if (linkLabel) linkLabel.textContent = currentLang === 'en' ? 'Password for this account' : 'كلمة مرور للحساب نفسه';
    if (linkSubmit) linkSubmit.textContent = currentLang === 'en' ? 'Link password' : 'ربط كلمة المرور';
    if (changeLoginEmailButton) changeLoginEmailButton.hidden = !user.email;
    updateAccountEmailActionLabels();
    updateAvatarActionLabels();
    refreshAccountAvatar(user);
}

function continueAsGuest() {
    guestModeSelected = true;
    if (cloudUnsubscribe) {
        cloudUnsubscribe();
        cloudUnsubscribe = null;
    }
    if (deviceSessionUnsubscribe) {
        deviceSessionUnsubscribe();
        deviceSessionUnsubscribe = null;
    }
    cloudUser = null;
    cloudSaveSequence += 1;
    sessionActivationPending = false;
    sessionActivationId = '';
    sessionRegistrationId = '';
    resetTimerForSignOut();
    clearLocalUserState();
    localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
    localStorage.removeItem('molhamCloudUserId');
    localStorage.removeItem(DEVICE_SESSION_ID_KEY);
    localStorage.removeItem(DEVICE_SESSION_USER_KEY);
    refreshDashboardFromStorage();

    const auth = window.firebase?.apps?.length ? firebase.auth() : null;
    if (auth?.currentUser) {
        auth.signOut().catch(error => console.warn('Guest sign-out error:', error));
    }
    setSignedInView(null);
}

function openLoginOptions() {
    if (cloudUser) return;
    guestModeSelected = false;
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
    setColorScheme(localStorage.getItem('colorScheme') || 'dark', false);
    document.documentElement.style.setProperty('--primary', savedColor);

    if (document.getElementById('langSelect')) document.getElementById('langSelect').value = currentLang;
    if (document.getElementById('userNameInput')) document.getElementById('userNameInput').value = savedName;
    if (document.getElementById('minsInput')) document.getElementById('minsInput').value = savedMins;
    if (document.getElementById('gradDateInput')) document.getElementById('gradDateInput').value = graduationDate;
    if (document.getElementById('colorPicker')) document.getElementById('colorPicker').value = savedColor;
    updateColorPickerPreview(savedColor);

    restoreTimerState(savedMins);
    updatePointsDisplay();
    updateTimerDisplay();
    applyLanguage(currentLang);
    displayDate();
}

function markCloudSyncPending() {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLOUD_SYNC_PENDING_KEY, token);
    return token;
}

async function writeCloudState(pendingToken = localStorage.getItem(CLOUD_SYNC_PENDING_KEY)) {
    if (!cloudUser || !isFirebaseConfigured() || !window.firebase) {
        throw new Error('Cloud account is not ready');
    }
    if (!pendingToken) pendingToken = markCloudSyncPending();
    await firebase.firestore().collection('users').doc(cloudUser.uid).set({
        state: getCloudState(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (localStorage.getItem(CLOUD_SYNC_PENDING_KEY) === pendingToken) localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
}

function cloudSyncErrorMessage(error) {
    const code = String(error?.code || '').replace(/^firestore\//, '');
    if (code === 'permission-denied') return 'رفضت قواعد Firestore الحفظ. انشر ملف firestore.rules من Firebase Console.';
    if (code === 'failed-precondition' || code === 'not-found') return 'قاعدة Cloud Firestore غير مفعّلة أو غير موجودة في مشروع Firebase.';
    if (code === 'unavailable' || code === 'network-request-failed') return 'تعذر الاتصال بـ Firebase؛ التغييرات الحالية محفوظة على هذا الجهاز فقط.';
    return `تعذرت مزامنة الحساب${code ? ` (${code})` : ''}.`;
}

function saveCloudStateImmediately() {
    if (!cloudUser) return;
    const sequence = ++cloudSaveSequence;
    const pendingToken = markCloudSyncPending();
    const localSaveMessage = navigator.onLine
        ? '✓ تم الحفظ على هذا الجهاز؛ المزامنة تعمل بالخلفية.'
        : '✓ تم الحفظ على هذا الجهاز؛ ستتم المزامنة عند عودة الاتصال.';
    setCloudStatus(localSaveMessage, navigator.onLine ? 'connected' : 'saving');

    writeCloudState(pendingToken).then(() => {
        if (sequence !== cloudSaveSequence) return;
        setCloudStatus('✓ تمت المزامنة مع حسابك', 'connected');
    }).catch(error => {
        if (sequence !== cloudSaveSequence) return;
        setCloudStatus(cloudSyncErrorMessage(error), 'error');
        console.warn('Cloud sync write error:', error);
    });
}

function clearLocalUserState() {
    CLOUD_STATE_KEYS.forEach(key => localStorage.removeItem(key));
}

function applyCloudState(user, state) {
    clearLocalUserState();
    Object.entries(state).forEach(([key, value]) => {
        if (CLOUD_STATE_KEYS.includes(key) && typeof value === 'string') localStorage.setItem(key, value);
    });
    localStorage.setItem('molhamCloudUserId', user.uid);
    localStorage.setItem('molhamCloudProjectId', FIREBASE_CONFIG.projectId);
    localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
    if (user.displayName && !localStorage.getItem('userName')) localStorage.setItem('userName', user.displayName);
    refreshAccountAvatar(user);
    refreshDashboardFromStorage();
}

function watchDeviceSession(user) {
    if (deviceSessionUnsubscribe) deviceSessionUnsubscribe();
    const sessionReference = firebase.firestore()
        .collection('users').doc(user.uid)
        .collection('deviceSessions').doc('active');
    deviceSessionUnsubscribe = sessionReference.onSnapshot({ includeMetadataChanges: true }, snapshot => {
        if (!synchronizeDeviceSession(user, snapshot)) return;
    }, error => {
        setCloudStatus(cloudSyncErrorMessage(error), 'error');
        console.warn('Device session listener error:', error);
    });
}

function watchCloudState(user) {
    const previousUserId = localStorage.getItem('molhamCloudUserId');
    const previousProjectId = localStorage.getItem('molhamCloudProjectId') || 'molham-dash-bord';
    const isProjectMigration = previousProjectId !== FIREBASE_CONFIG.projectId;
    // Never allow values left by a different account to appear in this account.
    if (previousUserId && previousUserId !== user.uid && !isProjectMigration) {
        clearLocalUserState();
        localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
    }
    localStorage.setItem('molhamCloudProjectId', FIREBASE_CONFIG.projectId);

    watchDeviceSession(user);
    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = firebase.firestore().collection('users').doc(user.uid).onSnapshot(snapshot => {
        if (!snapshot.metadata.fromCache && snapshot.exists && snapshot.data().activeSessionId
            && !synchronizeDeviceSession(user, snapshot)) return;
        const remoteState = snapshot.exists ? snapshot.data().state : null;
        if (!remoteState || Object.keys(remoteState).length === 0) {
            // First use of an account: turn the current local dashboard into its cloud dashboard.
            if (!snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) {
                if (!localStorage.getItem('userName')) localStorage.setItem('userName', user.displayName || user.email || 'Molham');
                saveCloudStateImmediately();
            }
            return;
        }

        // The page has already updated locally. Apply only acknowledged or remote snapshots so an
        // active timer is not reset by Firestore's local echo; other devices update immediately.
        if (snapshot.metadata.hasPendingWrites) return;
        if (localStorage.getItem(CLOUD_SYNC_PENDING_KEY)) {
            if (!snapshot.metadata.fromCache) saveCloudStateImmediately();
            return;
        }
        applyCloudState(user, snapshot.data().state);
        setCloudStatus('✓ تمت مزامنة بيانات الحساب', 'connected');
    }, error => {
        setCloudStatus(cloudSyncErrorMessage(error), 'error');
        console.warn('Cloud sync listener error:', error);
    });
}

async function signInWithGoogle() {
    if (!canStartCloudSignIn()) return;
    checkpointPausedTimerForSignIn();
    const sessionId = beginDeviceSessionActivation();
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        if (guestModeSelected) {
            abandonDeviceSessionActivation(sessionId);
            await firebase.auth().signOut();
            return;
        }
        await registerDeviceSession(result.user, sessionId);
    } catch (error) {
        abandonDeviceSessionActivation(sessionId);
        showLoginError(authErrorMessage(error, loginMessage('تعذر تسجيل الدخول باستخدام Google. أعد المحاولة.', 'Could not sign in with Google. Please try again.')));
    }
}

let emailAuthMode = 'signin';
let emailAuthViewOpen = false;
let passwordRecoveryStep = 'none';

function setEmailAuthView(isOpen) {
    emailAuthViewOpen = Boolean(isOpen);
    if (!emailAuthViewOpen) passwordRecoveryStep = 'none';
    renderEmailAuthView();
}

function isEmailPasswordUser(user) {
    return (user?.providerData || []).some(provider => provider.providerId === 'password');
}

function needsEmailVerification(user) {
    return isEmailPasswordUser(user) && user.emailVerified !== true;
}

function renderEmailAuthView() {
    const isEnglish = currentLang === 'en';
    const verificationPending = Boolean(emailVerificationUser);
    const loginTitle = document.getElementById('loginTitle');
    const loginDescription = document.getElementById('loginDescription');
    const googleButton = document.getElementById('googleLoginButton');
    const emailOpenButton = document.getElementById('emailLoginOpenButton');
    const emailForm = document.getElementById('emailAuthForm');
    const recoveryRequestForm = document.getElementById('passwordRecoveryRequestForm');
    const guestButton = document.getElementById('continueAsGuestButton');
    const loginNote = document.getElementById('loginNote');
    const verificationPanel = document.getElementById('emailVerificationPanel');
    const isRecoveryRequest = passwordRecoveryStep === 'request';

    if (loginTitle) loginTitle.textContent = verificationPending
        ? (isEnglish ? 'Verify your email address' : 'أكد بريدك الإلكتروني')
        : isRecoveryRequest
            ? (isEnglish ? 'Recover your password' : 'استعادة كلمة المرور')
            : emailAuthViewOpen
                ? (emailAuthMode === 'signup'
                    ? (isEnglish ? 'Create an account' : 'إنشاء حساب جديد')
                    : (isEnglish ? 'Sign in with email' : 'تسجيل الدخول عبر البريد الإلكتروني'))
                : (isEnglish ? 'Welcome to Molham Dashboard' : 'أهلاً بك في لوحة ملهم');
    if (loginDescription) loginDescription.hidden = emailAuthViewOpen || verificationPending;
    if (googleButton) googleButton.hidden = emailAuthViewOpen || verificationPending;
    if (emailOpenButton) emailOpenButton.hidden = emailAuthViewOpen || verificationPending;
    if (emailForm) emailForm.hidden = !emailAuthViewOpen || passwordRecoveryStep !== 'none' || verificationPending;
    if (recoveryRequestForm) recoveryRequestForm.hidden = !emailAuthViewOpen || !isRecoveryRequest || verificationPending;
    if (guestButton) guestButton.hidden = emailAuthViewOpen || verificationPending;
    if (loginNote) loginNote.hidden = !emailAuthViewOpen || passwordRecoveryStep !== 'none' || verificationPending;
    if (verificationPanel) verificationPanel.hidden = !verificationPending;
    updateEmailVerificationLabels();
}

function updateEmailAuthMode(mode = emailAuthMode) {
    emailAuthMode = mode === 'signup' ? 'signup' : 'signin';
    const isEnglish = currentLang === 'en';
    const isSignup = emailAuthMode === 'signup';
    const submitButton = document.getElementById('emailAuthSubmitButton');
    const modeButton = document.getElementById('emailAuthModeButton');
    const resetButton = document.getElementById('passwordResetButton');
    const passwordInput = document.getElementById('passwordInput');
    const signupHint = document.getElementById('emailSignupHint');
    const links = document.querySelector('.email-auth-links');
    if (submitButton) submitButton.textContent = isSignup
        ? (isEnglish ? 'Create account' : 'إنشاء حساب')
        : (isEnglish ? 'Sign in with email' : 'تسجيل الدخول بالبريد');
    if (modeButton) modeButton.textContent = isSignup
        ? (isEnglish ? 'I already have an account' : 'لدي حساب بالفعل')
        : (isEnglish ? 'Create a new account' : 'إنشاء حساب جديد');
    if (resetButton) resetButton.hidden = isSignup;
    if (links) links.style.gridTemplateColumns = isSignup ? '1fr' : '';
    if (passwordInput) passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
    if (signupHint) {
        signupHint.hidden = !isSignup;
        signupHint.textContent = isEnglish
            ? 'Use a real inbox you can open. We will send a verification link, and you cannot use the account until you confirm it.'
            : 'استخدم بريدًا حقيقيًا تستطيع فتحه. سنرسل إليه رابط تأكيد، ولن تقدر على استخدام الحساب قبل تأكيده.';
    }
    renderEmailAuthView();
}

function updateEmailVerificationLabels() {
    const isEnglish = currentLang === 'en';
    const email = emailVerificationUser?.email || '';
    const labels = isEnglish ? {
        message: `A verification link was sent to ${email}. Open it, then return here and choose “I verified my email”. If the address is wrong, enter a real inbox below.`,
        resend: 'Resend verification link',
        changeLabel: 'If you entered the wrong address, use a real inbox',
        changeSubmit: 'Send a verification link to the new address',
        check: 'I verified my email — check now',
        back: 'Sign out and return to sign in'
    } : {
        message: `أرسلنا رابط تأكيد إلى ${email}. افتحه ثم ارجع هنا واضغط «أكدت البريد». لو العنوان خطأ، أدخل بريدًا حقيقيًا بالأسفل.`,
        resend: 'إعادة إرسال رابط التأكيد',
        changeLabel: 'لو كتبت العنوان خطأ، أدخل بريدًا حقيقيًا',
        changeSubmit: 'إرسال رابط التأكيد إلى البريد الجديد',
        check: 'أكدت البريد، تحقق الآن',
        back: 'تسجيل الخروج والعودة للدخول'
    };
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    setText('emailVerificationMessage', labels.message);
    setText('emailVerificationResendButton', labels.resend);
    setText('emailVerificationChangeLabel', labels.changeLabel);
    setText('emailVerificationChangeSubmit', labels.changeSubmit);
    setText('emailVerificationCheckButton', labels.check);
    setText('emailVerificationBackButton', labels.back);
}

function updatePasswordRecoveryLabels() {
    const isEnglish = currentLang === 'en';
    const labels = isEnglish ? {
        requestHint: 'The address does not have to be Gmail, but it must be a real inbox you can open. Password reset goes to the email linked to your account. To use a different inbox, first change and verify your sign-in email in Account settings. Please check the address carefully; we are not responsible for an incorrect email address.',
        emailLabel: 'Account email address',
        send: 'Send password reset link',
        back: 'Back to sign in'
    } : {
        requestHint: 'لا يشترط أن يكون البريد Gmail؛ ينفع أي بريد حقيقي تقدر تفتحه. رابط الاستعادة يذهب إلى البريد المرتبط بالحساب. لاستخدام بريد آخر، غيّر بريد الدخول وأكّده أولًا من إعدادات الحساب. تأكد من صحة البريد؛ نحن غير مسؤولين عن إدخال بريد خاطئ.',
        emailLabel: 'البريد الإلكتروني للحساب',
        send: 'إرسال رابط تغيير كلمة المرور',
        back: 'العودة لتسجيل الدخول'
    };
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    setText('passwordRecoveryRequestHint', labels.requestHint);
    setText('passwordRecoveryEmailLabel', labels.emailLabel);
    setText('passwordRecoverySendButton', labels.send);
    setText('passwordRecoveryRequestBackButton', labels.back);
}

async function submitEmailAuth(event) {
    event.preventDefault();
    if (!canStartCloudSignIn()) return;
    const email = (document.getElementById('emailInput')?.value || '').trim();
    const password = document.getElementById('passwordInput')?.value || '';
    const submitButton = document.getElementById('emailAuthSubmitButton');
    const isSignup = emailAuthMode === 'signup';
    const auth = firebase.auth();
    if (submitButton) submitButton.disabled = true;
    setLoginStatus(isSignup
        ? loginMessage('جارٍ إنشاء الحساب…', 'Creating your account…')
        : loginMessage('جارٍ تسجيل الدخول…', 'Signing in…'));
    checkpointPausedTimerForSignIn();
    try {
        auth.languageCode = currentLang === 'en' ? 'en' : 'ar';
        if (isSignup) {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            emailVerificationUser = result.user;
            emailAuthViewOpen = false;
            passwordRecoveryStep = 'none';
            renderEmailAuthView();
            setLoginStatus(loginMessage('جارٍ إرسال رابط تأكيد البريد…', 'Sending the email verification link…'));
            try {
                await result.user.sendEmailVerification();
                setLoginStatus(loginMessage(
                    'أرسلنا رابط تأكيد إلى بريدك. افتحه ثم ارجع واضغط «أكدت البريد» لإكمال إنشاء الحساب.',
                    'We sent a verification link to your inbox. Open it, return here, and choose “I verified my email” to finish creating your account.'
                ));
            } catch (verificationError) {
                showLoginError(authErrorMessage(verificationError, loginMessage(
                    'تم إنشاء حساب غير مكتمل لكن تعذر إرسال رابط التأكيد. صحّح البريد أو أعد إرسال الرابط من الشاشة.',
                    'The account is pending, but we could not send the verification link. Correct the address or resend the link from this screen.'
                )));
            }
            return;
        }

        const result = await auth.signInWithEmailAndPassword(email, password);
        if (needsEmailVerification(result.user)) {
            emailVerificationUser = result.user;
            emailAuthViewOpen = false;
            passwordRecoveryStep = 'none';
            renderEmailAuthView();
            setLoginStatus(loginMessage(
                'أكد بريدك قبل استخدام الحساب. أعد إرسال الرابط أو أدخل بريدًا صحيحًا بالأسفل.',
                'Verify your email before using this account. Resend the link or enter a correct address below.'
            ));
            return;
        }
        if (guestModeSelected) {
            await auth.signOut();
            return;
        }
        const sessionId = beginDeviceSessionActivation();
        await registerDeviceSession(result.user, sessionId);
    } catch (error) {
        showLoginError(authErrorMessage(error, loginMessage('تعذر إكمال العملية. تحقق من البريد وكلمة المرور ثم أعد المحاولة.', 'Could not complete sign-in. Check the email and password, then try again.')));
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function resendEmailVerification() {
    const user = firebase.auth()?.currentUser || emailVerificationUser;
    if (!user) return;
    if (!canStartCloudSignIn()) return;
    const button = document.getElementById('emailVerificationResendButton');
    if (button) button.disabled = true;
    try {
        await user.reload();
        const refreshedUser = firebase.auth().currentUser || user;
        if (refreshedUser.emailVerified) {
            setLoginStatus(loginMessage('تم تأكيد البريد. اضغط «أكدت البريد» للمتابعة.', 'Your email is verified. Choose “I verified my email” to continue.'));
            return;
        }
        firebase.auth().languageCode = currentLang === 'en' ? 'en' : 'ar';
        await refreshedUser.sendEmailVerification();
        emailVerificationUser = refreshedUser;
        renderEmailAuthView();
        setLoginStatus(loginMessage('أعدنا إرسال رابط التأكيد. افحص البريد الوارد والرسائل غير المرغوب فيها.', 'The verification link was resent. Check your inbox and spam folder.'));
    } catch (error) {
        showLoginError(authErrorMessage(error, loginMessage('تعذر إرسال رابط التأكيد. تحقق من البريد والاتصال ثم أعد المحاولة.', 'Could not send the verification link. Check the address and connection, then try again.')));
    } finally {
        if (button) button.disabled = false;
    }
}

async function requestPendingEmailChange(event) {
    event.preventDefault();
    const user = firebase.auth()?.currentUser || emailVerificationUser;
    const input = document.getElementById('emailVerificationChangeInput');
    const button = document.getElementById('emailVerificationChangeSubmit');
    const newEmail = (input?.value || '').trim();
    if (!user || !newEmail) return;
    if (button) button.disabled = true;
    try {
        firebase.auth().languageCode = currentLang === 'en' ? 'en' : 'ar';
        await user.verifyBeforeUpdateEmail(newEmail);
        setLoginStatus(loginMessage(
            'أرسلنا رابط التأكيد إلى البريد الجديد. افتحه ثم ارجع واضغط «أكدت البريد».',
            'We sent a verification link to the new address. Open it, return here, and choose “I verified my email”.'
        ));
    } catch (error) {
        const code = String(error?.code || '').replace(/^auth\//, '');
        const message = code === 'requires-recent-login'
            ? loginMessage('لأمان الحساب، سجّل الخروج ثم ادخل مرة أخرى بكلمة مرورك، وبعدها صحّح البريد.', 'For account security, sign out and sign in again with your password, then correct the address.')
            : code === 'email-already-in-use'
                ? loginMessage('هذا البريد مرتبط بحساب آخر.', 'This email address is already linked to another account.')
                : code === 'invalid-email'
                    ? loginMessage('اكتب بريدًا إلكترونيًا صحيحًا.', 'Enter a valid email address.')
                    : authErrorMessage(error, loginMessage('تعذر إرسال رابط التأكيد إلى البريد الجديد.', 'Could not send a verification link to the new address.'));
        showLoginError(message);
    } finally {
        if (button) button.disabled = false;
    }
}

async function confirmEmailVerification() {
    const user = firebase.auth()?.currentUser || emailVerificationUser;
    if (!user) return;
    const button = document.getElementById('emailVerificationCheckButton');
    if (button) button.disabled = true;
    try {
        await user.reload();
        const refreshedUser = firebase.auth().currentUser || user;
        if (!refreshedUser.emailVerified) {
            setLoginStatus(loginMessage('لم يظهر تأكيد البريد بعد. افتح رابط التأكيد ثم حاول مرة أخرى.', 'The email is not verified yet. Open the verification link, then try again.'));
            return;
        }
        const verifiedEmail = refreshedUser.email || emailVerificationUser?.email || '';
        emailVerificationUser = null;
        await firebase.auth().signOut();
        setEmailAuthView(true);
        updateEmailAuthMode('signin');
        const emailInput = document.getElementById('emailInput');
        if (emailInput) emailInput.value = verifiedEmail;
        setLoginStatus(loginMessage('تم تأكيد البريد. سجّل الدخول به لإكمال إنشاء الحساب.', 'Email verified. Sign in with it to finish creating your account.'));
    } catch (error) {
        showLoginError(authErrorMessage(error, loginMessage('تعذر التحقق من حالة البريد. أعد تحميل الصفحة وحاول مرة أخرى.', 'Could not check the email status. Reload the page and try again.')));
    } finally {
        if (button) button.disabled = false;
    }
}

async function leaveEmailVerification() {
    try {
        if (firebase.auth()?.currentUser) await firebase.auth().signOut();
    } catch (error) {
        console.warn('Pending email verification sign-out error:', error);
    }
    emailVerificationUser = null;
    setEmailAuthView(false);
    setLoginStatus('');
}

function openPasswordRecovery() {
    if (!canStartCloudSignIn()) return;
    passwordRecoveryStep = 'request';
    const loginEmail = (document.getElementById('emailInput')?.value || '').trim();
    const recoveryEmailInput = document.getElementById('passwordRecoveryEmailInput');
    if (recoveryEmailInput) recoveryEmailInput.value = loginEmail;
    setLoginStatus('');
    renderEmailAuthView();
    recoveryEmailInput?.focus();
}

async function submitPasswordRecoveryRequest(event) {
    event.preventDefault();
    if (!canStartCloudSignIn()) return;
    const email = (document.getElementById('passwordRecoveryEmailInput')?.value || '').trim();
    const submitButton = document.getElementById('passwordRecoverySendButton');
    if (submitButton) submitButton.disabled = true;
    setLoginStatus(loginMessage('جارٍ إرسال رسالة إعادة التعيين…', 'Sending the password reset email…'));
    try {
        const auth = firebase.auth();
        auth.languageCode = currentLang === 'en' ? 'en' : 'ar';
        await auth.sendPasswordResetEmail(email);
        setLoginStatus(loginMessage(
            'إذا كان هذا البريد مرتبطًا بحساب، ستصلك رسالة فيها رابط تغيير كلمة المرور. افحص البريد غير المرغوب فيه أيضًا.',
            'If this email is linked to an account, you will receive a password reset link. Check your spam folder too.'
        ));
    } catch (error) {
        const code = String(error?.code || '').replace(/^auth\//, '');
        if (code === 'user-not-found') {
            setLoginStatus(loginMessage(
                'إذا كان هذا البريد مرتبطًا بحساب، ستصلك رسالة فيها رابط تغيير كلمة المرور. افحص البريد غير المرغوب فيه أيضًا.',
                'If this email is linked to an account, you will receive a password reset link. Check your spam folder too.'
            ));
        } else {
            showLoginError(authErrorMessage(error, loginMessage('تعذر إرسال الرسالة. تحقق من اتصالك والبريد ثم أعد المحاولة.', 'Could not send the email. Check your connection and email address, then try again.')));
        }
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function linkEmailPasswordToCurrentAccount(event) {
    event.preventDefault();
    if (!cloudUser?.email) return;
    const passwordInput = document.getElementById('linkEmailPasswordInput');
    const password = passwordInput?.value || '';
    if (password.length < 6) {
        setCloudStatus(loginMessage('استخدم كلمة مرور من 6 أحرف على الأقل.', 'Use a password with at least 6 characters.'), 'error');
        passwordInput?.focus();
        return;
    }
    const submitButton = document.getElementById('linkEmailPasswordSubmit');
    if (submitButton) submitButton.disabled = true;
    setCloudStatus(loginMessage('جارٍ ربط كلمة المرور بهذا الحساب…', 'Linking the password to this account…'), 'saving');
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(cloudUser.email, password);
        await cloudUser.linkWithCredential(credential);
        document.getElementById('linkEmailPasswordForm').hidden = true;
        document.getElementById('linkEmailPasswordButton').hidden = true;
        document.getElementById('linkEmailPasswordForm').reset();
        setCloudStatus(loginMessage('تم ربط البريد وكلمة المرور بنفس حساب المزامنة.', 'Email and password now use the same sync account.'), 'connected');
    } catch (error) {
        setCloudStatus(authErrorMessage(error, loginMessage('تعذر ربط كلمة المرور بهذا الحساب.', 'Could not link a password to this account.')), 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

async function requestLoginEmailChange(event) {
    event.preventDefault();
    if (!cloudUser) return;
    const input = document.getElementById('changeLoginEmailInput');
    const form = document.getElementById('changeLoginEmailForm');
    const submitButton = document.getElementById('changeLoginEmailSubmit');
    const newEmail = (input?.value || '').trim();
    if (!newEmail) return;
    if (newEmail.toLowerCase() === String(cloudUser.email || '').toLowerCase()) {
        setCloudStatus(loginMessage('هذا هو بريد الدخول الحالي بالفعل.', 'This is already the current sign-in email.'), 'error');
        return;
    }
    if (!navigator.onLine) {
        setCloudStatus(loginMessage('تغيير البريد يحتاج اتصالًا بالإنترنت.', 'Changing the email address requires an internet connection.'), 'error');
        return;
    }

    if (submitButton) submitButton.disabled = true;
    setCloudStatus(loginMessage('جارٍ إرسال رابط التأكيد إلى البريد الجديد…', 'Sending a verification link to the new email…'), 'saving');
    try {
        firebase.auth().languageCode = currentLang === 'en' ? 'en' : 'ar';
        await cloudUser.verifyBeforeUpdateEmail(newEmail);
        if (form) form.hidden = true;
        if (form) form.reset();
        setCloudStatus(loginMessage(
            'أرسلنا رابط تأكيد. بعد فتحه يصبح هذا بريد الدخول واستعادة كلمة المرور. حدّث الصفحة بعد التأكيد، ثم استخدم البريد الجديد مع «نسيت كلمة المرور؟».',
            'A verification link was sent. After you confirm it, this becomes your sign-in and password-recovery email. Refresh the page, then use the new email with “Forgot password?”.'
        ), 'connected');
    } catch (error) {
        const code = String(error?.code || '').replace(/^auth\//, '');
        const message = code === 'requires-recent-login'
            ? loginMessage('لأمان الحساب، سجّل الخروج ثم ادخل مرة أخرى وحاول تغيير البريد.', 'For account security, sign out, sign in again, and retry the email change.')
            : code === 'email-already-in-use'
                ? loginMessage('هذا البريد مرتبط بحساب آخر.', 'This email address is already linked to another account.')
                : code === 'unauthorized-domain'
                    ? loginMessage('نطاق الموقع غير مسموح به في إعدادات Firebase.', 'This website domain is not authorized in Firebase.')
                    : code === 'invalid-email'
                        ? loginMessage('اكتب بريدًا إلكترونيًا صحيحًا.', 'Enter a valid email address.')
                        : code === 'too-many-requests'
                            ? loginMessage('محاولات كثيرة؛ انتظر قليلًا ثم حاول مجددًا.', 'Too many attempts. Wait a little and try again.')
                            : loginMessage('تعذر إرسال رابط التأكيد. تحقق من إعدادات Firebase وحاول مجددًا.', 'Could not send the verification link. Check Firebase settings and try again.');
        setCloudStatus(message, 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

function initializeCloud() {
    window.addEventListener('online', () => {
        if (cloudUser) saveCloudStateImmediately();
    });
    document.getElementById('googleLoginButton')?.addEventListener('click', signInWithGoogle);
    document.getElementById('emailAuthForm')?.addEventListener('submit', submitEmailAuth);
    document.getElementById('emailLoginOpenButton')?.addEventListener('click', () => {
        setEmailAuthView(true);
        document.getElementById('emailInput')?.focus();
    });
    document.getElementById('emailAuthBackButton')?.addEventListener('click', () => {
        setEmailAuthView(false);
        setLoginStatus('');
    });
    document.getElementById('emailAuthModeButton')?.addEventListener('click', () => {
        updateEmailAuthMode(emailAuthMode === 'signup' ? 'signin' : 'signup');
    });
    document.getElementById('passwordResetButton')?.addEventListener('click', openPasswordRecovery);
    document.getElementById('passwordRecoveryRequestForm')?.addEventListener('submit', submitPasswordRecoveryRequest);
    document.getElementById('emailVerificationResendButton')?.addEventListener('click', resendEmailVerification);
    document.getElementById('emailVerificationChangeForm')?.addEventListener('submit', requestPendingEmailChange);
    document.getElementById('emailVerificationCheckButton')?.addEventListener('click', confirmEmailVerification);
    document.getElementById('emailVerificationBackButton')?.addEventListener('click', leaveEmailVerification);
    document.getElementById('passwordRecoveryRequestBackButton')?.addEventListener('click', () => {
        passwordRecoveryStep = 'none';
        setLoginStatus('');
        renderEmailAuthView();
        document.getElementById('emailInput')?.focus();
    });
    document.getElementById('changeAvatarButton')?.addEventListener('click', () => document.getElementById('avatarFileInput')?.click());
    document.getElementById('avatarFileInput')?.addEventListener('change', event => updateAccountPhoto(event.target.files?.[0]));
    document.getElementById('resetAvatarButton')?.addEventListener('click', () => {
        localStorage.removeItem('userAvatarData');
        refreshAccountAvatar();
        saveCloudStateImmediately();
    });
    document.getElementById('linkEmailPasswordButton')?.addEventListener('click', () => {
        const form = document.getElementById('linkEmailPasswordForm');
        if (!form) return;
        document.getElementById('changeLoginEmailForm').hidden = true;
        form.hidden = !form.hidden;
        if (!form.hidden) document.getElementById('linkEmailPasswordInput')?.focus();
    });
    document.getElementById('linkEmailPasswordForm')?.addEventListener('submit', linkEmailPasswordToCurrentAccount);
    document.getElementById('guestLoginButton')?.addEventListener('click', openLoginOptions);
    document.getElementById('continueAsGuestButton')?.addEventListener('click', continueAsGuest);
    document.getElementById('changeLoginEmailButton')?.addEventListener('click', () => {
        const form = document.getElementById('changeLoginEmailForm');
        if (!form) return;
        document.getElementById('linkEmailPasswordForm').hidden = true;
        form.hidden = !form.hidden;
        if (!form.hidden) document.getElementById('changeLoginEmailInput')?.focus();
    });
    document.getElementById('changeLoginEmailForm')?.addEventListener('submit', requestLoginEmailChange);
    document.getElementById('logoutButton')?.addEventListener('click', signOut);
    initializeAccountMenu('accountControl', 'accountMenuButton', 'accountMenu');
    initializeAccountMenu('guestAccountControl', 'guestAccountMenuButton', 'guestAccountMenu');
    if (!isFirebaseConfigured()) {
        showLoginError('أضف إعدادات Firebase في ملف script.js لتفعيل تسجيل الدخول والحفظ بين الأجهزة.');
        return;
    }

    if (!window.firebase) {
        if (!navigator.onLine) {
            continueAsGuest();
            return;
        }
        showLoginError('تعذر تحميل خدمة الحفظ. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
        return;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    const firestore = firebase.firestore();
    if (typeof firestore.enablePersistence === 'function') {
        firestore.enablePersistence({ synchronizeTabs: true }).catch(error => {
            console.info('Offline Firestore persistence is unavailable in this browser:', error);
        });
    }
    firebase.auth().onAuthStateChanged(user => {
        if (guestModeSelected && user) {
            cloudUser = null;
            setSignedInView(null);
            firebase.auth().signOut().catch(error => console.warn('Guest sign-out error:', error));
            return;
        }
        if (needsEmailVerification(user)) {
            cloudUser = null;
            const pendingSessionId = localStorage.getItem(DEVICE_SESSION_ID_KEY);
            if (pendingSessionId) abandonDeviceSessionActivation(pendingSessionId);
            localStorage.removeItem(DEVICE_SESSION_ID_KEY);
            localStorage.removeItem(DEVICE_SESSION_USER_KEY);
            sessionRegistrationId = '';
            if (cloudUnsubscribe) {
                cloudUnsubscribe();
                cloudUnsubscribe = null;
            }
            if (deviceSessionUnsubscribe) {
                deviceSessionUnsubscribe();
                deviceSessionUnsubscribe = null;
            }
            setSignedInView(null);
            emailVerificationUser = user;
            renderEmailAuthView();
            return;
        }
        emailVerificationUser = null;
        renderEmailAuthView();
        cloudUser = user;
        setSignedInView(user);
        if (user) {
            try {
                watchCloudState(user);
            } catch (error) {
                showLoginError('تم تسجيل الدخول، لكن تعذر تحميل بياناتك السحابية.');
            }
        } else {
            if (cloudUnsubscribe) {
                cloudUnsubscribe();
                cloudUnsubscribe = null;
            }
            if (deviceSessionUnsubscribe) {
                deviceSessionUnsubscribe();
                deviceSessionUnsubscribe = null;
            }
            emailVerificationUser = null;
            renderEmailAuthView();
            if (!navigator.onLine) continueAsGuest();
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
    if (deviceSessionUnsubscribe) {
        deviceSessionUnsubscribe();
        deviceSessionUnsubscribe = null;
    }
    resetTimerForSignOut();
    clearLocalUserState();
    localStorage.removeItem('molhamCloudUserId');
    localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
    localStorage.removeItem(DEVICE_SESSION_ID_KEY);
    localStorage.removeItem(DEVICE_SESSION_USER_KEY);
    if (window.firebase && firebase.auth) firebase.auth().signOut();
}

function resetTimerForSignOut() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
    focusStartedAt = null;
    focusSegmentEndsAt = null;
    totalSecondsWorked = 0;
    isBreak = false;
    clearPausedTimerState();
    setTimerDuration(25);
    updateTimerDisplay();
    const startButton = document.getElementById('startBtn');
    if (startButton) startButton.innerText = i18n[currentLang].startBtnJob;
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

const focusVerses = [
    { text: 'وَأَن لَّيْسَ لِلْإِنسَـٰنِ إِلَّا مَا سَعَىٰ ۝ وَأَنَّ سَعْيَهُۥ سَوْفَ يُرَىٰ', reference: 'سورة النجم • ٣٩–٤٠' },
    { text: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', reference: 'سورة الشرح • ٦' },
    { text: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا', reference: 'سورة البقرة • ٢٨٦' },
    { text: 'فَاسْتَبِقُوا الْخَيْرَاتِ', reference: 'سورة البقرة • ١٤٨' },
    { text: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا', reference: 'سورة العنكبوت • ٦٩' }
];

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
    restoreTimerState(savedMins);
    updateTimerDisplay();
    
    if(document.getElementById('taskInput')) {
        document.getElementById('taskInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
    initializeDashboardFeatures();
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
    const tasks = getStoredTasks();
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
    const loginText = lang === 'en' ? {
        title: 'Welcome to Molham Dashboard',
        description: 'Sign in with Google or your email to sync your data online, or start fresh as a guest.',
        google: 'Continue with Google',
        email: 'Email address',
        password: 'Password',
        signIn: 'Sign in with email',
        createAccount: 'Create a new account',
        resetPassword: 'Forgot password?',
        guest: 'Start fresh as guest',
        note: 'Use a real email address to recover your password. If your current email cannot receive messages, sign in first and change it in Account settings.'
    } : {
        title: 'أهلاً بك في لوحة ملهم',
        description: 'سجّل بحساب Google أو بريدك الإلكتروني لمزامنة بياناتك، أو ابدأ بلوحة جديدة كضيف.',
        google: 'المتابعة باستخدام Google',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        signIn: 'تسجيل الدخول بالبريد',
        createAccount: 'إنشاء حساب جديد',
        resetPassword: 'نسيت كلمة المرور؟',
        guest: 'ابدأ كضيف ببيانات جديدة',
        note: 'استخدم بريدًا حقيقيًا لاستعادة كلمة المرور. إذا كان بريدك الحالي لا يستقبل الرسائل، سجّل الدخول وغيّره من إعدادات الحساب.'
    };
    const setLoginText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };
    setLoginText('loginTitle', loginText.title);
    setLoginText('loginDescription', loginText.description);
    setLoginText('googleLoginLabel', loginText.google);
    setLoginText('emailLabel', loginText.email);
    setLoginText('passwordLabel', loginText.password);
    setLoginText('emailAuthSubmitButton', loginText.signIn);
    setLoginText('emailAuthModeButton', loginText.createAccount);
    setLoginText('passwordResetButton', loginText.resetPassword);
    setLoginText('continueAsGuestButton', loginText.guest);
    setLoginText('loginNote', loginText.note);
    updateEmailAuthMode();
    updatePasswordRecoveryLabels();
    renderEmailAuthView();
    updateAvatarActionLabels();
    updateAccountEmailActionLabels();
    const linkEmailPasswordButton = document.getElementById('linkEmailPasswordButton');
    const linkEmailPasswordLabel = document.getElementById('linkEmailPasswordLabel');
    const linkEmailPasswordSubmit = document.getElementById('linkEmailPasswordSubmit');
    if (linkEmailPasswordButton) linkEmailPasswordButton.textContent = lang === 'en' ? 'Add a password to this account' : 'إضافة كلمة مرور لهذا الحساب';
    if (linkEmailPasswordLabel) linkEmailPasswordLabel.textContent = lang === 'en' ? 'Password for this account' : 'كلمة مرور للحساب نفسه';
    if (linkEmailPasswordSubmit) linkEmailPasswordSubmit.textContent = lang === 'en' ? 'Link password' : 'ربط كلمة المرور';
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
            const savedTimerState = readPausedTimerState();
            startBtn.innerText = savedTimerState?.resumeAvailable
                ? trans.startBtnResume
                : isBreak ? trans.startBtnBreak : trans.startBtnJob;
        } else {
            startBtn.innerText = trans.startBtnPause;
        }
    }
    
    applyDashboardLanguage();
    changeQuote();
    renderTasks(); 
    updateSmartSuggestion();
    renderDailyOverview();
    renderStudyWeek();
    updateThemeToggleLabel();
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
        setTimerDuration(newMins);
        persistPausedTimerState();
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
        setTimerDuration(mins);
    }
    
    if (timer === null) {
        // حالة البداية أو الاستئناف
        clearPausedTimerState();
        startBtn.innerText = trans.startBtnPause;
        updateSmartSuggestion();
        
        const endTime = Date.now() + (timeLeft * 1000);
        if (!isBreak) {
            focusStartedAt = Date.now();
            focusSegmentEndsAt = endTime;
        }
        
        timer = setInterval(() => {
            const remainingMillis = endTime - Date.now();
            timeLeft = Math.ceil(remainingMillis / 1000);
            
            if (!isBreak) {
                totalSecondsWorked++; // تجميع الثواني الفعلية للدراسة فقط
            }
            
            if (timeLeft <= 0) {
                const completedStudySession = !isBreak;
                const completedSeconds = completedStudySession ? commitActiveFocusTime() : 0;
                clearInterval(timer);
                timer = null;
                playAlarm();
                
                if (completedStudySession) {
                    addPoints();
                    changeQuote();
                    showFocusSessionSummary(completedSeconds);
                }
                
                // إعادة ضبط المؤقت تلقائياً بعد الانتهاء
                isBreak = false;
                const mins = parseFloat(minsInput.value) || 25;
                setTimerDuration(mins);
                totalSecondsWorked = 0;
                persistPausedTimerState();
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
            commitActiveFocusTime();
            addPoints(); 
        }
        persistPausedTimerState(true);
    }
}

function resetTimer() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
        if (!isBreak) {
            commitActiveFocusTime();
            addPoints();
        }
    }
    isBreak = false;
    totalSecondsWorked = 0;
    
    const minsInput = document.getElementById('minsInput');
    const mins = parseFloat(minsInput ? minsInput.value : 25) || 25;
    setTimerDuration(mins);
    persistPausedTimerState();
    
    updateTimerDisplay();
    
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.innerText = i18n[currentLang].startBtnJob;
    }
}

function setTimerDuration(minutes) {
    timerDurationSeconds = Math.max(1, Math.floor((Number(minutes) || 25) * 60));
    timeLeft = timerDurationSeconds;
    timerUsesHoursFormat = minutes >= 60;
}

function checkpointPausedTimerForSignIn() {
    if (timer !== null || timeLeft === null) return;
    const storedState = readPausedTimerState();
    if (storedState?.resumeAvailable || Number(timeLeft) < Number(timerDurationSeconds)) {
        persistPausedTimerState(true);
    }
}

function readPausedTimerState() {
    try {
        const state = JSON.parse(localStorage.getItem(TIMER_STATE_KEY) || 'null');
        const remainingSeconds = Number(state?.remainingSeconds);
        const durationSeconds = Number(state?.durationSeconds);
        if (!Number.isFinite(remainingSeconds) || !Number.isFinite(durationSeconds)
            || remainingSeconds < 1 || durationSeconds < remainingSeconds) return null;
        return {
            remainingSeconds: Math.ceil(remainingSeconds),
            durationSeconds: Math.floor(durationSeconds),
            isBreak: Boolean(state.isBreak),
            resumeAvailable: Boolean(state.resumeAvailable)
        };
    } catch (error) {
        return null;
    }
}

function restoreTimerState(defaultMinutes) {
    if (timer !== null) return;
    const state = readPausedTimerState();
    if (state) {
        timeLeft = state.remainingSeconds;
        timerDurationSeconds = state.durationSeconds;
        timerUsesHoursFormat = timerDurationSeconds >= 3600;
        isBreak = state.isBreak;
    } else {
        if (localStorage.getItem(TIMER_STATE_KEY)) localStorage.removeItem(TIMER_STATE_KEY);
        isBreak = false;
        setTimerDuration(defaultMinutes);
    }
    const startButton = document.getElementById('startBtn');
    if (startButton) startButton.innerText = state?.resumeAvailable
        ? i18n[currentLang].startBtnResume
        : isBreak ? i18n[currentLang].startBtnBreak : i18n[currentLang].startBtnJob;
}

function persistPausedTimerState(resumeAvailable = false) {
    if (timer !== null || timeLeft === null) return;
    const state = {
        remainingSeconds: Math.max(1, Math.ceil(Number(timeLeft) || 0)),
        durationSeconds: Math.max(1, Math.floor(Number(timerDurationSeconds) || 1)),
        isBreak: Boolean(isBreak),
        resumeAvailable: Boolean(resumeAvailable)
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
}

function clearPausedTimerState() {
    localStorage.removeItem(TIMER_STATE_KEY);
}

function updateTimerDisplay() {
    const totalSeconds = Math.max(0, Math.floor(Number(timeLeft) || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = value => String(value).padStart(2, '0');
    const displayElem = document.getElementById('pomoDisplay');
    if (displayElem) {
        const showHours = timerUsesHoursFormat || hours > 0;
        displayElem.textContent = showHours
            ? `${hours}:${pad(minutes)}:${pad(seconds)}`
            : `${pad(Math.floor(totalSeconds / 60))}:${pad(seconds)}`;
        displayElem.classList.toggle('has-hours', showHours);
    }
    const focusTimerRing = document.getElementById('focusTimerRing');
    if (focusTimerRing) {
        const progress = timerDurationSeconds > 0 ? 1 - Math.min(1, totalSeconds / timerDurationSeconds) : 0;
        focusTimerRing.style.setProperty('--timer-progress', `${Math.max(0, Math.min(1, progress)) * 360}deg`);
    }
    updateMushafBreakStatus();
    renderDailyOverview();
}

function updateMushafBreakStatus() {
    const status = document.getElementById('mushafBreakStatus');
    if (!status) return;
    status.hidden = !mushafSessionOpen || !isBreak;
    if (status.hidden) return;

    const totalSeconds = Math.max(0, Math.floor(Number(timeLeft) || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = value => String(value).padStart(2, '0');
    const remaining = timerUsesHoursFormat || hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(Math.floor(totalSeconds / 60))}:${pad(seconds)}`;
    const isArabic = currentLang === 'ar';
    const state = timer === null
        ? (isArabic ? 'الاستراحة متوقفة' : 'Break paused')
        : (isArabic ? 'الاستراحة مستمرة' : 'Break running');
    status.textContent = `${state} · ${remaining}`;
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
            if (!isBreak) {
                commitActiveFocusTime();
                addPoints();
            }
        }
        
        points -= cost;
        savePoints();
        
        isBreak = true;
        setTimerDuration(min);
        totalSecondsWorked = 0; // تصفير العداد لعدم حساب نقاط في الراحة
        persistPausedTimerState();
        
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
    updateGamePassUI();
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

function changeFocusVerse() {
    const textElem = document.getElementById('focusVerseText');
    const referenceElem = document.getElementById('focusVerseReference');
    if (!textElem || !referenceElem || focusVerses.length === 0) return;

    const verse = focusVerses[Math.floor(Math.random() * focusVerses.length)];
    textElem.textContent = verse.text;
    referenceElem.textContent = verse.reference;
}

function displayDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';
    const dateDisplay = document.getElementById('dateDisplay');
    if (!dateDisplay) return;
    dateDisplay.innerText = new Date().toLocaleDateString(locale, options);
    const glassCard = dateDisplay.closest('.glass-card');
    if (!glassCard) return;
    const updateDateSpacing = () => {
        glassCard.style.setProperty('--date-display-width', `${Math.ceil(dateDisplay.getBoundingClientRect().width)}px`);
    };
    requestAnimationFrame(updateDateSpacing);
    if (!dateDisplay._accountSpacingObserver && typeof ResizeObserver !== 'undefined') {
        dateDisplay._accountSpacingObserver = new ResizeObserver(updateDateSpacing);
        dateDisplay._accountSpacingObserver.observe(dateDisplay);
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
    const tasks = getStoredTasks();
    const priorityInput = document.getElementById('taskPriority');
    tasks.unshift({
        text,
        done: false,
        priority: priorityInput?.value || 'medium',
        createdAt: Date.now(),
        completedAt: null,
        pointsAwarded: false
    });
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    saveCloudStateImmediately();
    input.value = '';
    renderTasks();
}

window.toggleTask = function(index) {
    const tasks = getStoredTasks();
    const task = tasks[Number(index)];
    if (!task) return;
    task.done = !task.done;
    task.completedAt = task.done ? getLocalDayKey() : null;
    const firstCompletion = task.done && !task.pointsAwarded;
    let reward = 0;
    if (firstCompletion) {
        task.pointsAwarded = true;
        const rewardState = getDailyTaskRewardState();
        reward = Math.min(TASK_REWARD_POINTS, DAILY_TASK_REWARD_LIMIT - rewardState.points);
        if (reward > 0) {
            rewardState.points += reward;
            localStorage.setItem('dailyTaskRewardState', JSON.stringify(rewardState));
            points = (Number.isFinite(points) ? points : 0) + reward;
            localStorage.setItem('userPoints', String(points));
            updatePointsDisplay();
        }
    }
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    saveCloudStateImmediately();
    renderTasks();
    if (reward > 0) showDashboardNotice(getDashboardLabels().taskRewardNotice);
    else if (firstCompletion) showDashboardNotice(getDashboardLabels().taskRewardLimitNotice);
}

window.deleteTask = function(index) {
    const tasks = getStoredTasks();
    if (!Number.isInteger(Number(index)) || Number(index) < 0 || Number(index) >= tasks.length) return;
    tasks.splice(Number(index), 1);
    localStorage.setItem('surgeonTasks', JSON.stringify(tasks));
    saveCloudStateImmediately();
    renderTasks();
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    const labels = getDashboardLabels();
    const tasks = getStoredTasks();
    const visibleTasks = tasks.map((task, index) => ({ task, index }));

    taskList.replaceChildren();
    if (!visibleTasks.length) {
        const empty = document.createElement('li');
        empty.className = 'task-empty';
        empty.textContent = labels.noTasks;
        taskList.append(empty);
    }

    visibleTasks.forEach(({ task, index }) => {
        const item = document.createElement('li');
        item.className = `task-row${task.done ? ' is-done' : ''}`;

        const complete = document.createElement('button');
        complete.type = 'button';
        complete.className = `task-check${task.done ? ' is-checked' : ''}`;
        complete.dataset.taskAction = 'toggle';
        complete.dataset.taskIndex = String(index);
        complete.setAttribute('aria-pressed', String(Boolean(task.done)));
        complete.setAttribute('aria-label', task.done ? (currentLang === 'ar' ? 'إعادة فتح المهمة' : 'Reopen task') : (currentLang === 'ar' ? 'إنهاء المهمة' : 'Complete task'));
        complete.textContent = task.done ? '✓' : '';

        const content = document.createElement('div');
        content.className = 'task-content';
        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = String(task.text || '');
        const meta = document.createElement('div');
        meta.className = 'task-meta';

        const priority = ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium';
        const priorityBadge = document.createElement('span');
        priorityBadge.className = `task-priority priority-${priority}`;
        priorityBadge.textContent = priority === 'high' ? labels.priorityHigh : priority === 'low' ? labels.priorityLow : labels.priorityMedium;
        meta.append(priorityBadge);
        content.append(title, meta);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'task-delete';
        remove.dataset.taskAction = 'delete';
        remove.dataset.taskIndex = String(index);
        remove.setAttribute('aria-label', currentLang === 'ar' ? 'حذف المهمة' : 'Delete task');
        remove.title = currentLang === 'ar' ? 'حذف المهمة' : 'Delete task';
        remove.textContent = '×';

        item.append(complete, content, remove);
        taskList.append(item);
    });
    updateSmartSuggestion();
    renderDailyOverview();
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered Successfully!'))
      .catch(err => console.log('Service Worker Registration Failed: ', err));
  });
}

window.addEventListener('load', () => {
    initializeThemeToggle();
    initializeCloud();
});
