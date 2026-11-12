const TASBEEH_STATE_KEY = 'tasbeehCounterState';
const DAILY_TRACKER_KEY = 'tasbeehDailyTracker';
const DHIKR = {
    astaghfirullah: {
        text: 'أَسْتَغْفِرُ اللَّهَ',
        target: 3
    },
    allahummaAntaAlsalam: {
        text: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
        target: 1
    },
    subhanAllah: {
        text: 'سُبْحَانَ اللَّهِ',
        target: 33
    },
    alhamdulillah: {
        text: 'الْحَمْدُ لِلَّهِ',
        target: 33
    },
    allahuAkbar: {
        text: 'اللَّهُ أَكْبَرُ',
        target: 33
    },
    tahlilAfterPrayer: {
        text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        target: 1
    },
    subhanAllahDaily: {
        text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        target: 100
    },
    tahlilDaily: {
        text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        target: 100
    },
    laHawla: {
        text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
        target: 0
    }
};

const COUNTER_TARGETS = [0, 1, 3, 33, 100];
const DAILY_GOALS = [33, 100, 300, 500, 1000];
const RAPID_TAP_INTERVAL_MS = 280;
const RAPID_TAP_STREAK_LIMIT = 3;
const COUNTER_PAUSE_MS = 1500;
const RAPID_TAP_STATUS = 'تمهّل في التسبيح، وخذ لحظة بين كل تسبيحة.';
const countButton = document.getElementById('countButton');
const countValue = document.getElementById('countValue');
const targetValue = document.getElementById('targetValue');
const counterOrbit = document.getElementById('counterOrbit');
const activeDhikrText = document.getElementById('activeDhikrText');
const counterStatus = document.getElementById('counterStatus');
const counterPrompt = document.querySelector('.counter-prompt');
const roundCount = document.getElementById('roundCount');
const dhikrSelect = document.getElementById('dhikrSelect');
const dailyDate = document.getElementById('dailyDate');
const dailyTotal = document.getElementById('dailyTotal');
const dailyProgressTrack = document.getElementById('dailyProgressTrack');
const dailyProgressFill = document.getElementById('dailyProgressFill');
const dailyProgressLabel = document.getElementById('dailyProgressLabel');
const dailyProgressPercent = document.getElementById('dailyProgressPercent');
const dailyStatus = document.getElementById('dailyStatus');
const themeToggle = document.getElementById('themeToggle');
const zoomToggle = document.getElementById('zoomToggle');
const backLink = document.querySelector('.back-link');
const dhikrShortcutButtons = [...document.querySelectorAll('[data-dhikr-shortcut]')];
const clearDataDialog = document.getElementById('clearDataDialog');
const STRAND_BEAD_COUNT = 19;
const STRAND_CENTER_SLOT = Math.floor(STRAND_BEAD_COUNT / 2);
const strandPositions = [...Array(STRAND_BEAD_COUNT)].map((_, index) => {
    const progress = index / (STRAND_BEAD_COUNT - 1);
    const inverse = 1 - progress;
    const bezier = (start, controlA, controlB, end) => inverse ** 3 * start
        + 3 * inverse ** 2 * progress * controlA
        + 3 * inverse * progress ** 2 * controlB
        + progress ** 3 * end;
    return { x: bezier(18, 170, 430, 582), y: bezier(24, 136, 136, 24) };
});
const tasbeehBeads = [...Array(STRAND_BEAD_COUNT)].map((_, index) => {
    const bead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bead.setAttribute('cx', strandPositions[index].x.toFixed(2));
    bead.setAttribute('cy', strandPositions[index].y.toFixed(2));
    bead.setAttribute('r', '13.5');
    bead.dataset.slot = String(index);
    bead.classList.add('strand-bead');
    document.getElementById('tasbeehBeads').appendChild(bead);
    return bead;
});
let strandHasRendered = false;

function readCounterState() {
    try {
        const saved = JSON.parse(localStorage.getItem(TASBEEH_STATE_KEY) || 'null');
        if (!saved || !DHIKR[saved.dhikrId]) return { dhikrId: 'subhanAllah', target: 33, count: 0, rounds: 0 };
        const target = COUNTER_TARGETS.includes(Number(saved.target)) ? Number(saved.target) : DHIKR[saved.dhikrId].target;
        const count = Math.max(0, Math.min(target || 1000000, Math.trunc(Number(saved.count) || 0)));
        const rounds = Math.max(0, Math.trunc(Number(saved.rounds) || 0));
        return { dhikrId: saved.dhikrId, target, count, rounds };
    } catch (error) {
        return { dhikrId: 'subhanAllah', target: 33, count: 0, rounds: 0 };
    }
}

let counterState = readCounterState();
let lastCountTime = 0;
let rapidTapStreak = 0;
let countPausedUntil = 0;
let countPauseTimer = 0;

function setCounterStatus(message) {
    counterStatus.textContent = performance.now() < countPausedUntil ? RAPID_TAP_STATUS : message;
}

function pauseCounterForRapidTaps(now) {
    countPausedUntil = now + COUNTER_PAUSE_MS;
    countButton.classList.add('is-paused');
    countButton.setAttribute('aria-disabled', 'true');
    countButton.setAttribute('aria-label', 'تمهّل في التسبيح، سيُستأنف العد بعد لحظة.');
    counterPrompt.textContent = 'انتظر لحظة';
    setCounterStatus(RAPID_TAP_STATUS);
    window.clearTimeout(countPauseTimer);
    countPauseTimer = window.setTimeout(() => {
        countPausedUntil = 0;
        countButton.classList.remove('is-paused');
        countButton.removeAttribute('aria-disabled');
        counterPrompt.textContent = 'اضغط للتسبيح';
        renderCounter();
    }, COUNTER_PAUSE_MS);
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function readDailyTracker() {
    try {
        const saved = JSON.parse(localStorage.getItem(DAILY_TRACKER_KEY) || 'null');
        const goal = DAILY_GOALS.includes(Number(saved?.goal)) ? Number(saved.goal) : 100;
        if (saved?.date === localDateKey()) {
            return { date: saved.date, total: Math.max(0, Math.trunc(Number(saved.total) || 0)), goal };
        }
        return { date: localDateKey(), total: 0, goal };
    } catch (error) {
        return { date: localDateKey(), total: 0, goal: 100 };
    }
}

let dailyTracker = readDailyTracker();

function formatNumber(value) {
    return new Intl.NumberFormat('ar-EG').format(value);
}

function saveCounterState() {
    try { localStorage.setItem(TASBEEH_STATE_KEY, JSON.stringify(counterState)); } catch (error) { /* Keep the counter usable if storage is unavailable. */ }
}

function saveDailyTracker() {
    try { localStorage.setItem(DAILY_TRACKER_KEY, JSON.stringify(dailyTracker)); } catch (error) { /* The daily tracker remains usable if storage is unavailable. */ }
}

function ensureCurrentDay() {
    const today = localDateKey();
    if (dailyTracker.date === today) return;
    dailyTracker = { date: today, total: 0, goal: dailyTracker.goal };
    saveDailyTracker();
}

function renderDailyProgress() {
    ensureCurrentDay();
    const percent = Math.min(100, Math.round((dailyTracker.total / dailyTracker.goal) * 100));
    const remaining = Math.max(0, dailyTracker.goal - dailyTracker.total);
    const today = new Date();

    dailyDate.dateTime = dailyTracker.date;
    dailyDate.textContent = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
    dailyTotal.textContent = formatNumber(dailyTracker.total);
    dailyProgressFill.style.width = `${percent}%`;
    dailyProgressTrack.setAttribute('aria-valuenow', String(percent));
    dailyProgressTrack.setAttribute('aria-valuetext', `${formatNumber(dailyTracker.total)} من ${formatNumber(dailyTracker.goal)} تسبيحة`);
    dailyProgressLabel.textContent = `هدفك ${formatNumber(dailyTracker.goal)} تسبيحة`;
    dailyProgressPercent.textContent = `${formatNumber(percent)}٪`;
    dailyStatus.textContent = remaining
        ? `باقي ${formatNumber(remaining)} للوصول لهدفك اليوم.`
        : 'وصلت لهدفك اليوم، استمر لو تحب.';

    document.querySelectorAll('.daily-goal-picker button').forEach(button => {
        button.setAttribute('aria-pressed', String(Number(button.dataset.dailyGoal) === dailyTracker.goal));
    });
}

function renderCounter() {
    const dhikr = DHIKR[counterState.dhikrId];
    const complete = counterState.target > 0 && counterState.count === counterState.target;
    const progress = counterState.target > 0 ? Math.min(1, Math.max(0, counterState.count / counterState.target)) : 0;
    const progressDegrees = `${progress * 360}deg`;
    const tickAngle = counterState.target > 0 ? 360 / counterState.target : 360;
    const tickWidth = Math.min(1.1, tickAngle * 0.42);

    activeDhikrText.textContent = dhikr.text;
    dhikrSelect.value = counterState.dhikrId;
    countValue.textContent = formatNumber(counterState.count);
    targetValue.textContent = counterState.target ? formatNumber(counterState.target) : '∞';
    roundCount.textContent = `${formatNumber(counterState.rounds)} ${counterState.rounds === 1 ? 'جولة' : 'جولات'}`;
    counterOrbit.style.setProperty('--progress', progressDegrees);
    counterOrbit.style.setProperty('--tick-angle', `${tickAngle}deg`);
    counterOrbit.style.setProperty('--tick-width', `${tickWidth}deg`);
    counterOrbit.classList.toggle('is-unlimited', counterState.target === 0);
    countButton.setAttribute('aria-label', `زيادة عدّ ${dhikr.text}، العدد الحالي ${formatNumber(counterState.count)}`);

    const dailyCount = Math.max(0, Math.trunc(dailyTracker.total));
    const strandOffset = dailyCount % STRAND_BEAD_COUNT;
    const firstStrandRender = !strandHasRendered;
    tasbeehBeads.forEach((bead, index) => {
        const slot = (index - strandOffset + STRAND_BEAD_COUNT) % STRAND_BEAD_COUNT;
        const previousSlot = Number(bead.dataset.slot);
        const wrapped = strandHasRendered && Math.abs(slot - previousSlot) > 1;
        if (wrapped) {
            bead.classList.add('is-wrapping');
            window.setTimeout(() => bead.classList.remove('is-wrapping'), 110);
        } else bead.classList.remove('is-wrapping');

        if (firstStrandRender) bead.style.transition = 'none';
        bead.setAttribute('cx', strandPositions[slot].x.toFixed(2));
        bead.setAttribute('cy', strandPositions[slot].y.toFixed(2));
        bead.dataset.slot = String(slot);

        const beadNumber = dailyCount + slot - STRAND_CENTER_SLOT;
        const isDivider = beadNumber > 0 && beadNumber <= dailyCount && beadNumber % 33 === 0;
        const isFocus = slot === STRAND_CENTER_SLOT;
        bead.classList.toggle('strand-divider', isDivider);
        bead.classList.toggle('strand-focus', isFocus);
        bead.setAttribute('r', isFocus ? '17' : isDivider ? '15.5' : '13.5');
    });
    if (firstStrandRender) {
        strandHasRendered = true;
        window.requestAnimationFrame(() => tasbeehBeads.forEach(bead => bead.style.removeProperty('transition')));
    }

    document.querySelectorAll('.target-picker button').forEach(button => {
        button.setAttribute('aria-pressed', String(Number(button.dataset.target) === counterState.target));
    });
    dhikrShortcutButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.dhikrShortcut === counterState.dhikrId));
    });
    if (performance.now() < countPausedUntil) {
        countButton.classList.add('is-paused');
        countButton.setAttribute('aria-disabled', 'true');
        counterPrompt.textContent = 'انتظر لحظة';
        countButton.setAttribute('aria-label', 'تمهّل في التسبيح، سيُستأنف العد بعد لحظة.');
        setCounterStatus(RAPID_TAP_STATUS);
    } else if (complete) setCounterStatus(`أتممت ${formatNumber(counterState.target)} مرة، تقبّل الله منك. اضغط للبدء في جولة جديدة.`);
    else if (counterState.target) setCounterStatus(`باقي ${formatNumber(counterState.target - counterState.count)} للوصول إلى الهدف.`);
    else setCounterStatus('العدّ مفتوح، خذ وقتك في الذكر.');
}

function selectDhikr(id) {
    const dhikr = DHIKR[id];
    if (!dhikr) return;
    counterState = { dhikrId: id, target: dhikr.target, count: 0, rounds: 0 };
    saveCounterState();
    renderCounter();
    setCounterStatus('تم اختيار التسبيح. ابدأ حين تشاء.');
}

function setTarget(target) {
    if (!COUNTER_TARGETS.includes(target)) return;
    counterState = { ...counterState, target, count: 0, rounds: 0 };
    saveCounterState();
    renderCounter();
}

countButton.addEventListener('click', () => {
    const now = performance.now();
    if (now < countPausedUntil) return;

    if (lastCountTime && now - lastCountTime < RAPID_TAP_INTERVAL_MS) rapidTapStreak += 1;
    else rapidTapStreak = 0;
    lastCountTime = now;

    if (rapidTapStreak >= RAPID_TAP_STREAK_LIMIT) {
        rapidTapStreak = 0;
        pauseCounterForRapidTaps(now);
        return;
    }

    ensureCurrentDay();
    if (counterState.target > 0 && counterState.count >= counterState.target) counterState.count = 0;
    counterState.count += 1;
    if (counterState.target > 0 && counterState.count === counterState.target) counterState.rounds += 1;
    dailyTracker.total += 1;
    saveCounterState();
    saveDailyTracker();
    renderCounter();
    renderDailyProgress();
    if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
});

document.getElementById('undoButton').addEventListener('click', () => {
    if (counterState.count <= 0) return;
    if (counterState.target > 0 && counterState.count === counterState.target) counterState.rounds = Math.max(0, counterState.rounds - 1);
    counterState.count -= 1;
    ensureCurrentDay();
    dailyTracker.total = Math.max(0, dailyTracker.total - 1);
    saveCounterState();
    saveDailyTracker();
    renderCounter();
    renderDailyProgress();
});

document.getElementById('resetButton').addEventListener('click', () => {
    counterState = { ...counterState, count: 0, rounds: 0 };
    saveCounterState();
    renderCounter();
    setCounterStatus('بدأ عدّ جديد.');
});

document.getElementById('dailyResetButton').addEventListener('click', () => {
    ensureCurrentDay();
    dailyTracker.total = 0;
    counterState = { ...counterState, count: 0, rounds: 0 };
    saveDailyTracker();
    saveCounterState();
    renderDailyProgress();
    renderCounter();
    setCounterStatus('تم تصفير عداد التسبيح اليوم.');
});

document.getElementById('clearLocalDataButton').addEventListener('click', () => {
    if (typeof clearDataDialog?.showModal === 'function') clearDataDialog.showModal();
    else if (window.confirm('سيُحذف العدّ الحالي ومجموع اليوم والهدف اليومي من هذا المتصفح. هل تريد المتابعة؟')) clearTasbeehData();
});

document.getElementById('cancelClearData').addEventListener('click', () => clearDataDialog.close());

document.getElementById('confirmClearData').addEventListener('click', () => {
    clearTasbeehData();
    clearDataDialog.close();
});

function clearTasbeehData() {
    try {
        localStorage.removeItem(TASBEEH_STATE_KEY);
        localStorage.removeItem(DAILY_TRACKER_KEY);
    } catch (error) { /* Keep the page usable when browser storage is unavailable. */ }
    counterState = { dhikrId: 'subhanAllah', target: 33, count: 0, rounds: 0 };
    dailyTracker = { date: localDateKey(), total: 0, goal: 100 };
    renderCounter();
    renderDailyProgress();
    setCounterStatus('تم مسح بيانات السبحة من هذا المتصفح.');
}

document.querySelectorAll('.target-picker button').forEach(button => {
    button.addEventListener('click', () => setTarget(Number(button.dataset.target)));
});

dhikrSelect.addEventListener('change', () => selectDhikr(dhikrSelect.value));
dhikrShortcutButtons.forEach(button => {
    button.addEventListener('click', () => selectDhikr(button.dataset.dhikrShortcut));
});

document.querySelectorAll('.daily-goal-picker button').forEach(button => {
    button.addEventListener('click', () => {
        const goal = Number(button.dataset.dailyGoal);
        if (!DAILY_GOALS.includes(goal)) return;
        ensureCurrentDay();
        dailyTracker.goal = goal;
        saveDailyTracker();
        renderDailyProgress();
    });
});

function setTheme(theme, persist = true) {
    const isLight = theme === 'light';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    themeToggle.textContent = isLight ? '☾' : '☼';
    const label = isLight ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح';
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;
    if (persist) {
        try { localStorage.setItem('colorScheme', isLight ? 'light' : 'dark'); } catch (error) { /* The page theme remains usable without storage. */ }
    }
}

themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

function setZoomMode(enabled, syncFullscreen = true) {
    document.documentElement.classList.toggle('tasbeeh-zoom-mode', enabled);
    document.body.classList.toggle('tasbeeh-zoom-mode', enabled);
    zoomToggle.setAttribute('aria-pressed', String(enabled));
    zoomToggle.querySelector('span').textContent = enabled ? '⤡' : '⤢';
    const label = enabled ? 'إغلاق تكبير السبحة' : 'تكبير السبحة';
    zoomToggle.setAttribute('aria-label', label);
    zoomToggle.title = label;
    if (enabled) {
        if (syncFullscreen && !document.fullscreenElement) {
            const requestFullscreen = document.documentElement.requestFullscreen?.bind(document.documentElement)
                || document.documentElement.webkitRequestFullscreen?.bind(document.documentElement);
            try {
                const fullscreenRequest = requestFullscreen?.();
                fullscreenRequest?.catch(() => {});
            } catch (error) { /* The full-viewport layout remains available when fullscreen is denied. */ }
        }
        window.requestAnimationFrame(() => countButton.focus({ preventScroll: true }));
    } else {
        if (syncFullscreen && document.fullscreenElement) {
            const exitFullscreen = document.exitFullscreen?.bind(document)
                || document.webkitExitFullscreen?.bind(document);
            try {
                const fullscreenExit = exitFullscreen?.();
                fullscreenExit?.catch(() => {});
            } catch (error) { /* The focus view can still close if browser fullscreen is unavailable. */ }
        }
        zoomToggle.focus({ preventScroll: true });
    }
}

zoomToggle.addEventListener('click', () => {
    setZoomMode(!document.body.classList.contains('tasbeeh-zoom-mode'));
});

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('tasbeeh-zoom-mode')) setZoomMode(false, false);
});

document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement && document.body.classList.contains('tasbeeh-zoom-mode')) setZoomMode(false, false);
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('tasbeeh-zoom-mode')) setZoomMode(false);
    else if (event.key === 'Escape' && window.parent !== window) window.parent.postMessage({ type: 'molham:close-tasbeeh' }, '*');
});

document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('tasbeeh-zoom-mode')) return;
    const scrollBy = event.key === 'ArrowUp' ? -72
        : event.key === 'ArrowDown' ? 72
        : event.key === 'PageUp' ? -window.innerHeight * 0.8
        : event.key === 'PageDown' ? window.innerHeight * 0.8
        : 0;
    if (scrollBy) {
        event.preventDefault();
        document.scrollingElement?.scrollBy({ top: scrollBy, behavior: 'smooth' });
    } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        document.scrollingElement?.scrollTo({ top: event.key === 'Home' ? 0 : document.scrollingElement.scrollHeight, behavior: 'smooth' });
    }
});

backLink?.addEventListener('click', event => {
    if (window.parent === window) return;
    event.preventDefault();
    window.parent.postMessage({ type: 'molham:close-tasbeeh' }, '*');
});

let initialTheme = 'dark';
try { initialTheme = localStorage.getItem('colorScheme') === 'light' ? 'light' : 'dark'; } catch (error) { /* Use the default dark theme. */ }
setTheme(initialTheme, false);
renderCounter();
renderDailyProgress();
window.setInterval(renderDailyProgress, 60_000);

if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
