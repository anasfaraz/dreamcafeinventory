// db.js - localStorage & Firebase Cloud sync layer for Dream Cafe Stock Manager

const DB = (() => {
  const KEYS = {
    INVENTORY: 'dcm_inventory',
    TRANSACTIONS: 'dcm_transactions',
    SETTINGS: 'dcm_settings',
    FINANCES: 'dcm_finances'
  };

  let firebaseApp = null;
  let firestoreDb = null;
  let cloudListeners = [];

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const _get = (key, fallback = []) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };

  const _set = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // Hardcoded Firebase Config for out-of-the-box syncing on all devices
  const HARDCODED_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBz6ezlSqIMnPupVAaSSFtjnwIG_potmQc",
    authDomain: "dreamcafe-70301.firebaseapp.com",
    projectId: "dreamcafe-70301",
    storageBucket: "dreamcafe-70301.firebasestorage.app",
    messagingSenderId: "189672369657",
    appId: "1:189672369657:web:68a0c5b8b8903b972d2128",
    measurementId: "G-FR1FX8KF4J"
  };

  // ── Cloud Sync Sub-module ─────────────────────────────
  const Cloud = {
    isEnabled: () => !!firestoreDb,
    init: () => {
      Cloud.disconnect();

      const config = HARDCODED_FIREBASE_CONFIG && HARDCODED_FIREBASE_CONFIG.apiKey
        ? HARDCODED_FIREBASE_CONFIG
        : (() => {
            try { return JSON.parse(getSettings().firebaseConfig || ''); } catch { return null; }
          })();

      if (!config) return;

      try {
        firebaseApp = firebase.initializeApp(config, 'dreamcafe_app_' + Date.now());
        firestoreDb = firebaseApp.firestore();

        // Enable offline persistence so app works without internet too
        firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
          console.warn('[DreamCafe] Persistence error:', err.code);
        });

        // ── INVENTORY listener ───────────────────────────
        const unsubInventory = firestoreDb.collection('inventory').onSnapshot(snapshot => {
          if (snapshot.empty) {
            // Cloud is empty — check if we have REAL local data (not seed placeholders)
            const localItems = _get(KEYS.INVENTORY, []);
            const realItems = localItems.filter(i => !i._isSeed);
            if (realItems.length > 0) {
              // Auto-upload real data from this phone to the cloud
              console.log('[DreamCafe] Cloud empty, auto-uploading local inventory...');
              const batch = firestoreDb.batch();
              realItems.forEach(item => {
                batch.set(firestoreDb.collection('inventory').doc(item.id), item);
              });
              batch.commit().then(() => {
                console.log('[DreamCafe] Auto-upload inventory done ✅');
              }).catch(e => console.error('[DreamCafe] Auto-upload inventory error:', e));
            }
            // If cloud is empty and we only have seed data, do nothing (wait)
            return;
          }

          // Cloud has data — pull it, replacing any local/seed data
          const items = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            items.push({
              ...data,
              currentStock: Number(data.currentStock),
              minimumStock: Number(data.minimumStock)
            });
          });
          _set(KEYS.INVENTORY, items);
          if (window.App && typeof App.refreshCurrentSection === 'function') {
            App.refreshCurrentSection();
          }
        }, err => console.error('[DreamCafe] Inventory stream error:', err));

        // ── TRANSACTIONS listener ────────────────────────
        const unsubTransactions = firestoreDb.collection('transactions').onSnapshot(snapshot => {
          if (snapshot.empty) {
            const localTxns = _get(KEYS.TRANSACTIONS, []);
            if (localTxns.length > 0) {
              const batch = firestoreDb.batch();
              localTxns.forEach(t => {
                batch.set(firestoreDb.collection('transactions').doc(t.id), t);
              });
              batch.commit().catch(e => console.error('[DreamCafe] Auto-upload txns error:', e));
            }
            return;
          }
          const txns = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            txns.push({
              ...data,
              quantity: Number(data.quantity),
              balanceAfter: Number(data.balanceAfter),
              timestamp: Number(data.timestamp || 0)
            });
          });
          _set(KEYS.TRANSACTIONS, txns);
          if (window.App && typeof App.refreshCurrentSection === 'function') {
            App.refreshCurrentSection();
          }
        }, err => console.error('[DreamCafe] Transactions stream error:', err));

        // ── FINANCES listener ────────────────────────────
        const unsubFinances = firestoreDb.collection('finances').onSnapshot(snapshot => {
          if (snapshot.empty) {
            const localFin = _get(KEYS.FINANCES, []);
            if (localFin.length > 0) {
              const batch = firestoreDb.batch();
              localFin.forEach(r => {
                batch.set(firestoreDb.collection('finances').doc(r.id), r);
              });
              batch.commit().catch(e => console.error('[DreamCafe] Auto-upload finances error:', e));
            }
            return;
          }
          const records = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            records.push({
              ...data,
              amount: Number(data.amount),
              timestamp: Number(data.timestamp || 0)
            });
          });
          _set(KEYS.FINANCES, records);
          if (window.App && typeof App.refreshCurrentSection === 'function') {
            App.refreshCurrentSection();
          }
        }, err => console.error('[DreamCafe] Finances stream error:', err));

        cloudListeners.push(unsubInventory, unsubTransactions, unsubFinances);
        console.log('[DreamCafe] Cloud Sync ready 🟢');

      } catch (err) {
        console.error('[DreamCafe] Firebase init error:', err);
        Cloud.disconnect();
      }
    },

    disconnect: () => {
      cloudListeners.forEach(unsub => { try { unsub(); } catch {} });
      cloudListeners = [];
      firebaseApp = null;
      firestoreDb = null;
    },

    uploadLocalData: async () => {
      if (!firestoreDb) throw new Error('Firebase not connected');
      const batch = firestoreDb.batch();
      getInventory().filter(i => !i._isSeed).forEach(item => {
        batch.set(firestoreDb.collection('inventory').doc(item.id), item);
      });
      getTransactions().forEach(t => {
        batch.set(firestoreDb.collection('transactions').doc(t.id), t);
      });
      getFinances().forEach(r => {
        batch.set(firestoreDb.collection('finances').doc(r.id), r);
      });
      await batch.commit();
      console.log('[DreamCafe] Manual upload to Firestore done 📤');
    }
  };


  // ── Inventory ─────────────────────────────────────────
  const getInventory = () => _get(KEYS.INVENTORY, []);
  const saveInventory = (items) => _set(KEYS.INVENTORY, items);

  const addItem = (item) => {
    const items = getInventory();
    const newItem = {
      ...item,
      id: generateId(),
      createdDate: new Date().toISOString().split('T')[0],
      currentStock: Number(item.currentStock),
      minimumStock: Number(item.minimumStock)
    };
    items.push(newItem);
    saveInventory(items);

    if (Cloud.isEnabled()) {
      firestoreDb.collection('inventory').doc(newItem.id).set(newItem)
        .catch(err => console.error("[DreamCafe] Firestore addItem error:", err));
    }

    return newItem;
  };

  const updateItem = (id, data) => {
    const items = getInventory();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveInventory(items);

    const updatedItem = items[idx];
    if (Cloud.isEnabled()) {
      firestoreDb.collection('inventory').doc(id).set(updatedItem)
        .catch(err => console.error("[DreamCafe] Firestore updateItem error:", err));
    }

    return updatedItem;
  };

  const deleteItem = (id) => {
    const name = getItemById(id)?.itemName || id;
    saveInventory(getInventory().filter(i => i.id !== id));

    if (Cloud.isEnabled()) {
      firestoreDb.collection('inventory').doc(id).delete()
        .catch(err => console.error("[DreamCafe] Firestore deleteItem error:", err));
    }
  };

  const getItemById = (id) => getInventory().find(i => i.id === id) || null;

  // ── Transactions ──────────────────────────────────────
  const getTransactions = () => _get(KEYS.TRANSACTIONS, []);
  const saveTransactions = (txns) => _set(KEYS.TRANSACTIONS, txns);

  const addTransaction = (txn) => {
    const txns = getTransactions();
    const newTxn = { ...txn, id: generateId(), timestamp: Date.now() };
    txns.push(newTxn);
    saveTransactions(txns);

    if (Cloud.isEnabled()) {
      firestoreDb.collection('transactions').doc(newTxn.id).set(newTxn)
        .catch(err => console.error("[DreamCafe] Firestore addTransaction error:", err));
    }

    return newTxn;
  };

  // ── Finances (Income / Expenses) ───────────────────────────
  const getFinances = () => _get(KEYS.FINANCES, []);
  const saveFinances = (data) => _set(KEYS.FINANCES, data);

  const addFinanceEntry = (entry) => {
    const records = getFinances();
    const newEntry = {
      ...entry,
      id: generateId(),
      amount: Number(entry.amount),
      timestamp: Date.now()
    };
    records.push(newEntry);
    saveFinances(records);

    if (Cloud.isEnabled()) {
      firestoreDb.collection('finances').doc(newEntry.id).set(newEntry)
        .catch(err => console.error("[DreamCafe] Firestore addFinanceEntry error:", err));
    }

    return newEntry;
  };

  const deleteFinanceEntry = (id) => {
    const records = getFinances().filter(r => r.id !== id);
    saveFinances(records);

    if (Cloud.isEnabled()) {
      firestoreDb.collection('finances').doc(id).delete()
        .catch(err => console.error("[DreamCafe] Firestore deleteFinanceEntry error:", err));
    }
  };

  const getFinancesSummary = (dateStr) => {
    const records = getFinances().filter(r => r.date === dateStr);
    let cashIncome = 0;
    let onlineIncome = 0;
    let cashExpense = 0;
    let onlineExpense = 0;

    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'INCOME') {
        if (r.paymentMethod === 'CASH') cashIncome += amt;
        else onlineIncome += amt;
      } else if (r.type === 'EXPENSE') {
        if (r.paymentMethod === 'CASH') cashExpense += amt;
        else onlineExpense += amt;
      }
    });

    return {
      cashIncome,
      onlineIncome,
      totalIncome: cashIncome + onlineIncome,
      cashExpense,
      onlineExpense,
      totalExpense: cashExpense + onlineExpense,
      net: (cashIncome + onlineIncome) - (cashExpense + onlineExpense)
    };
  };

  const getSettings = () => {
    const s = _get(KEYS.SETTINGS, null);
    if (s && s.greenApiInstance && s.dailySummaryTime) {
      if (s.alertsEnabled === undefined) s.alertsEnabled = true;
      if (s.firebaseConfig === undefined) s.firebaseConfig = '';
      return s;
    }
    return {
      alertsEnabled: true,
      whatsappPhone: s ? s.whatsappPhone : '',
      greenApiInstance: s && s.greenApiInstance ? s.greenApiInstance : '7107658894',
      greenApiToken: s && s.greenApiToken ? s.greenApiToken : '919b5ee1ca9749e482be869b5d379d3a38db675d97d64504b4',
      dailySummaryTime: s && s.dailySummaryTime ? s.dailySummaryTime : '21:00',
      firebaseConfig: s && s.firebaseConfig ? s.firebaseConfig : ''
    };
  };
  const saveSettings = (s) => _set(KEYS.SETTINGS, s);

  return {
    generateId,
    getInventory, saveInventory, addItem, updateItem, deleteItem, getItemById,
    getTransactions, saveTransactions, addTransaction,
    getFinances, saveFinances, addFinanceEntry, deleteFinanceEntry, getFinancesSummary,
    getSettings, saveSettings,
    Cloud
  };
})();
