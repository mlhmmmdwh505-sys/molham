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
    'tasbeehCounterState', 'tasbeehDailyTracker'
];
const CLOUD_SYNC_PENDING_KEY = 'molhamCloudSyncPending';
let cloudUser = null;
let cloudUnsubscribe = null;
let cloudSaveSequence = 0;
let guestModeSelected = false;

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
    document.body.classList.toggle('login-visible', !user && !guestModeSelected);
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
    setColorScheme(localStorage.getItem('colorScheme') || 'dark', false);
    document.documentElement.style.setProperty('--primary', savedColor);

    if (document.getElementById('langSelect')) document.getElementById('langSelect').value = currentLang;
    if (document.getElementById('userNameInput')) document.getElementById('userNameInput').value = savedName;
    if (document.getElementById('minsInput')) document.getElementById('minsInput').value = savedMins;
    if (document.getElementById('gradDateInput')) document.getElementById('gradDateInput').value = graduationDate;
    if (document.getElementById('colorPicker')) document.getElementById('colorPicker').value = savedColor;
    updateColorPickerPreview(savedColor);

    setTimerDuration(savedMins);
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
    });
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
    refreshDashboardFromStorage();
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

    if (cloudUnsubscribe) cloudUnsubscribe();
    cloudUnsubscribe = firebase.firestore().collection('users').doc(user.uid).onSnapshot(snapshot => {
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
    if (!navigator.onLine) {
        showLoginError('تسجيل Google والمزامنة بين الأجهزة يحتاجان اتصالًا بالإنترنت. يمكنك المتابعة كضيف الآن.');
        return;
    }
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
    window.addEventListener('online', () => {
        if (cloudUser) saveCloudStateImmediately();
    });
    document.getElementById('googleLoginButton')?.addEventListener('click', signInWithGoogle);
    document.getElementById('guestLoginButton')?.addEventListener('click', signInWithGoogle);
    document.getElementById('continueAsGuestButton')?.addEventListener('click', continueAsGuest);
    document.getElementById('logoutButton')?.addEventListener('click', signOut);
    initializeAccountMenu('accountControl', 'accountMenuButton', 'accountMenu');
    initializeAccountMenu('guestAccountControl', 'guestAccountMenuButton', 'guestAccountMenu');
    if (!navigator.onLine) continueAsGuest();

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
    clearLocalUserState();
    localStorage.removeItem('molhamCloudUserId');
    localStorage.removeItem(CLOUD_SYNC_PENDING_KEY);
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
    setTimerDuration(savedMins);
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
