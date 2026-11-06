const PAGE_COUNT = 604;
const PAGE_API = 'https://api.alquran.cloud/v1/page';
const LAST_PAGE_KEY = 'mushafLastPage';
const pageCache = new Map();

const pagePaper = document.getElementById('pagePaper');
const pageContent = document.getElementById('pageContent');
const pageLoading = document.getElementById('pageLoading');
const pageError = document.getElementById('pageError');
const previousButton = document.getElementById('previousPageButton');
const nextButton = document.getElementById('nextPageButton');
const pageInput = document.getElementById('pageNumberInput');
const pageCounter = document.getElementById('pageCounter');
const pageHeaderNumber = document.getElementById('pageHeaderNumber');
const pageFooterNumber = document.getElementById('pageFooterNumber');
const progressTrack = document.querySelector('.progress-track');
const progressFill = document.getElementById('progressFill');
const readerStatus = document.getElementById('readerStatus');
const savedPosition = document.getElementById('savedPosition');
const savedPositionText = document.getElementById('savedPositionText');
const surahHeader = document.getElementById('surahHeader');

let currentPage = readLastPage();
let isLoading = false;

function readLastPage() {
    try {
        const storedPage = Number.parseInt(localStorage.getItem(LAST_PAGE_KEY) || '1', 10);
        return Number.isFinite(storedPage) ? Math.min(PAGE_COUNT, Math.max(1, storedPage)) : 1;
    } catch (error) {
        return 1;
    }
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

    pageContent.replaceChildren();
    const seenSurahs = new Map();
    let previousSurahNumber = null;

    ayahs.forEach((ayah, index) => {
        const surah = ayah.surah || {};
        const surahNumber = Number(surah.number);
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

    const response = await fetch(`${PAGE_API}/${pageNumber}/quran-uthmani`);
    if (!response.ok) throw new Error(`Page request failed (${response.status}).`);
    const payload = await response.json();
    if (payload.code !== 200 || !payload.data) throw new Error('Unexpected Quran page response.');
    pageCache.set(pageNumber, payload.data);
    return payload.data;
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

document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
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
    if (deltaX < 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
});
pagePaper.addEventListener('pointercancel', () => { touchStart = null; });

updatePageControls();
loadPage(currentPage);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
