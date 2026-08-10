/* Molham Dashboard workspace: planning, notes and study insights. */
(function () {
    const $ = (selector) => document.querySelector(selector);
    const read = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    };
    const write = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
        if (typeof window.queueCloudSave === 'function') window.queueCloudSave();
    };
    const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
    const getTasks = () => read('surgeonTasks', []);
    const getFocusLog = () => read('focusLog', {});
    const getStudyDays = () => read('studyDays', []);

    function calculateStreak() {
        const days = new Set(getStudyDays());
        let cursor = new Date(); let streak = 0;
        while (days.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
        return streak;
    }

    function renderStats() {
        const tasks = getTasks();
        const complete = tasks.filter(task => task.done).length;
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);
        const focusSeconds = Object.entries(getFocusLog()).reduce((total, [date, seconds]) => date >= dayKey(weekStart) ? total + Number(seconds || 0) : total, 0);
        $('#completedTasksStat').textContent = `${complete} / ${tasks.length}`;
        $('#focusHoursStat').textContent = focusSeconds >= 3600 ? `${(focusSeconds / 3600).toFixed(1)} س` : `${Math.floor(focusSeconds / 60)} د`;
        $('#streakStat').textContent = `${calculateStreak()} أيام`;
        $('#pointsStat').textContent = localStorage.getItem('userPoints') || '0';
    }

    function renderPlan() {
        const list = $('#studyPlanList'); const plans = read('studyPlan', []);
        if (!plans.length) { list.innerHTML = '<li class="empty-state">لم تضف خطة بعد. ابدأ بأصغر خطوة اليوم.</li>'; return; }
        const labels = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
        list.innerHTML = plans.map((plan, index) => `<li class="plan-item ${plan.done ? 'is-done' : ''}"><button type="button" class="plan-check" data-plan-toggle="${index}" aria-label="تحديد المهمة">${plan.done ? '✓' : ''}</button><div class="plan-text"><strong>${escapeHTML(plan.title)}</strong><span>${escapeHTML(plan.subject || 'مذاكرة عامة')}</span></div><span class="priority priority-${plan.priority}">${labels[plan.priority] || labels.medium}</span><button type="button" class="plan-delete" data-plan-delete="${index}" aria-label="حذف المهمة">×</button></li>`).join('');
    }

    function addPlan() {
        const title = $('#planTitle').value.trim();
        if (!title) { $('#planTitle').focus(); return; }
        const plans = read('studyPlan', []);
        plans.unshift({ title, subject: $('#planSubject').value.trim(), priority: $('#planPriority').value, done: false, createdAt: Date.now() });
        write('studyPlan', plans); $('#planTitle').value = ''; $('#planSubject').value = ''; renderPlan();
    }

    function renderWeek() {
        const week = $('#studyWeek'); const today = new Date(); const days = getStudyDays();
        const names = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; const labels = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        week.innerHTML = Array.from({ length: 7 }, (_, offset) => { const date = new Date(today); date.setDate(today.getDate() - 6 + offset); const key = dayKey(date); const index = date.getDay(); const active = days.includes(key); return `<button type="button" class="study-day ${active ? 'is-active' : ''}" data-study-day="${key}" aria-pressed="${active}"><span>${names[index]}</span><small>${date.getDate()}</small><b>${labels[index]}</b></button>`; }).join('');
    }

    function recordFocusSession(seconds) {
        if (!seconds || seconds < 1) return;
        const focusLog = getFocusLog(); const today = dayKey();
        focusLog[today] = Number(focusLog[today] || 0) + seconds; write('focusLog', focusLog);
        const days = getStudyDays(); if (!days.includes(today)) write('studyDays', [...days, today]);
        renderWeek(); renderStats();
    }

    function bindFocusTimer() {
        const originalToggle = window.toggleTimer;
        if (typeof originalToggle !== 'function') return;
        let startedAt = null; let expectedEnd = null;
        const finish = () => { if (expectedEnd) clearTimeout(expectedEnd); expectedEnd = null; if (startedAt) { recordFocusSession(Math.round((Date.now() - startedAt) / 1000)); startedAt = null; } };
        window.toggleTimer = function () {
            const isBreak = /استراحة|break/i.test($('#startBtn').textContent);
            if (startedAt) { finish(); return originalToggle.apply(this, arguments); }
            const display = $('#pomoDisplay').textContent.split(':').map(Number);
            originalToggle.apply(this, arguments);
            if (!isBreak) { startedAt = Date.now(); expectedEnd = setTimeout(finish, ((display[0] * 60 + display[1]) * 1000) + 1200); }
        };
    }

    function bindEvents() {
        $('#addPlanButton').addEventListener('click', addPlan);
        $('#planTitle').addEventListener('keydown', event => { if (event.key === 'Enter') addPlan(); });
        $('#studyPlanList').addEventListener('click', event => {
            const toggle = event.target.closest('[data-plan-toggle]'); const remove = event.target.closest('[data-plan-delete]'); const plans = read('studyPlan', []);
            if (toggle) plans[Number(toggle.dataset.planToggle)].done = !plans[Number(toggle.dataset.planToggle)].done;
            if (remove) plans.splice(Number(remove.dataset.planDelete), 1);
            if (toggle || remove) { write('studyPlan', plans); renderPlan(); }
        });
        $('#studyWeek').addEventListener('click', event => {
            const button = event.target.closest('[data-study-day]'); if (!button) return;
            const key = button.dataset.studyDay; const days = getStudyDays();
            write('studyDays', days.includes(key) ? days.filter(day => day !== key) : [...days, key]); renderWeek(); renderStats();
        });
        $('#saveNoteButton').addEventListener('click', () => {
            localStorage.setItem('quickNote', $('#quickNote').value); if (typeof window.queueCloudSave === 'function') window.queueCloudSave();
            $('#noteStatus').textContent = 'تم الحفظ الآن ✓'; setTimeout(() => { $('#noteStatus').textContent = 'يُحفظ تلقائيًا على حسابك'; }, 1800);
        });
    }

    function init() {
        document.title = 'Molham Dashboard | لوحتك الدراسية';
        $('#quickNote').value = localStorage.getItem('quickNote') || '';
        bindEvents(); bindFocusTimer(); renderPlan(); renderWeek(); renderStats();
        new MutationObserver(renderStats).observe($('#taskList'), { childList: true, subtree: true });
        window.addEventListener('molhamCloudStateLoaded', () => { $('#quickNote').value = localStorage.getItem('quickNote') || ''; renderPlan(); renderWeek(); renderStats(); });
        setInterval(renderStats, 30000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
