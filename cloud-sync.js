(() => {
    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyApPkvZBmE24_coF-OSn3l463X2MdJCXtc',
        authDomain: 'molham-dashboard-sync.firebaseapp.com',
        projectId: 'molham-dashboard-sync',
        storageBucket: 'molham-dashboard-sync.firebasestorage.app',
        messagingSenderId: '41203898641',
        appId: '1:41203898641:web:527ba65d32364e5c9494b0'
    };
    const STATE_KEYS = new Set([
        'userPoints', 'gradDate', 'userLang', 'userName', 'userMins', 'userRole', 'themeColor', 'colorScheme',
        'surgeonTasks', 'focusLog', 'dailyTaskRewardState', 'pongDifficulty',
        'mushafColorScheme', 'mushafLastPage', 'mushafKhatmaPlan', 'mushafDailySurahPlan',
        'tasbeehCounterState', 'tasbeehDailyTracker'
    ]);
    const PROJECT_MIGRATION_SOURCE = 'molham-dash-bord';
    const PENDING_SYNC_KEY = 'molhamCloudSyncPending';
    const localStore = window.localStorage;
    const status = document.getElementById('toolCloudSyncStatus');
    let cloudUser = null;
    let cloudUnsubscribe = null;
    let applyingRemoteState = false;
    let saveTimer = 0;

    function setStatus(message, state = 'connected') {
        if (!status) return;
        status.textContent = message;
        status.dataset.state = state;
    }

    function localState() {
        const state = {};
        STATE_KEYS.forEach(key => {
            const value = localStore.getItem(key);
            if (value !== null) state[key] = value;
        });
        return state;
    }

    function syncErrorMessage(error) {
        const code = String(error?.code || '').replace(/^firestore\//, '');
        if (code === 'permission-denied') return 'تعذرت المزامنة؛ راجع قواعد Firestore.';
        if (code === 'failed-precondition' || code === 'not-found') return 'قاعدة Firestore غير مفعّلة.';
        if (code === 'unavailable' || code === 'network-request-failed') return 'محفوظ على هذا الجهاز؛ ستتم المزامنة عند عودة الاتصال.';
        return `تعذرت المزامنة${code ? ` (${code})` : ''}.`;
    }

    function markSyncPending() {
        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStore.setItem(PENDING_SYNC_KEY, token);
        return token;
    }

    async function writeCloudState(pendingToken = localStore.getItem(PENDING_SYNC_KEY)) {
        if (!cloudUser || applyingRemoteState) return;
        if (!pendingToken) pendingToken = markSyncPending();
        if (!navigator.onLine) return;
        await firebase.firestore().collection('users').doc(cloudUser.uid).set({
            state: localState(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (localStore.getItem(PENDING_SYNC_KEY) === pendingToken) localStore.removeItem(PENDING_SYNC_KEY);
        setStatus('✓ تمت المزامنة مع حسابك', 'connected');
    }

    function scheduleSave() {
        if (!cloudUser || applyingRemoteState) return;
        const pendingToken = markSyncPending();
        setStatus(navigator.onLine
            ? '✓ تم الحفظ على هذا الجهاز؛ المزامنة تعمل بالخلفية.'
            : '✓ تم الحفظ على هذا الجهاز؛ ستتم المزامنة عند عودة الاتصال.', navigator.onLine ? 'saving' : 'connected');
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
            writeCloudState(pendingToken).catch(error => {
                setStatus(syncErrorMessage(error), 'error');
                console.warn('Tool cloud sync write error:', error);
            });
        }, 180);
    }

    function clearSyncedState() {
        applyingRemoteState = true;
        STATE_KEYS.forEach(key => localStore.removeItem(key));
        localStore.removeItem(PENDING_SYNC_KEY);
        applyingRemoteState = false;
        window.dispatchEvent(new CustomEvent('molham:cloud-state-updated', {
            detail: { keys: [...STATE_KEYS], source: 'account-change' }
        }));
    }

    function applyCloudState(user, state) {
        applyingRemoteState = true;
        STATE_KEYS.forEach(key => localStore.removeItem(key));
        Object.entries(state || {}).forEach(([key, value]) => {
            if (STATE_KEYS.has(key) && typeof value === 'string') localStore.setItem(key, value);
        });
        localStore.setItem('molhamCloudUserId', user.uid);
        localStore.setItem('molhamCloudProjectId', FIREBASE_CONFIG.projectId);
        localStore.removeItem(PENDING_SYNC_KEY);
        applyingRemoteState = false;
        window.dispatchEvent(new CustomEvent('molham:cloud-state-updated', {
            detail: { keys: [...STATE_KEYS], source: 'cloud' }
        }));
    }

    function watchCloudState(user) {
        const previousUserId = localStore.getItem('molhamCloudUserId');
        const previousProjectId = localStore.getItem('molhamCloudProjectId') || PROJECT_MIGRATION_SOURCE;
        const isProjectMigration = previousProjectId !== FIREBASE_CONFIG.projectId;
        if (previousUserId && previousUserId !== user.uid && !isProjectMigration) clearSyncedState();
        localStore.setItem('molhamCloudProjectId', FIREBASE_CONFIG.projectId);

        if (cloudUnsubscribe) cloudUnsubscribe();
        cloudUnsubscribe = firebase.firestore().collection('users').doc(user.uid).onSnapshot(snapshot => {
            const remoteState = snapshot.exists ? snapshot.data().state : null;
            if (snapshot.metadata.hasPendingWrites) return;
            if (localStore.getItem(PENDING_SYNC_KEY)) {
                if (!snapshot.metadata.fromCache) {
                    writeCloudState().catch(error => {
                        setStatus(syncErrorMessage(error), 'error');
                        console.warn('Tool cloud sync recovery error:', error);
                    });
                }
                return;
            }
            if (!remoteState || Object.keys(remoteState).length === 0) {
                if (!snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) {
                    if (!localStore.getItem('userName')) localStore.setItem('userName', user.displayName || user.email || 'Molham');
                    writeCloudState().catch(error => {
                        setStatus(syncErrorMessage(error), 'error');
                        console.warn('Tool cloud sync initialization error:', error);
                    });
                }
                return;
            }
            if (snapshot.metadata.hasPendingWrites) return;
            applyCloudState(user, remoteState);
            setStatus('✓ تمت مزامنة بيانات الحساب', 'connected');
        }, error => {
            setStatus(syncErrorMessage(error), 'error');
            console.warn('Tool cloud sync listener error:', error);
        });
    }

    if (!window.firebase) {
        setStatus('تعذر تحميل خدمة المزامنة.', 'error');
        return;
    }
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) {
        originalSetItem.call(this, key, value);
        if (this === localStore && STATE_KEYS.has(String(key)) && !applyingRemoteState) scheduleSave();
    };
    Storage.prototype.removeItem = function(key) {
        originalRemoveItem.call(this, key);
        if (this === localStore && STATE_KEYS.has(String(key)) && !applyingRemoteState) scheduleSave();
    };

    window.addEventListener('storage', event => {
        if (event.storageArea !== localStore || !STATE_KEYS.has(event.key)) return;
        window.dispatchEvent(new CustomEvent('molham:cloud-state-updated', {
            detail: { keys: [event.key], source: 'storage' }
        }));
    });
    window.addEventListener('online', scheduleSave);
    window.MolhamCloudSync = { save: scheduleSave };

    if (!localStore.getItem('molhamCloudUserId')) {
        setStatus('سجّل الدخول من لوحة التحكم لمزامنة تقدمك.', 'saving');
    }
    firebase.auth().onAuthStateChanged(user => {
        cloudUser = user;
        if (!user) {
            if (cloudUnsubscribe) cloudUnsubscribe();
            cloudUnsubscribe = null;
            setStatus('سجّل الدخول من لوحة التحكم لمزامنة تقدمك.', 'saving');
            return;
        }
        setStatus('جارٍ تحميل بيانات حسابك…', 'saving');
        try {
            watchCloudState(user);
        } catch (error) {
            setStatus('تعذر تحميل بيانات الحساب.', 'error');
            console.warn('Tool cloud sync initialization error:', error);
        }
    });
})();
