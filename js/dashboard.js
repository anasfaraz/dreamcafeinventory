// dashboard.js - Dashboard rendering

const Dashboard = (() => {
  const render = () => {
    const items = DB.getInventory();
    const txns = DB.getTransactions();

    const outItems = items.filter(i => i.currentStock <= 0);
    const lowItems = items.filter(i => i.currentStock > 0 && i.currentStock <= i.minimumStock);
    const inStockItems = items.filter(i => i.currentStock > i.minimumStock);

    document.getElementById('stat-total').textContent = items.length;
    document.getElementById('stat-instock').textContent = inStockItems.length;
    document.getElementById('stat-low').textContent = lowItems.length;
    document.getElementById('stat-out').textContent = outItems.length;

    // Alert items (low + out)
    const alertItems = [...outItems, ...lowItems];
    const alertsEl = document.getElementById('dashboard-alerts');
    if (alertItems.length === 0) {
      alertsEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap"><i data-lucide="check-circle"></i></div>
          <p>All items are well stocked! 🎉</p>
        </div>`;
    } else {
      alertsEl.innerHTML = alertItems.map(item => {
        const isOut = item.currentStock <= 0;
        return `
          <div class="alert-row ${isOut ? 'alert-out' : 'alert-low'}">
            <div class="alert-row-left">
              <span class="alert-dot ${isOut ? 'dot-red' : 'dot-orange'}"></span>
              <div>
                <div class="alert-item-name">${item.itemName}</div>
                <div class="alert-item-sub">${item.category}</div>
              </div>
            </div>
            <div class="alert-row-right">
              <span class="badge ${isOut ? 'badge-danger' : 'badge-warning'}">${isOut ? 'Out of Stock' : 'Low Stock'}</span>
              <span class="alert-qty">${item.currentStock} / ${item.minimumStock} ${item.unit}</span>
            </div>
          </div>`;
      }).join('');
    }

    // Recent transactions
    const recent = [...txns].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    const recentEl = document.getElementById('dashboard-recent');
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="empty-state"><p>No transactions yet.</p></div>`;
    } else {
      recentEl.innerHTML = recent.map(t => `
        <div class="recent-row">
          <div class="recent-row-left">
            <span class="txn-badge ${t.transactionType === 'IN' ? 'txn-in' : 'txn-out'}">
              ${t.transactionType === 'IN' ? '+' : '-'}
            </span>
            <div>
              <div class="recent-name">${t.itemName}</div>
              <div class="recent-date">${formatDate(t.date)}</div>
            </div>
          </div>
          <div class="recent-qty ${t.transactionType === 'IN' ? 'text-success' : 'text-danger'}">
            ${t.transactionType === 'IN' ? '+' : '-'}${t.quantity} ${t.unit || ''}
          </div>
        </div>`).join('');
    }

    lucide.createIcons();
  };

  return { render };
})();
