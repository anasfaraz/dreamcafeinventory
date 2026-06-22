// db.js - localStorage data layer for Dream Cafe Stock Manager

const DB = (() => {
  const KEYS = {
    INVENTORY: 'dcm_inventory',
    TRANSACTIONS: 'dcm_transactions',
    SETTINGS: 'dcm_settings',
    FINANCES: 'dcm_finances'
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const _get = (key, fallback = []) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };

  const _set = (key, data) => localStorage.setItem(key, JSON.stringify(data));

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
    return newItem;
  };

  const updateItem = (id, data) => {
    const items = getInventory();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...data };
    saveInventory(items);
    return items[idx];
  };

  const deleteItem = (id) => saveInventory(getInventory().filter(i => i.id !== id));

  const getItemById = (id) => getInventory().find(i => i.id === id) || null;

  // ── Transactions ──────────────────────────────────────
  const getTransactions = () => _get(KEYS.TRANSACTIONS, []);
  const saveTransactions = (txns) => _set(KEYS.TRANSACTIONS, txns);

  const addTransaction = (txn) => {
    const txns = getTransactions();
    const newTxn = { ...txn, id: generateId(), timestamp: Date.now() };
    txns.push(newTxn);
    saveTransactions(txns);
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
    return newEntry;
  };

  const deleteFinanceEntry = (id) => {
    const records = getFinances().filter(r => r.id !== id);
    saveFinances(records);
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
      return s;
    }
    return {
      alertsEnabled: true,
      whatsappPhone: s ? s.whatsappPhone : '',
      greenApiInstance: s && s.greenApiInstance ? s.greenApiInstance : '7107658894',
      greenApiToken: s && s.greenApiToken ? s.greenApiToken : '919b5ee1ca9749e482be869b5d379d3a38db675d97d64504b4',
      dailySummaryTime: s && s.dailySummaryTime ? s.dailySummaryTime : '21:00'
    };
  };
  const saveSettings = (s) => _set(KEYS.SETTINGS, s);

  return {
    generateId,
    getInventory, saveInventory, addItem, updateItem, deleteItem, getItemById,
    getTransactions, saveTransactions, addTransaction,
    getFinances, saveFinances, addFinanceEntry, deleteFinanceEntry, getFinancesSummary,
    getSettings, saveSettings
  };
})();
