// history.js - Mobile card-based transaction history & Consumption Dashboard

const History = (() => {
  let activeTab = 'ledger'; // 'ledger', 'consumption'
  let filterItem = 'all';
  let filterFrom = '';
  let filterTo = '';
  let consSearchQuery = '';

  const renderConsumption = () => {
    let items = DB.getInventory();
    const txns = DB.getTransactions().filter(t => t.transactionType === 'OUT');

    if (consSearchQuery) {
      const q = consSearchQuery.toLowerCase();
      items = items.filter(i =>
        i.itemName.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6); // Includes today (7 days total)
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 29); // Includes today (30 days total)
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const container = document.getElementById('consumption-list');

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap"><i data-lucide="search-x"></i></div>
          <p>No items found.</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    container.innerHTML = items.map(item => {
      const itemTxns = txns.filter(t => t.itemId === item.id);
      
      const todayQty = itemTxns
        .filter(t => t.date === todayStr)
        .reduce((sum, t) => sum + Number(t.quantity), 0);
        
      const weekQty = itemTxns
        .filter(t => t.date >= weekAgoStr && t.date <= todayStr)
        .reduce((sum, t) => sum + Number(t.quantity), 0);
        
      const monthQty = itemTxns
        .filter(t => t.date >= monthAgoStr && t.date <= todayStr)
        .reduce((sum, t) => sum + Number(t.quantity), 0);

      const hasToday = todayQty > 0;
      const hasWeek = weekQty > 0;
      const hasMonth = monthQty > 0;

      return `
        <div class="consumption-card">
          <div class="cons-header">
            <span class="cons-name">${item.itemName}</span>
            <span class="cat-pill">${item.category}</span>
          </div>
          <div class="cons-grid">
            <div class="cons-stat">
              <span class="cons-label">Today</span>
              <span class="cons-val ${hasToday ? 'has-consumption' : ''}">${todayQty} ${item.unit}</span>
            </div>
            <div class="cons-stat">
              <span class="cons-label">This Week</span>
              <span class="cons-val ${hasWeek ? 'has-consumption' : ''}">${weekQty} ${item.unit}</span>
            </div>
            <div class="cons-stat">
              <span class="cons-label">This Month</span>
              <span class="cons-val ${hasMonth ? 'has-consumption' : ''}">${monthQty} ${item.unit}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    lucide.createIcons();
  };

  const render = () => {
    if (activeTab === 'consumption') {
      renderConsumption();
      return;
    }

    const items = DB.getInventory();

    // Populate item filter
    const itemSel = document.getElementById('hist-item-filter');
    if (itemSel) {
      itemSel.innerHTML = `<option value="all">All Items</option>` +
        items.map(i =>
          `<option value="${i.id}" ${filterItem === i.id ? 'selected' : ''}>${i.itemName}</option>`
        ).join('');
    }

    // Get & filter transactions
    let txns = DB.getTransactions();
    if (filterItem !== 'all') txns = txns.filter(t => t.itemId === filterItem);
    if (filterFrom)           txns = txns.filter(t => t.date >= filterFrom);
    if (filterTo)             txns = txns.filter(t => t.date <= filterTo);
    
    txns.reverse(); // Newest baseline first
    txns.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    const countEl = document.getElementById('hist-count');
    if (countEl) {
      countEl.textContent = `${txns.length} record${txns.length !== 1 ? 's' : ''}`;
    }

    const container = document.getElementById('history-list');
    if (!container) return;

    if (txns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap"><i data-lucide="clock"></i></div>
          <p>No transactions found.</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    container.innerHTML = txns.map(t => {
      const isIn = t.transactionType === 'IN';
      return `
        <div class="hist-card">
          <div class="hist-left">
            <div class="hist-txn-icon ${isIn ? 'hist-icon-in' : 'hist-icon-out'}">
              <i data-lucide="${isIn ? 'trending-up' : 'trending-down'}"></i>
            </div>
            <div class="hist-info">
              <div class="hist-item-name">${t.itemName}</div>
              <div class="hist-meta">
                <span class="cat-pill">${t.category || ''}</span>
                <span class="hist-date">${formatDate(t.date)}</span>
              </div>
              ${t.notes ? `<div class="hist-notes">"${t.notes}"</div>` : ''}
            </div>
          </div>
          <div class="hist-right">
            <div class="hist-qty ${isIn ? 'hist-qty-in' : 'hist-qty-out'}">
              ${isIn ? '+' : '-'}${t.quantity} ${t.unit || ''}
            </div>
            <div class="hist-balance-wrap">
              <span class="hist-bal-label">Balance</span>
              <span class="hist-bal-val">${t.balanceAfter} ${t.unit || ''}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    lucide.createIcons();
  };

  const switchTab = (tab) => {
    activeTab = tab;
    
    // Toggle active tab buttons
    document.querySelectorAll('.hist-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.histtab === tab);
    });

    // Toggle active panels
    document.querySelectorAll('.hist-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `hist-panel-${tab}`);
    });

    render();
  };

  const init = () => {
    // Sub-tab button events
    document.querySelectorAll('.hist-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.histtab);
      });
    });

    // Ledger filters
    document.getElementById('hist-item-filter')?.addEventListener('change', (e) => {
      filterItem = e.target.value; render();
    });
    document.getElementById('hist-from')?.addEventListener('change', (e) => {
      filterFrom = e.target.value; render();
    });
    document.getElementById('hist-to')?.addEventListener('change', (e) => {
      filterTo = e.target.value; render();
    });
    document.getElementById('btn-hist-clear')?.addEventListener('click', () => {
      filterItem = 'all'; filterFrom = ''; filterTo = '';
      const itemSel = document.getElementById('hist-item-filter');
      if (itemSel) itemSel.value = 'all';
      const fromEl = document.getElementById('hist-from');
      if (fromEl) fromEl.value = '';
      const toEl = document.getElementById('hist-to');
      if (toEl) toEl.value = '';
      render();
    });

    // Consumption search filter
    document.getElementById('cons-search')?.addEventListener('input', (e) => {
      consSearchQuery = e.target.value;
      renderConsumption();
    });
  };

  return { render, init };
})();
