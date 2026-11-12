const PAGE_COUNT = 604;
const LAST_PAGE_KEY = 'mushafLastPage';
const KHATMA_PLAN_KEY = 'mushafKhatmaPlan';
const DAILY_SURAH_PLAN_KEY = 'mushafDailySurahPlan';
const pageCache = new Map();
const fullSurahMarkupCache = new Map();

const pagePaper = document.getElementById('pagePaper');
const pageContent = document.getElementById('pageContent');
const pageLoading = document.getElementById('pageLoading');
const pageError = document.getElementById('pageError');
const pageInput = document.getElementById('pageNumberInput');
const currentPageSurah = document.getElementById('currentPageSurah');
const surahSelect = document.getElementById('surahSelect');
const surahJumpButton = document.getElementById('surahJumpButton');
const pageHeaderNumber = document.getElementById('pageHeaderNumber');
const pageFooterNumber = document.getElementById('pageFooterNumber');
const pageJuzNumber = document.getElementById('pageJuzNumber');
const pageHizbNumber = document.getElementById('pageHizbNumber');
const readerStatus = document.getElementById('readerStatus');
const savedPosition = document.getElementById('savedPosition');
const savedPositionText = document.getElementById('savedPositionText');
const surahHeader = document.getElementById('surahHeader');
const themeToggle = document.getElementById('readerThemeToggle');
const pageZoomToggle = document.getElementById('pageZoomToggle');
const mushafZoomOutButton = document.getElementById('mushafZoomOut');
const mushafZoomInButton = document.getElementById('mushafZoomIn');
const backLink = document.querySelector('.back-link');
const khatmaForm = document.getElementById('khatmaForm');
const khatmaDurationInput = document.getElementById('khatmaDuration');
const khatmaSaveButton = document.getElementById('khatmaSaveButton');
const khatmaDailyProgress = document.getElementById('khatmaDailyProgress');
const khatmaDailyFill = document.getElementById('khatmaDailyFill');
const khatmaDailyTrack = khatmaDailyFill.parentElement;
const khatmaDailyHint = document.getElementById('khatmaDailyHint');
const khatmaOverallProgress = document.getElementById('khatmaOverallProgress');
const khatmaOverallFill = document.getElementById('khatmaOverallFill');
const khatmaOverallTrack = khatmaOverallFill.parentElement;
const khatmaOverallHint = document.getElementById('khatmaOverallHint');
const khatmaStatus = document.getElementById('khatmaStatus');
const continueReadingButton = document.getElementById('continueReadingButton');
const readingArea = document.getElementById('readingArea');
const readerPlansToggle = document.getElementById('readerPlansToggle');
const readerPlans = document.getElementById('readerPlans');
const dailySurahForm = document.getElementById('dailySurahForm');
const dailySurahSelect = document.getElementById('dailySurahSelect');
const dailySurahDurationInput = document.getElementById('dailySurahDuration');
const dailySurahStartButton = document.getElementById('dailySurahStartButton');
const dailySurahProgress = document.getElementById('dailySurahProgress');
const dailySurahFill = document.getElementById('dailySurahFill');
const dailySurahTrack = dailySurahFill.parentElement;
const dailySurahHint = document.getElementById('dailySurahHint');
const dailySurahStatus = document.getElementById('dailySurahStatus');
const readDailySurahButton = document.getElementById('readDailySurahButton');
const completeDailySurahButton = document.getElementById('completeDailySurahButton');

let currentPage = readLastPage();
let isLoading = false;
let mushafTextScale = 1;
let surahCatalog = [];
let surahByNumber = new Map();
let quranAyahsBySurah = new Map();
let quranPages = null;
let quranDataPromise = null;
let isFullSurahView = false;
let currentFullSurahNumber = null;
let surahPageReturnPage = null;
let surahRenderToken = 0;
let khatmaPlan = readKhatmaPlan();
let dailySurahPlan = readDailySurahPlan();

function setMushafTheme(theme, persist = true) {
    const isLight = theme === 'light';
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    const label = isLight ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح';
    themeToggle.setAttribute('aria-checked', String(isLight));
    themeToggle.setAttribute('aria-label', label);
    themeToggle.title = label;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = '#123a34';
    if (persist) {
        try { localStorage.setItem('mushafColorScheme', isLight ? 'light' : 'dark'); } catch (error) { /* The page theme remains available without persistence. */ }
    }
}

themeToggle.addEventListener('click', () => {
    setMushafTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

function setMushafTextScale(nextScale) {
    mushafTextScale = Math.min(2, Math.max(0.7, Math.round(nextScale * 10) / 10));
    document.body.style.setProperty('--mushaf-text-scale', String(mushafTextScale));
    mushafZoomOutButton.disabled = mushafTextScale <= 0.7;
    mushafZoomInButton.disabled = mushafTextScale >= 2;
    readerStatus.textContent = `حجم خط القرآن ${toArabicNumber(Math.round(mushafTextScale * 100))}٪.`;
}

mushafZoomOutButton.addEventListener('click', () => setMushafTextScale(mushafTextScale - 0.1));
mushafZoomInButton.addEventListener('click', () => setMushafTextScale(mushafTextScale + 0.1));

function setPageZoomMode(enabled, syncFullscreen = true) {
    const wasEnabled = document.body.classList.contains('page-zoom-mode');
    if (wasEnabled === enabled) return;

    pagePaper.getAnimations().forEach(animation => animation.cancel());
    const fromRect = pagePaper.getBoundingClientRect();
    document.documentElement.classList.toggle('page-zoom-mode', enabled);
    document.body.classList.toggle('page-zoom-mode', enabled);
    if (window.parent !== window) {
        const parentOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
        window.parent.postMessage({ type: 'molham:mushaf-zoom-mode', enabled }, parentOrigin);
    }
    if (!enabled) showPageByPageView();
    if (enabled) {
        readingArea.scrollTop = 0;
        readingArea.scrollLeft = 0;
        if (!isLoading) showSurahInZoom(getCurrentSurahNumber());
    }
    const toRect = pagePaper.getBoundingClientRect();
    pageZoomToggle.setAttribute('aria-pressed', String(enabled));
    const label = enabled ? 'إغلاق تكبير المصحف' : 'تكبير المصحف';
    pageZoomToggle.setAttribute('aria-label', label);
    pageZoomToggle.title = label;
    document.body.classList.remove('zoom-controls-hidden');

    const allowNativeFullscreen = !window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    if (syncFullscreen && enabled && allowNativeFullscreen && !document.fullscreenElement) {
        const requestFullscreen = document.documentElement.requestFullscreen?.bind(document.documentElement)
            || document.documentElement.webkitRequestFullscreen?.bind(document.documentElement);
        try {
            const fullscreenRequest = requestFullscreen?.();
            fullscreenRequest?.catch(() => {});
        } catch (error) { /* The full-viewport layout remains available when fullscreen is unavailable. */ }
    } else if (syncFullscreen && !enabled && (document.fullscreenElement || document.webkitFullscreenElement)) {
        const exitFullscreen = document.exitFullscreen?.bind(document)
            || document.webkitExitFullscreen?.bind(document);
        try {
            const fullscreenExit = exitFullscreen?.();
            fullscreenExit?.catch(() => {});
        } catch (error) { /* The page has already returned to its normal layout. */ }
    }

    if (!enabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && toRect.width && toRect.height) {
        const translateX = fromRect.left - toRect.left;
        const translateY = fromRect.top - toRect.top;
        const scaleX = fromRect.width / toRect.width;
        const scaleY = fromRect.height / toRect.height;
        pagePaper.animate([
            { transformOrigin: 'top left', transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})` },
            { transformOrigin: 'top left', transform: 'translate(0, 0) scale(1, 1)' }
        ], { duration: 680, easing: 'cubic-bezier(.22, .61, .36, 1)' });
    }

    if (enabled) {
        window.requestAnimationFrame(() => readingArea.focus({ preventScroll: true }));
    } else {
        pageZoomToggle.focus({ preventScroll: true });
    }
}

function syncPageZoomAfterFullscreenExit() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && document.body.classList.contains('page-zoom-mode')) {
        setPageZoomMode(false, false);
    }
}
document.addEventListener('fullscreenchange', syncPageZoomAfterFullscreenExit);
document.addEventListener('webkitfullscreenchange', syncPageZoomAfterFullscreenExit);

readingArea.addEventListener('scroll', () => {
    if (!document.body.classList.contains('page-zoom-mode')) return;
    const currentTop = readingArea.scrollTop;
    document.body.classList.toggle('zoom-controls-hidden', currentTop > 8);
}, { passive: true });

pageZoomToggle.addEventListener('click', () => {
    setPageZoomMode(!document.body.classList.contains('page-zoom-mode'));
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('page-zoom-mode')) {
        setPageZoomMode(false);
    }
});

backLink.addEventListener('click', event => {
    if (window.parent === window && window.opener && !window.opener.closed) {
        try {
            if (window.opener.location.origin === window.location.origin) {
                event.preventDefault();
                window.opener.focus();
                window.close();
                return;
            }
        } catch (error) {
            // Keep the regular dashboard link when this page has no same-origin opener.
        }
    }
    if (window.parent === window) {
        let openedFromDashboard = false;
        try {
            openedFromDashboard = sessionStorage.getItem('mushafReturnFromDashboard') === '1';
            if (openedFromDashboard) sessionStorage.removeItem('mushafReturnFromDashboard');
        } catch (error) {
            // Fall back to the regular dashboard link when session storage is unavailable.
        }
        if (openedFromDashboard && window.history.length > 1) {
            event.preventDefault();
            window.history.back();
            return;
        }
        try {
            const previousPage = new URL(document.referrer);
            const dashboardFile = new URL('index.html', window.location.href);
            const dashboardDirectory = new URL('.', window.location.href);
            const cameFromDashboard = previousPage.origin === window.location.origin
                && (previousPage.pathname === dashboardFile.pathname || previousPage.pathname === dashboardDirectory.pathname);
            if (cameFromDashboard && window.history.length > 1) {
                event.preventDefault();
                window.history.back();
            }
        } catch (error) {
            // Keep the direct dashboard link available when there is no usable history entry.
        }
        return;
    }
    event.preventDefault();
    window.parent.postMessage({ type: 'molham:close-mushaf' }, '*');
});

function readLastPage() {
    try {
        const storedPage = Number.parseInt(localStorage.getItem(LAST_PAGE_KEY) || '1', 10);
        return Number.isFinite(storedPage) ? Math.min(PAGE_COUNT, Math.max(1, storedPage)) : 1;
    } catch (error) {
        return 1;
    }
}

function readKhatmaPlan() {
    try {
        const plan = JSON.parse(localStorage.getItem(KHATMA_PLAN_KEY) || 'null');
        if (!plan || !Number.isInteger(Number(plan.startPage)) || !Number.isFinite(dateKeyOrdinal(plan.targetDate))) return null;
        const startPage = Math.min(PAGE_COUNT, Math.max(1, Number(plan.startPage)));
        const readPages = Array.isArray(plan.readPages) ? plan.readPages.map(Number).filter(page => Number.isInteger(page) && page >= startPage && page <= PAGE_COUNT) : [];
        const dailyReads = plan.dailyReads && typeof plan.dailyReads === 'object' && !Array.isArray(plan.dailyReads) ? plan.dailyReads : {};
        return { ...plan, startPage, readPages: [...new Set(readPages)], dailyReads };
    } catch (error) {
        return null;
    }
}

function readDailySurahPlan() {
    try {
        const plan = JSON.parse(localStorage.getItem(DAILY_SURAH_PLAN_KEY) || 'null');
        const durationDays = Number(plan?.durationDays);
        const selectedSurahNumber = Number(plan?.selectedSurahNumber);
        if (!plan || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650
            || !Number.isInteger(selectedSurahNumber) || selectedSurahNumber < 1 || selectedSurahNumber > 114
            || !Number.isFinite(dateKeyOrdinal(plan.startDate))) return null;

        const startDate = plan.startDate;
        const targetDate = addDaysToDateKey(startDate, durationDays - 1);
        const completedByDate = {};
        if (plan.completedByDate && typeof plan.completedByDate === 'object' && !Array.isArray(plan.completedByDate)) {
            Object.entries(plan.completedByDate).forEach(([dateKey, number]) => {
                const surahNumber = Number(number);
                const ordinal = dateKeyOrdinal(dateKey);
                if (Number.isFinite(ordinal) && ordinal >= dateKeyOrdinal(startDate) && ordinal <= dateKeyOrdinal(targetDate)
                    && Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114) {
                    completedByDate[dateKey] = surahNumber;
                }
            });
        }
        return { startDate, targetDate, durationDays, selectedSurahNumber, completedByDate };
    } catch (error) {
        return null;
    }
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey, days) {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function dateKeyOrdinal(dateKey) {
    const [year, month, day] = String(dateKey || '').split('-').map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return NaN;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return NaN;
    return Math.floor(date.getTime() / 86400000);
}

function getPagesForDate(pages) {
    return [...new Set((Array.isArray(pages) ? pages : [])
        .map(Number)
        .filter(page => Number.isInteger(page) && page >= (khatmaPlan?.startPage || 1) && page <= PAGE_COUNT))];
}

function renderKhatma() {
    continueReadingButton.textContent = `كمّل من صفحة ${toArabicNumber(currentPage)}`;
    continueReadingButton.disabled = isLoading;
    khatmaSaveButton.textContent = khatmaPlan ? 'إعادة بدء الخطة' : 'ابدأ الخطة';
    if (khatmaPlan?.durationDays && document.activeElement !== khatmaDurationInput) {
        khatmaDurationInput.value = String(khatmaPlan.durationDays);
    }

    if (!khatmaPlan) {
        khatmaDailyProgress.textContent = '—';
        khatmaDailyFill.style.width = '0%';
        khatmaDailyTrack.setAttribute('aria-valuenow', '0');
        khatmaDailyHint.textContent = 'ابدأ خطة لمعرفة عدد الصفحات المطلوبة اليوم.';
        khatmaOverallProgress.textContent = '—';
        khatmaOverallFill.style.width = '0%';
        khatmaOverallTrack.setAttribute('aria-valuenow', '0');
        khatmaOverallHint.textContent = 'تبدأ الخطة من الصفحة التي تقرؤها الآن.';
        khatmaStatus.textContent = 'الصفحات التي تفتحها تُحسب مرة واحدة ضمن تقدم الخطة.';
        return;
    }

    const totalPages = PAGE_COUNT - khatmaPlan.startPage + 1;
    const readPages = getPagesForDate(khatmaPlan.readPages);
    const today = localDateKey();
    const todayPages = getPagesForDate(khatmaPlan.dailyReads[today]);
    const daysLeft = Math.max(1, dateKeyOrdinal(khatmaPlan.targetDate) - dateKeyOrdinal(today) + 1);
    const pagesReadBeforeToday = Math.max(0, readPages.length - todayPages.length);
    const pagesAtStartOfToday = Math.max(0, totalPages - pagesReadBeforeToday);
    const dailyGoal = readPages.length >= totalPages ? 0 : Math.ceil(pagesAtStartOfToday / daysLeft);
    const dailyPercent = dailyGoal === 0 ? 100 : Math.min(100, (todayPages.length / dailyGoal) * 100);
    const overallPercent = Math.min(100, (readPages.length / totalPages) * 100);
    const remainingPages = Math.max(0, totalPages - readPages.length);

    khatmaDailyProgress.textContent = `${toArabicNumber(todayPages.length)} / ${toArabicNumber(dailyGoal)} صفحة`;
    khatmaDailyFill.style.width = `${dailyPercent}%`;
    khatmaDailyTrack.setAttribute('aria-valuenow', String(Math.round(dailyPercent)));
    khatmaDailyHint.textContent = dailyGoal === 0
        ? 'أتممت الختمة، تقبّل الله منك.'
        : todayPages.length >= dailyGoal
            ? 'أتممت ورد اليوم، تقبّل الله منك.'
            : `باقي ${toArabicNumber(Math.max(0, dailyGoal - todayPages.length))} صفحة من ورد اليوم.`;

    khatmaOverallProgress.textContent = `${toArabicNumber(readPages.length)} / ${toArabicNumber(totalPages)} صفحة`;
    khatmaOverallFill.style.width = `${overallPercent}%`;
    khatmaOverallTrack.setAttribute('aria-valuenow', String(Math.round(overallPercent)));
    khatmaOverallHint.textContent = remainingPages === 0
        ? 'اكتملت صفحات الخطة.'
        : `باقي ${toArabicNumber(remainingPages)} صفحة • ${toArabicNumber(daysLeft)} يوم حتى موعد الختمة.`;
    khatmaStatus.textContent = `الخطة تبدأ من صفحة ${toArabicNumber(khatmaPlan.startPage)} • موعد الختمة ${khatmaPlan.targetDate.split('-').reverse().map(toArabicNumber).join('/')}.`;
}

function saveKhatmaPlan() {
    try {
        localStorage.setItem(KHATMA_PLAN_KEY, JSON.stringify(khatmaPlan));
        return true;
    } catch (error) {
        return false;
    }
}

function recordKhatmaPage(pageNumber) {
    if (!khatmaPlan || pageNumber < khatmaPlan.startPage || pageNumber > PAGE_COUNT) return;
    const today = localDateKey();
    const readPages = new Set(getPagesForDate(khatmaPlan.readPages));
    readPages.add(pageNumber);
    const dailyReads = { ...khatmaPlan.dailyReads };
    const todayPages = new Set(getPagesForDate(dailyReads[today]));
    todayPages.add(pageNumber);
    dailyReads[today] = [...todayPages];

    const cutoff = dateKeyOrdinal(today) - 30;
    Object.keys(dailyReads).forEach(dateKey => {
        if (dateKeyOrdinal(dateKey) < cutoff) delete dailyReads[dateKey];
    });

    khatmaPlan = { ...khatmaPlan, readPages: [...readPages], dailyReads };
    const saved = saveKhatmaPlan();
    renderKhatma();
    if (!saved) khatmaStatus.textContent = 'تعذّر حفظ تقدم الخطة على هذا الجهاز.';
}

function startKhatmaPlan(durationDays) {
    const today = localDateKey();
    khatmaPlan = {
        startDate: today,
        targetDate: addDaysToDateKey(today, durationDays - 1),
        durationDays,
        startPage: currentPage,
        readPages: [currentPage],
        dailyReads: { [today]: [currentPage] }
    };
    const saved = saveKhatmaPlan();
    renderKhatma();
    if (!saved) khatmaStatus.textContent = 'تعذّر حفظ الخطة على هذا الجهاز.';
}

function isDailySurahPlanActive(today = localDateKey()) {
    if (!dailySurahPlan) return false;
    const todayOrdinal = dateKeyOrdinal(today);
    return todayOrdinal >= dateKeyOrdinal(dailySurahPlan.startDate)
        && todayOrdinal <= dateKeyOrdinal(dailySurahPlan.targetDate);
}

function saveDailySurahPlan() {
    try {
        localStorage.setItem(DAILY_SURAH_PLAN_KEY, JSON.stringify(dailySurahPlan));
        return true;
    } catch (error) {
        return false;
    }
}

function renderDailySurah() {
    const today = localDateKey();
    const active = isDailySurahPlanActive(today);
    const completedToday = Boolean(active && dailySurahPlan.completedByDate[today]);
    const selectedSurahNumber = dailySurahPlan?.selectedSurahNumber || Number(dailySurahSelect.value);
    const selectedSurah = surahByNumber.get(Number(selectedSurahNumber));
    const completedDays = dailySurahPlan
        ? Object.keys(dailySurahPlan.completedByDate).filter(dateKey => {
            const ordinal = dateKeyOrdinal(dateKey);
            return ordinal >= dateKeyOrdinal(dailySurahPlan.startDate) && ordinal <= dateKeyOrdinal(dailySurahPlan.targetDate);
        }).length
        : 0;

    if (dailySurahPlan && document.activeElement !== dailySurahSelect) {
        dailySurahSelect.value = String(dailySurahPlan.selectedSurahNumber);
    }
    if (dailySurahPlan?.durationDays && document.activeElement !== dailySurahDurationInput) {
        dailySurahDurationInput.value = String(dailySurahPlan.durationDays);
    }
    dailySurahStartButton.textContent = active ? 'إعادة بدء الخطة' : dailySurahPlan ? 'ابدأ خطة جديدة' : 'ابدأ الخطة';
    dailySurahSelect.disabled = !surahCatalog.length || completedToday;
    dailySurahDurationInput.disabled = false;
    dailySurahProgress.textContent = dailySurahPlan
        ? `${toArabicNumber(completedDays)} / ${toArabicNumber(dailySurahPlan.durationDays)} يوم`
        : '—';
    const percent = dailySurahPlan ? Math.min(100, (completedDays / dailySurahPlan.durationDays) * 100) : 0;
    dailySurahFill.style.width = `${percent}%`;
    dailySurahTrack.setAttribute('aria-valuenow', String(Math.round(percent)));

    if (!dailySurahPlan) {
        dailySurahHint.textContent = 'اختر سورة ومدة الخطة للبدء.';
        dailySurahStatus.textContent = 'يُحفظ تقدم الخطة على هذا الجهاز.';
    } else if (!active) {
        dailySurahHint.textContent = `انتهت مدة الخطة: أتممت ${toArabicNumber(completedDays)} من ${toArabicNumber(dailySurahPlan.durationDays)} يوم.`;
        dailySurahStatus.textContent = 'يمكنك بدء خطة جديدة في أي وقت.';
    } else if (completedToday) {
        const completedSurah = surahByNumber.get(Number(dailySurahPlan.completedByDate[today]));
        dailySurahHint.textContent = `أتممت سورة ${completedSurah?.name || ''} اليوم، تقبّل الله منك.`;
        dailySurahStatus.textContent = `اليوم ${toArabicNumber(dateKeyOrdinal(today) - dateKeyOrdinal(dailySurahPlan.startDate) + 1)} من ${toArabicNumber(dailySurahPlan.durationDays)} • تم تسجيل سورة واحدة لهذا اليوم.`;
    } else {
        dailySurahHint.textContent = selectedSurah
            ? `سورة اليوم: ${selectedSurah.name}. بعد قراءتها سجّل إنجازك.`
            : 'اختر سورة اليوم من القائمة.';
        const remainingDays = Math.max(0, dateKeyOrdinal(dailySurahPlan.targetDate) - dateKeyOrdinal(today) + 1);
        dailySurahStatus.textContent = `باقي ${toArabicNumber(remainingDays)} يوم في الخطة • سجّل سورة واحدة فقط لكل يوم.`;
    }

    readDailySurahButton.disabled = !active || !selectedSurahNumber || isLoading;
    completeDailySurahButton.disabled = !active || !selectedSurahNumber || completedToday;
    completeDailySurahButton.textContent = completedToday ? 'تم إنجاز سورة اليوم' : 'سجّلت إتمام السورة';
}

function startDailySurahPlan(durationDays, surahNumber) {
    const today = localDateKey();
    dailySurahPlan = {
        startDate: today,
        targetDate: addDaysToDateKey(today, durationDays - 1),
        durationDays,
        selectedSurahNumber: surahNumber,
        completedByDate: {}
    };
    const saved = saveDailySurahPlan();
    renderDailySurah();
    if (!saved) dailySurahStatus.textContent = 'تعذّر حفظ الخطة على هذا الجهاز.';
}

function completeDailySurah() {
    const today = localDateKey();
    if (!isDailySurahPlanActive(today)) return;
    if (dailySurahPlan.completedByDate[today]) {
        renderDailySurah();
        return;
    }
    const surahNumber = Number(dailySurahSelect.value);
    if (!Number.isInteger(surahNumber) || !surahByNumber.has(surahNumber)) {
        dailySurahStatus.textContent = 'اختر سورة اليوم أولًا.';
        dailySurahSelect.focus();
        return;
    }
    dailySurahPlan = {
        ...dailySurahPlan,
        selectedSurahNumber: surahNumber,
        completedByDate: { ...dailySurahPlan.completedByDate, [today]: surahNumber }
    };
    const saved = saveDailySurahPlan();
    renderDailySurah();
    if (!saved) dailySurahStatus.textContent = 'تعذّر حفظ إنجاز اليوم على هذا الجهاز.';
}

function toArabicNumber(value) {
    return new Intl.NumberFormat('ar-EG').format(value);
}

function updatePageControls() {
    pageInput.value = String(currentPage);
    pageHeaderNumber.textContent = toArabicNumber(currentPage);
    pageFooterNumber.textContent = toArabicNumber(currentPage);
}

function appendSurahHeading(container, surah) {
    const heading = document.createElement('h2');
    heading.className = 'surah-heading';
    heading.textContent = surah.name || `سورة ${surah.number}`;
    container.append(heading);

    if (surah.number !== 1 && surah.number !== 9) {
        const basmala = document.createElement('p');
        basmala.className = 'basmala';
        basmala.textContent = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
        container.append(basmala);
    }
}

function formatPageLocations(ayahs, getLocation) {
    const locations = [...new Set(ayahs
        .map(getLocation)
        .map(Number)
        .filter(value => Number.isInteger(value) && value > 0))];
    return locations.length ? locations.map(toArabicNumber).join('، ') : '—';
}

function removeOpeningBasmala(text) {
    const withoutBom = String(text || '').replace(/^\uFEFF/u, '');
    const opening = withoutBom.match(/^(\s*\S+\s+\S+\s+\S+\s+\S+)/u);
    if (!opening) return text;

    const normalize = value => value
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu, '')
        .replace(/[ٱأإآ]/gu, 'ا')
        .replace(/ـ/gu, '')
        .replace(/\s+/gu, ' ')
        .trim();
    if (normalize(opening[1]) !== 'بسم الله الرحمن الرحيم') return text;
    return withoutBom.slice(opening[1].length).trimStart();
}

function appendQuranWords(container, text, compact = false) {
    if (compact) {
        let plainText = '';
        String(text || '').split(/(\s+)/u).forEach(part => {
            if (!part) return;
            if (/^\s+$/u.test(part)) {
                plainText += part;
                return;
            }
            if (!part.includes('\u06DF')) {
                plainText += part.replace(/[\u06E2\u06ED]/gu, '');
                return;
            }
            if (plainText) {
                container.append(document.createTextNode(plainText));
                plainText = '';
            }
            const word = document.createElement('span');
            word.className = 'quran-word quran-word--round-zero';
            word.textContent = part.replace(/[\u06E2\u06ED]/gu, '');
            container.append(word);
        });
        if (plainText) container.append(document.createTextNode(plainText));
        return;
    }

    String(text || '').split(/(\s+)/u).forEach(part => {
        if (!part) return;
        if (/^\s+$/u.test(part)) {
            container.append(document.createTextNode(part));
            return;
        }

        const word = document.createElement('span');
        word.className = 'quran-word';
        if (part.includes('\u06DF')) word.classList.add('quran-word--round-zero');
        // Keep the source Quran text intact, but omit the two small-meem
        // annotation glyphs that this display font renders as hollow circles.
        word.textContent = part.replace(/[\u06E2\u06ED]/gu, '');
        container.append(word);
    });
}

function appendQuranText(container, text, compact = false) {
    // Keep vowel/combining marks attached to their letters. Only isolate the
    // seven standalone waqf signs when whitespace on both sides proves they
    // are annotation signs, so their visual position can be tuned safely.
    const source = String(text || '');
    const signs = /[\u06D6-\u06DC]/gu;
    let lastIndex = 0;

    for (const match of source.matchAll(signs)) {
        const index = match.index;
        const hasSpaceBefore = index > 0 && /\s/u.test(source[index - 1]);
        const hasSpaceAfter = index + 1 < source.length && /\s/u.test(source[index + 1]);
        if (!hasSpaceBefore || !hasSpaceAfter) continue;

        if (index > lastIndex) appendQuranWords(container, source.slice(lastIndex, index), compact);
        const stopMark = document.createElement('span');
        stopMark.className = 'quran-stop-mark';
        stopMark.textContent = match[0];
        container.append(stopMark);
        lastIndex = index + match[0].length;
    }

    if (lastIndex < source.length) appendQuranWords(container, source.slice(lastIndex), compact);
}

function escapeMarkupText(text) {
    return String(text || '').replace(/[&<>"']/gu, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function formatCompactQuranText(text) {
    const source = String(text || '');
    const markup = [];
    const signs = /[\u06D6-\u06DC]/gu;
    let lastIndex = 0;
    const appendWords = value => markup.push(value.replace(/\S+/gu, word => {
        const escapedWord = escapeMarkupText(word.replace(/[\u06E2\u06ED]/gu, ''));
        return word.includes('\u06DF')
            ? `<span class="quran-word quran-word--round-zero">${escapedWord}</span>`
            : escapedWord;
    }));

    for (const match of source.matchAll(signs)) {
        const index = match.index;
        const hasSpaceBefore = index > 0 && /\s/u.test(source[index - 1]);
        const hasSpaceAfter = index + 1 < source.length && /\s/u.test(source[index + 1]);
        if (!hasSpaceBefore || !hasSpaceAfter) continue;
        appendWords(source.slice(lastIndex, index));
        markup.push(`<span class="quran-stop-mark">${match[0]}</span>`);
        lastIndex = index + match[0].length;
    }

    appendWords(source.slice(lastIndex));
    return markup.join('');
}

function renderFullSurahMarkup(ayahs) {
    const markup = [];
    let previousSurahNumber = null;
    ayahs.forEach(ayah => {
        const surahNumber = Number(ayah.surahNumber ?? ayah.surah?.number);
        const surah = ayah.surah || surahByNumber.get(surahNumber) || { number: surahNumber };
        if (surahNumber && surahNumber !== previousSurahNumber && Number(ayah.numberInSurah) === 1) {
            markup.push(`<h2 class="surah-heading">${escapeMarkupText(surah.name || `سورة ${surahNumber}`)}</h2>`);
            if (surahNumber !== 1 && surahNumber !== 9) {
                markup.push('<p class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>');
            }
        }

        const numberInSurah = Number(ayah.numberInSurah);
        const ayahNumber = toArabicNumber(numberInSurah);
        const hasSeparateBasmala = numberInSurah === 1 && surahNumber !== 1 && surahNumber !== 9;
        const ayahText = hasSeparateBasmala ? removeOpeningBasmala(ayah.text) : (ayah.text || '');
        const markerClass = numberInSurah >= 100
            ? 'ayah-marker ayah-marker--three-digit'
            : numberInSurah >= 10 ? 'ayah-marker ayah-marker--two-digit' : 'ayah-marker';
        const markerNumberClass = Math.floor(numberInSurah / 10) % 10 === 1
            ? 'ayah-marker-number ayah-marker-number--left-adjusted'
            : 'ayah-marker-number';
        markup.push(`<span class="quran-ayah">${formatCompactQuranText(ayahText)}<span class="${markerClass}" aria-label="الآية ${ayahNumber}"><span class="${markerNumberClass}">${ayahNumber}</span></span> </span>`);
        previousSurahNumber = surahNumber || previousSurahNumber;
    });
    return markup.join('');
}

function getFullSurahMarkup(surahNumber, ayahs) {
    const cachedMarkup = fullSurahMarkupCache.get(surahNumber);
    if (cachedMarkup) {
        fullSurahMarkupCache.delete(surahNumber);
        fullSurahMarkupCache.set(surahNumber, cachedMarkup);
        return cachedMarkup;
    }

    const markup = renderFullSurahMarkup(ayahs);
    fullSurahMarkupCache.set(surahNumber, markup);
    while (fullSurahMarkupCache.size > 2) {
        fullSurahMarkupCache.delete(fullSurahMarkupCache.keys().next().value);
    }
    return markup;
}

function prewarmNextSurahMarkup(surahNumber) {
    const nextSurahNumber = surahNumber + 1;
    if (nextSurahNumber > surahCatalog.length || fullSurahMarkupCache.has(nextSurahNumber)) return;

    const warmNextSurah = () => {
        if (!document.body.classList.contains('page-zoom-mode') || currentFullSurahNumber !== surahNumber) return;
        const ayahs = quranAyahsBySurah.get(nextSurahNumber);
        if (ayahs?.length) getFullSurahMarkup(nextSurahNumber, ayahs);
    };

    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warmNextSurah, { timeout: 500 });
    } else {
        window.setTimeout(warmNextSurah, 80);
    }
}

function renderPage(pageData, options = {}) {
    const compactWords = options.compactWords === true;
    const ayahs = Array.isArray(pageData?.ayahs) ? pageData.ayahs : [];
    if (ayahs.length === 0) throw new Error('No verses returned for this page.');

    if (compactWords) {
        pageJuzNumber.textContent = formatPageLocations(ayahs, ayah => ayah.juz);
        pageHizbNumber.textContent = formatPageLocations(ayahs, ayah => Math.ceil(Number(ayah.hizbQuarter) / 4));
        const firstSurahNumber = Number(ayahs[0]?.surahNumber ?? ayahs[0]?.surah?.number);
        const firstSurah = surahByNumber.get(firstSurahNumber) || ayahs[0]?.surah;
        if (Number.isInteger(firstSurahNumber) && firstSurah) {
            currentPageSurah.textContent = firstSurah.name || `سورة ${firstSurahNumber}`;
            surahSelect.value = String(firstSurahNumber);
        }
        pageContent.innerHTML = getFullSurahMarkup(firstSurahNumber, ayahs);
        surahHeader.textContent = firstSurah?.name || 'المصحف الشريف';
        return;
    }

    pageJuzNumber.textContent = formatPageLocations(ayahs, ayah => ayah.juz);
    pageHizbNumber.textContent = formatPageLocations(ayahs, ayah => Math.ceil(Number(ayah.hizbQuarter) / 4));

    const currentSurahNumber = Number(ayahs[0]?.surahNumber ?? ayahs[0]?.surah?.number);
    const currentSurah = surahByNumber.get(currentSurahNumber) || ayahs[0]?.surah;
    if (Number.isInteger(currentSurahNumber) && currentSurah) {
        currentPageSurah.textContent = currentSurah.name || `سورة ${currentSurahNumber}`;
        surahSelect.value = String(currentSurahNumber);
    }

    const renderedContent = document.createDocumentFragment();
    const seenSurahs = new Map();
    let previousSurahNumber = null;

    ayahs.forEach((ayah, index) => {
        const surahNumber = Number(ayah.surahNumber ?? ayah.surah?.number);
        const surah = ayah.surah || surahByNumber.get(surahNumber) || { number: surahNumber };
        if (surahNumber && !seenSurahs.has(surahNumber)) seenSurahs.set(surahNumber, surah.name || `سورة ${surahNumber}`);
        if (surahNumber && surahNumber !== previousSurahNumber && Number(ayah.numberInSurah) === 1) {
            appendSurahHeading(renderedContent, surah);
        }

        const verse = document.createElement('span');
        verse.className = 'quran-ayah';
        const isOpeningVerse = Number(ayah.numberInSurah) === 1;
        const hasSeparateBasmala = isOpeningVerse && surahNumber !== 1 && surahNumber !== 9;
        const ayahText = hasSeparateBasmala ? removeOpeningBasmala(ayah.text) : (ayah.text || '');
        appendQuranText(verse, ayahText);

        const marker = document.createElement('span');
        const numberInSurah = Number(ayah.numberInSurah);
        const ayahNumber = toArabicNumber(numberInSurah);
        marker.className = numberInSurah >= 100
            ? 'ayah-marker ayah-marker--three-digit'
            : numberInSurah >= 10 ? 'ayah-marker ayah-marker--two-digit' : 'ayah-marker';
        marker.setAttribute('aria-label', `الآية ${ayahNumber}`);
        const markerNumber = document.createElement('span');
        const tensDigit = Math.floor(numberInSurah / 10) % 10;
        markerNumber.className = tensDigit === 1
            ? 'ayah-marker-number ayah-marker-number--left-adjusted'
            : 'ayah-marker-number';
        markerNumber.textContent = ayahNumber;
        marker.append(markerNumber);
        verse.append(marker, document.createTextNode(' '));
        renderedContent.append(verse);

        previousSurahNumber = surahNumber || previousSurahNumber;
        if (index < ayahs.length - 1) renderedContent.append(document.createTextNode(' '));
    });

    pageContent.replaceChildren(renderedContent);
    const names = Array.from(seenSurahs.values());
    surahHeader.textContent = names.length ? names.join(' • ') : 'المصحف الشريف';
}

async function getPageData(pageNumber, forceRefresh = false) {
    if (!forceRefresh && pageCache.has(pageNumber)) return pageCache.get(pageNumber);
    const pages = await loadQuranData();
    const ayahs = pages?.[String(pageNumber)];
    if (!Array.isArray(ayahs) || ayahs.length === 0) throw new Error(`No offline Quran data for page ${pageNumber}.`);
    const pageData = { number: pageNumber, ayahs };
    pageCache.set(pageNumber, pageData);
    return pageData;
}

async function loadQuranData() {
    if (quranPages && surahCatalog.length) return quranPages;
    if (quranDataPromise) return quranDataPromise;
    surahSelect.disabled = true;
    surahJumpButton.disabled = true;
    surahSelect.replaceChildren(new Option('جارٍ تجهيز المصحف…', ''));
    quranDataPromise = Promise.resolve().then(() => {
        const payload = window.MUSHAF_OFFLINE_DATA;
        if (!Array.isArray(payload?.surahs) || !payload?.pages || Object.keys(payload.pages).length !== PAGE_COUNT) {
            throw new Error('Bundled Quran data is unavailable or incomplete.');
        }
        quranPages = payload.pages;
        surahCatalog = payload.surahs;
        surahByNumber = new Map(surahCatalog.map(surah => [Number(surah.number), surah]));
        quranAyahsBySurah = new Map();
        Object.values(quranPages).forEach(pageAyahs => pageAyahs.forEach(ayah => {
            const surahNumber = Number(ayah.surahNumber ?? ayah.surah?.number);
            if (!Number.isInteger(surahNumber)) return;
            if (!quranAyahsBySurah.has(surahNumber)) quranAyahsBySurah.set(surahNumber, []);
            quranAyahsBySurah.get(surahNumber).push(ayah);
        }));
        const options = [new Option('اختر سورة…', '')];
        surahCatalog.forEach(surah => {
            options.push(new Option(`${toArabicNumber(surah.number)}. ${surah.name}`, String(surah.number)));
        });
        surahSelect.replaceChildren(...options);
        dailySurahSelect.replaceChildren(...options.map(option => new Option(option.text, option.value)));
        dailySurahSelect.disabled = false;
        surahJumpButton.textContent = 'انتقال';
        renderDailySurah();
        return quranPages;
    });
    try {
        return await quranDataPromise;
    } catch (error) {
        console.error('Unable to load offline Quran data:', error);
        quranDataPromise = null;
        surahSelect.replaceChildren(new Option('تعذّر تجهيز المصحف', ''));
        dailySurahSelect.replaceChildren(new Option('تعذّر تجهيز المصحف', ''));
        dailySurahSelect.disabled = true;
        surahJumpButton.textContent = 'إعادة المحاولة';
        readerStatus.textContent = 'تعذّر تجهيز ملفات المصحف المخزنة على الجهاز.';
        throw error;
    } finally {
        surahSelect.disabled = false;
        surahJumpButton.disabled = false;
    }
}

function getSurahStartPage(surahNumber) {
    const surah = surahByNumber.get(surahNumber);
    const pageNumber = Number(surah?.page);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > PAGE_COUNT) {
        throw new Error('Surah starting page is unavailable.');
    }
    return pageNumber;
}

async function loadPage(pageNumber, forceRefresh = false, resetToPageStart = false) {
    if (isLoading) return;
    currentPage = Math.min(PAGE_COUNT, Math.max(1, Math.trunc(pageNumber)));
    isLoading = true;
    pagePaper.setAttribute('aria-busy', 'true');
    pagePaper.classList.add('is-loading');
    pageContent.hidden = true;
    pageError.hidden = true;
    pageLoading.hidden = false;
    readerStatus.textContent = `جارٍ تحميل الصفحة ${toArabicNumber(currentPage)}…`;
    updatePageControls();

    try {
        const pageData = await getPageData(currentPage, forceRefresh);
        renderPage(pageData);
        recordKhatmaPage(currentPage);
        pageLoading.hidden = true;
        pageContent.hidden = false;
        try { localStorage.setItem(LAST_PAGE_KEY, String(currentPage)); } catch (error) { /* Reading still works without saved progress. */ }
        savedPosition.hidden = false;
        savedPositionText.textContent = `آخر صفحة: ${toArabicNumber(currentPage)}`;
        readerStatus.textContent = `الصفحة ${toArabicNumber(currentPage)} من ${toArabicNumber(PAGE_COUNT)}`;
    } catch (error) {
        console.error('Unable to load Quran page:', error);
        pageLoading.hidden = true;
        pageError.hidden = false;
        readerStatus.textContent = 'تعذّر تحميل الصفحة.';
    } finally {
        isLoading = false;
        pagePaper.setAttribute('aria-busy', 'false');
        pagePaper.classList.remove('is-loading');
        updatePageControls();
        renderKhatma();
        renderDailySurah();
        if (document.body.classList.contains('page-zoom-mode') && pageError.hidden) {
            showSurahInZoom(getCurrentSurahNumber(), currentPage);
        }
        if (resetToPageStart && pageError.hidden) {
            window.requestAnimationFrame(() => {
                if (document.body.classList.contains('page-zoom-mode')) {
                    readingArea.scrollTop = 0;
                    readingArea.scrollLeft = 0;
                    document.body.classList.remove('zoom-controls-hidden');
                } else {
                    readingArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }
    }
}

function goToPage(pageNumber) {
    if (!Number.isFinite(pageNumber)) return;
    return loadPage(pageNumber, false, true);
}

function getCurrentSurahNumber() {
    const ayahs = pageCache.get(currentPage)?.ayahs || quranPages?.[String(currentPage)];
    return Number(ayahs?.[0]?.surahNumber ?? ayahs?.[0]?.surah?.number);
}

async function showSurahInZoom(surahNumber, returnPage = currentPage) {
    if (!document.body.classList.contains('page-zoom-mode') || isLoading) return;
    const renderToken = ++surahRenderToken;
    pageError.hidden = true;
    pagePaper.setAttribute('aria-busy', 'true');
    readerStatus.textContent = 'جارٍ تجهيز السورة كاملة…';

    try {
        await loadQuranData();
        if (renderToken !== surahRenderToken || !document.body.classList.contains('page-zoom-mode')) return;

        const resolvedSurahNumber = Number(surahNumber) || getCurrentSurahNumber();
        const ayahs = quranAyahsBySurah.get(resolvedSurahNumber);
        const surah = surahByNumber.get(resolvedSurahNumber);
        if (!ayahs?.length || !surah) throw new Error('Surah data is unavailable.');

        const restoredPage = Math.min(PAGE_COUNT, Math.max(1, Math.trunc(Number(returnPage) || currentPage)));
        surahPageReturnPage = restoredPage;
        currentPage = restoredPage;
        updatePageControls();
        try { localStorage.setItem(LAST_PAGE_KEY, String(currentPage)); } catch (error) { /* Reading still works without saved progress. */ }
        document.body.classList.add('full-surah-view');
        currentFullSurahNumber = resolvedSurahNumber;
        isFullSurahView = true;
        readingArea.scrollTop = 0;
        readingArea.scrollLeft = 0;
        renderPage({ ayahs }, { compactWords: true });
        pageLoading.hidden = true;
        pageContent.hidden = false;
        pagePaper.setAttribute('aria-busy', 'false');
        readerStatus.textContent = `تقرأ الآن ${surah.name} كاملة. اسحب يمينًا أو يسارًا للتنقل بين السور.`;
        prewarmNextSurahMarkup(resolvedSurahNumber);
    } catch (error) {
        console.error('Unable to show full surah:', error);
        pageLoading.hidden = true;
        pageContent.hidden = false;
        pagePaper.setAttribute('aria-busy', 'false');
        readerStatus.textContent = 'تعذّر تجهيز السورة كاملة.';
    }
}

function showPageByPageView() {
    const hadFullSurahView = isFullSurahView || document.body.classList.contains('full-surah-view');
    const needsPageRestore = hadFullSurahView || pageContent.hidden;
    ++surahRenderToken;
    isFullSurahView = false;
    currentFullSurahNumber = null;
    document.body.classList.remove('full-surah-view');
    if (!needsPageRestore) return;
    pageLoading.lastElementChild.textContent = 'جارٍ تجهيز الصفحة…';
    const restoredPage = Math.min(PAGE_COUNT, Math.max(1, Math.trunc(Number(surahPageReturnPage) || currentPage)));
    surahPageReturnPage = null;
    currentPage = restoredPage;
    updatePageControls();
    const pageData = pageCache.get(restoredPage)?.ayahs || quranPages?.[String(restoredPage)];
    if (Array.isArray(pageData) && pageData.length) {
        renderPage({ ayahs: pageData });
        pageLoading.hidden = true;
        pageContent.hidden = false;
        pageError.hidden = true;
        pagePaper.setAttribute('aria-busy', 'false');
        pagePaper.classList.remove('is-loading');
        readerStatus.textContent = `الصفحة ${toArabicNumber(currentPage)} من ${toArabicNumber(PAGE_COUNT)}`;
        try { localStorage.setItem(LAST_PAGE_KEY, String(currentPage)); } catch (error) { /* Reading still works without persistence. */ }
        return;
    }
    pageLoading.lastElementChild.textContent = 'جارٍ تجهيز الصفحة…';
    loadPage(restoredPage, false, true);
}

function navigateReadingView(direction) {
    if (isFullSurahView && currentFullSurahNumber !== null) {
        const nextSurahNumber = currentFullSurahNumber + direction;
        if (nextSurahNumber < 1 || nextSurahNumber > surahCatalog.length) {
            readerStatus.textContent = 'وصلت إلى نهاية سور المصحف في هذا الاتجاه.';
            return;
        }
        showSurahInZoom(nextSurahNumber, getSurahStartPage(nextSurahNumber));
        return;
    }
    goToPage(currentPage + direction);
}

document.getElementById('retryPageButton').addEventListener('click', () => loadPage(currentPage, true));
document.getElementById('pageJumpForm').addEventListener('submit', event => {
    event.preventDefault();
    const pageNumber = Number.parseInt(pageInput.value, 10);
    if (!Number.isFinite(pageNumber)) {
        readerStatus.textContent = 'أدخل رقم صفحة من ١ إلى ٦٠٤.';
        pageInput.focus();
        return;
    }
    if (pageNumber < 1 || pageNumber > PAGE_COUNT) {
        readerStatus.textContent = 'رقم الصفحة يجب أن يكون بين ١ و٦٠٤.';
        pageInput.focus();
        return;
    }
    goToPage(pageNumber);
});

document.getElementById('surahJumpForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!surahCatalog.length) {
        const pages = await loadQuranData().catch(() => null);
        if (!pages) return;
        readerStatus.textContent = 'اختر السورة من القائمة ثم اضغط انتقال.';
        return;
    }
    const surahNumber = Number.parseInt(surahSelect.value, 10);
    if (!Number.isInteger(surahNumber)) {
        readerStatus.textContent = 'اختر سورة أولًا للانتقال إليها.';
        surahSelect.focus();
        return;
    }
    if (isLoading) {
        readerStatus.textContent = 'انتظر حتى يكتمل تحميل الصفحة الحالية.';
        return;
    }

    surahJumpButton.disabled = true;
    readerStatus.textContent = 'جارٍ تحديد صفحة السورة…';
    try {
        const pageNumber = getSurahStartPage(surahNumber);
        goToPage(pageNumber);
    } catch (error) {
        console.error('Unable to open selected surah:', error);
        readerStatus.textContent = 'تعذّر تحديد صفحة السورة من بيانات المصحف المخزنة.';
    } finally {
        surahJumpButton.disabled = false;
    }
});

khatmaForm.addEventListener('submit', event => {
    event.preventDefault();
    if (isLoading || !pageError.hidden) {
        khatmaStatus.textContent = 'انتظر حتى تُحمّل صفحة المصحف بنجاح قبل بدء الخطة.';
        return;
    }
    const durationDays = Number.parseInt(khatmaDurationInput.value, 10);
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > PAGE_COUNT) {
        khatmaStatus.textContent = 'اختر مدة بين يوم واحد و٦٠٤ أيام.';
        khatmaDurationInput.focus();
        return;
    }
    startKhatmaPlan(durationDays);
});

dailySurahForm.addEventListener('submit', event => {
    event.preventDefault();
    const durationDays = Number.parseInt(dailySurahDurationInput.value, 10);
    const surahNumber = Number.parseInt(dailySurahSelect.value, 10);
    if (!surahByNumber.has(surahNumber)) {
        dailySurahStatus.textContent = 'اختر سورة من القائمة أولًا.';
        dailySurahSelect.focus();
        return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) {
        dailySurahStatus.textContent = 'اختر مدة بين يوم واحد و٣٦٥٠ يومًا.';
        dailySurahDurationInput.focus();
        return;
    }
    startDailySurahPlan(durationDays, surahNumber);
});

dailySurahSelect.addEventListener('change', () => {
    const today = localDateKey();
    const surahNumber = Number(dailySurahSelect.value);
    if (dailySurahPlan && isDailySurahPlanActive(today) && !dailySurahPlan.completedByDate[today]
        && Number.isInteger(surahNumber) && surahByNumber.has(surahNumber)) {
        dailySurahPlan = { ...dailySurahPlan, selectedSurahNumber: surahNumber };
        const saved = saveDailySurahPlan();
        renderDailySurah();
        if (!saved) dailySurahStatus.textContent = 'تعذّر حفظ اختيار سورة اليوم على هذا الجهاز.';
    }
});

readDailySurahButton.addEventListener('click', () => {
    const surahNumber = Number(dailySurahSelect.value || dailySurahPlan?.selectedSurahNumber);
    if (!isDailySurahPlanActive() || !surahByNumber.has(surahNumber)) return;
    try {
        goToPage(getSurahStartPage(surahNumber));
    } catch (error) {
        dailySurahStatus.textContent = 'تعذّر تحديد صفحة السورة من بيانات المصحف المخزنة.';
    }
});

completeDailySurahButton.addEventListener('click', completeDailySurah);

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderDailySurah();
});

continueReadingButton.addEventListener('click', () => {
    readingArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    readerStatus.textContent = `تابع القراءة من الصفحة ${toArabicNumber(currentPage)}.`;
});

readerPlansToggle.addEventListener('click', () => {
    const isOpen = readerPlansToggle.getAttribute('aria-expanded') === 'true';
    readerPlans.hidden = isOpen;
    readerPlansToggle.setAttribute('aria-expanded', String(!isOpen));
    const label = isOpen
        ? 'إظهار متابع الختمة وختم سورة كل يوم'
        : 'إخفاء متابع الختمة وختم سورة كل يوم';
    readerPlansToggle.setAttribute('aria-label', label);
    readerPlansToggle.title = label;
});

document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateReadingView(1);
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateReadingView(-1);
    }
});

let touchStart = null;
pagePaper.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
});
pagePaper.addEventListener('pointerup', event => {
    if (!touchStart || event.pointerType !== 'touch') return;
    const deltaX = event.clientX - touchStart.x;
    const deltaY = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    if (deltaX > 0) navigateReadingView(1);
    else navigateReadingView(-1);
});
pagePaper.addEventListener('pointercancel', () => { touchStart = null; });

updatePageControls();
setMushafTheme(document.documentElement.dataset.theme, false);
renderKhatma();
loadQuranData().catch(() => {});
loadPage(currentPage);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
