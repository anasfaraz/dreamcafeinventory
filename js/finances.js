// finances.js - Daily Income (Cash vs Online) & Expense Tracker with Admin Protection

const Finances = (() => {
  let activeTab = 'ledger'; // 'ledger', 'add-income', 'add-expense'
  let selectedDate = ''; // defaults to today (YYYY-MM-DD)

  const formatCurrency = (amount) => {
    return '₹' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const renderSummary = () => {
    const summary = DB.getFinancesSummary(selectedDate);

    // Set stats card values
    const netEl = document.getElementById('fin-net-val');
    netEl.textContent = formatCurrency(summary.net);
    netEl.className = 'fin-card-value ' + (summary.net >= 0 ? 'text-success' : 'text-danger');

    document.getElementById('fin-inc-val').textContent = formatCurrency(summary.totalIncome);
    document.getElementById('fin-inc-cash').textContent = formatCurrency(summary.cashIncome);
    document.getElementById('fin-inc-online').textContent = formatCurrency(summary.onlineIncome);

    document.getElementById('fin-exp-val').textContent = formatCurrency(summary.totalExpense);
    document.getElementById('fin-exp-cash').textContent = formatCurrency(summary.cashExpense);
    document.getElementById('fin-exp-online').textContent = formatCurrency(summary.onlineExpense);
  };

  const renderLedger = () => {
    const listContainer = document.getElementById('fin-ledger-list');
    const records = DB.getFinances().filter(r => r.date === selectedDate);

    // Sort by timestamp desc (newest first)
    records.sort((a, b) => b.timestamp - a.timestamp);

    if (records.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap" style="background: rgba(108,99,255,0.08); color: var(--text-muted);">
            <i data-lucide="info"></i>
          </div>
          <p>No receipts or expenses recorded for this day.</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    listContainer.innerHTML = records.map(r => {
      const isInc = r.type === 'INCOME';
      const isCash = r.paymentMethod === 'CASH';
      
      // Determine icon classes & labels
      let iconClass = '';
      let iconName = '';
      if (isInc) {
        iconClass = isCash ? 'inc-cash' : 'inc-online';
        iconName = isCash ? 'banknote' : 'smartphone';
      } else {
        iconClass = isCash ? 'exp-cash' : 'exp-online';
        iconName = isCash ? 'arrow-up-right' : 'credit-card';
      }

      return `
        <div class="fin-card type-${r.type.toLowerCase()}">
          <div class="fin-card-left">
            <div class="fin-card-icon ${iconClass}">
              <i data-lucide="${iconName}"></i>
            </div>
            <div class="fin-card-info">
              <div class="fin-card-title">${isInc ? 'Received (' + r.paymentMethod + ')' : r.category}</div>
              <div class="fin-card-meta">
                <span class="cat-pill" style="font-size:10px; padding: 2px 7px;">${r.type}</span>
                ${r.notes ? `<span class="fin-card-notes">"${r.notes}"</span>` : ''}
              </div>
            </div>
          </div>
          <div class="fin-card-right">
            <div class="fin-card-amount ${isInc ? 'inc-txt' : 'exp-txt'}">
              ${isInc ? '+' : '-'}${formatCurrency(r.amount)}
            </div>
            <button class="btn-delete-fin" onclick="Finances.confirmDelete('${r.id}')" title="Delete record">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    lucide.createIcons();
  };

  const switchTab = (tab) => {
    activeTab = tab;
    
    // Toggle active tab buttons
    document.querySelectorAll('.fin-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.fintab === tab);
    });

    // Toggle active panels
    document.querySelectorAll('.fin-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `fin-panel-${tab}`);
    });

    // Toggle date filter visibility (only show for ledger)
    const dateFilterRow = document.getElementById('fin-date-filter-row');
    if (tab === 'ledger') {
      dateFilterRow.style.display = 'flex';
      renderLedger();
    } else {
      dateFilterRow.style.display = 'none';
    }
  };

  const saveIncome = () => {
    const amount = Number(document.getElementById('fin-inc-amount').value);
    const method = document.getElementById('fin-inc-method').value;
    const date = document.getElementById('fin-inc-date').value;
    const notes = document.getElementById('fin-inc-notes').value.trim();

    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a date.', 'error');
      return;
    }

    DB.addFinanceEntry({
      type: 'INCOME',
      amount,
      paymentMethod: method,
      category: 'Income',
      date,
      notes
    });

    showToast(`Income of ${formatCurrency(amount)} recorded! 🟢`, 'success');
    
    // Clear form
    document.getElementById('fin-income-form').reset();
    document.getElementById('fin-inc-date').value = selectedDate; // restore default
    
    // Refresh & switch back to ledger
    renderSummary();
    switchTab('ledger');
  };

  const saveExpense = () => {
    const amount = Number(document.getElementById('fin-exp-amount').value);
    const category = document.getElementById('fin-exp-category').value.trim();
    const method = document.getElementById('fin-exp-method').value;
    const date = document.getElementById('fin-exp-date').value;
    const notes = document.getElementById('fin-exp-notes').value.trim();

    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    if (!category) {
      showToast('Please specify the item purchased.', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a date.', 'error');
      return;
    }

    DB.addFinanceEntry({
      type: 'EXPENSE',
      amount,
      paymentMethod: method,
      category,
      date,
      notes
    });

    showToast(`Expense of ${formatCurrency(amount)} recorded! 🔴`, 'warning');

    // Clear form
    document.getElementById('fin-expense-form').reset();
    document.getElementById('fin-exp-date').value = selectedDate; // restore default

    // Refresh & switch back to ledger
    renderSummary();
    switchTab('ledger');
  };

  const confirmDelete = (id) => {
    if (confirm('Delete this transaction record?')) {
      DB.deleteFinanceEntry(id);
      renderSummary();
      renderLedger();
      showToast('Record deleted.', 'info');
    }
  };

  const login = () => {
    const passInput = document.getElementById('fin-login-pass');
    const pass = passInput.value.trim();

    if (pass === '298021') {
      sessionStorage.setItem('fin_logged_in', 'true');
      passInput.value = '';
      showToast('Welcome, Admin! 🔓', 'success');
      render();
    } else {
      showToast('Invalid passcode.', 'error');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('fin_logged_in');
    showToast('Logged out successfully. 🔒', 'info');
    render();
  };

  const render = () => {
    // Default to today if date not set
    if (!selectedDate) {
      selectedDate = new Date().toISOString().split('T')[0];
    }
    document.getElementById('fin-date-picker').value = selectedDate;
    document.getElementById('fin-inc-date').value = selectedDate;
    document.getElementById('fin-exp-date').value = selectedDate;

    // Check login status first
    const isLoggedIn = sessionStorage.getItem('fin_logged_in') === 'true';
    if (isLoggedIn) {
      document.getElementById('fin-main-area').style.display = 'block';
      document.getElementById('btn-fin-logout').style.display = 'flex';
      document.getElementById('fin-login-panel').style.display = 'none';

      renderSummary();
      switchTab(activeTab);
    } else {
      document.getElementById('fin-main-area').style.display = 'none';
      document.getElementById('btn-fin-logout').style.display = 'none';
      document.getElementById('fin-login-panel').style.display = 'block';
      
      // Auto-focus on password field
      setTimeout(() => {
        document.getElementById('fin-login-pass')?.focus();
      }, 100);
    }
    lucide.createIcons();
  };

  const init = () => {
    selectedDate = new Date().toISOString().split('T')[0];

    // Login handlers
    document.getElementById('btn-fin-login').addEventListener('click', login);
    document.getElementById('fin-login-pass').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login();
    });
    document.getElementById('btn-fin-logout').addEventListener('click', logout);

    // Date picker event
    document.getElementById('fin-date-picker').addEventListener('change', (e) => {
      selectedDate = e.target.value;
      renderSummary();
      renderLedger();
    });

    // Sub-tab button events
    document.querySelectorAll('.fin-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.fintab);
      });
    });

    // Form save events
    document.getElementById('btn-save-income').addEventListener('click', saveIncome);
    document.getElementById('btn-save-expense').addEventListener('click', saveExpense);
  };

  return { render, init, confirmDelete };
})();
