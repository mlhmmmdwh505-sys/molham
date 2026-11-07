const PAGE_COUNT = 604;
const LAST_PAGE_KEY = 'mushafLastPage';
const KHATMA_PLAN_KEY = 'mushafKhatmaPlan';
const pageCache = new Map();

const pagePaper = document.getElementById('pagePaper');
const pageContent = document.getElementById('pageContent');
const pageLoading = document.getElementById('pageLoading');
const pageError = document.getElementById('pageError');
const previousButton = document.getElementById('previousPageButton');
const nextButton = document.getElementById('nextPageButton');
const pageInput = document.getElementById('pageNumberInput');
const surahSelect = document.getElementById('surahSelect');
const surahJumpButton = document.getElementById('surahJumpButton');
const pageCounter = document.getElementById('pageCounter');
const pageHeaderNumber = document.getElementById('pageHeaderNumber');
const pageFooterNumber = document.getElementById('pageFooterNumber');
const pageJuzNumber = document.getElementById('pageJuzNumber');
const pageHizbNumber = document.getElementById('pageHizbNumber');
const progressTrack = document.querySelector('.progress-track');
const progressFill = document.getElementById('progressFill');
const readerStatus = document.getElementById('readerStatus');
const savedPosition = document.getElementById('savedPosition');
const savedPositionText = document.getElementById('savedPositionText');
const surahHeader = document.getElementById('surahHeader');
const themeToggle = document.getElementById('readerThemeToggle');
const pageZoomToggle = document.getElementById('pageZoomToggle');
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

let currentPage = readLastPage();
let isLoading = false;
let surahCatalog = [];
let surahByNumber = new Map();
let quranPages = null;
let quranDataPromise = null;
let khatmaPlan = readKhatmaPlan();

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

function setPageZoomMode(enabled) {
    const wasEnabled = document.body.classList.contains('page-zoom-mode');
    if (wasEnabled === enabled) return;

    pagePaper.getAnimations().forEach(animation => animation.cancel());
    const fromRect = pagePaper.getBoundingClientRect();
    document.body.classList.toggle('page-zoom-mode', enabled);
    const toRect = pagePaper.getBoundingClientRect();
    pageZoomToggle.setAttribute('aria-pressed', String(enabled));
    const label = enabled ? 'إغلاق تكبير صفحة المصحف' : 'تكبير صفحة المصحف';
    pageZoomToggle.setAttribute('aria-label', label);
    pageZoomToggle.title = label;

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && toRect.width && toRect.height) {
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

function toArabicNumber(value) {
    return new Intl.NumberFormat('ar-EG').format(value);
}

function updatePageControls() {
    previousButton.disabled = isLoading || currentPage <= 1;
    nextButton.disabled = isLoading || currentPage >= PAGE_COUNT;
    pageInput.value = String(currentPage);
    pageCounter.textContent = `${toArabicNumber(currentPage)} / ${toArabicNumber(PAGE_COUNT)}`;
    pageHeaderNumber.textContent = toArabicNumber(currentPage);
    pageFooterNumber.textContent = toArabicNumber(currentPage);
    progressTrack.setAttribute('aria-valuenow', String(currentPage));
    progressFill.style.width = `${(currentPage / PAGE_COUNT) * 100}%`;
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

function renderPage(pageData) {
    const ayahs = Array.isArray(pageData?.ayahs) ? pageData.ayahs : [];
    if (ayahs.length === 0) throw new Error('No verses returned for this page.');

    pageJuzNumber.textContent = formatPageLocations(ayahs, ayah => ayah.juz);
    pageHizbNumber.textContent = formatPageLocations(ayahs, ayah => Math.ceil(Number(ayah.hizbQuarter) / 4));

    pageContent.replaceChildren();
    const seenSurahs = new Map();
    let previousSurahNumber = null;

    ayahs.forEach((ayah, index) => {
        const surahNumber = Number(ayah.surahNumber ?? ayah.surah?.number);
        const surah = ayah.surah || surahByNumber.get(surahNumber) || { number: surahNumber };
        if (surahNumber && !seenSurahs.has(surahNumber)) seenSurahs.set(surahNumber, surah.name || `سورة ${surahNumber}`);
        if (surahNumber && surahNumber !== previousSurahNumber && Number(ayah.numberInSurah) === 1) {
            appendSurahHeading(pageContent, surah);
        }

        const verse = document.createElement('span');
        verse.className = 'quran-ayah';
        const isOpeningVerse = Number(ayah.numberInSurah) === 1;
        const hasSeparateBasmala = isOpeningVerse && surahNumber !== 1 && surahNumber !== 9;
        verse.textContent = hasSeparateBasmala ? removeOpeningBasmala(ayah.text) : (ayah.text || '');

        const marker = document.createElement('span');
        marker.className = 'ayah-marker';
        marker.setAttribute('aria-label', `الآية ${toArabicNumber(ayah.numberInSurah)}`);
        marker.textContent = toArabicNumber(ayah.numberInSurah);
        verse.append(marker, document.createTextNode(' '));
        pageContent.append(verse);

        previousSurahNumber = surahNumber || previousSurahNumber;
        if (index < ayahs.length - 1) pageContent.append(document.createTextNode(' '));
    });

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
        const options = [new Option('اختر سورة…', '')];
        surahCatalog.forEach(surah => {
            options.push(new Option(`${toArabicNumber(surah.number)}. ${surah.name}`, String(surah.number)));
        });
        surahSelect.replaceChildren(...options);
        surahJumpButton.textContent = 'انتقال';
        return quranPages;
    });
    try {
        return await quranDataPromise;
    } catch (error) {
        console.error('Unable to load offline Quran data:', error);
        quranDataPromise = null;
        surahSelect.replaceChildren(new Option('تعذّر تجهيز المصحف', ''));
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

async function loadPage(pageNumber, forceRefresh = false) {
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
    }
}

function goToPage(pageNumber) {
    if (!Number.isFinite(pageNumber)) return;
    loadPage(pageNumber);
}

document.getElementById('previousPageButton').addEventListener('click', () => goToPage(currentPage - 1));
document.getElementById('nextPageButton').addEventListener('click', () => goToPage(currentPage + 1));
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

continueReadingButton.addEventListener('click', () => {
    readingArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    readerStatus.textContent = `تابع القراءة من الصفحة ${toArabicNumber(currentPage)}.`;
});

document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowLeft') goToPage(currentPage + 1);
    if (event.key === 'ArrowRight') goToPage(currentPage - 1);
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
    if (deltaX > 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
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
