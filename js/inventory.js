// inventory.js - Mobile card-based inventory

const Inventory = (() => {
  let searchQuery = '';
  let categoryFilter = 'all';

  const statusBadge = (item) => {
    const s = Alerts.getItemStatus(item);
    if (s === 'out') return '<span class="badge badge-danger">Out of Stock</span>';
    if (s === 'low') return '<span class="badge badge-warning">Low Stock</span>';
    return '<span class="badge badge-success">In Stock</span>';
  };

  const qtyClass = (item) => {
    if (item.currentStock <= 0) return 'text-danger';
    if (item.currentStock <= item.minimumStock) return 'text-warning';
    return 'text-success';
  };

  const fillClass = (item) => {
    if (item.currentStock <= 0) return 'fill-red';
    if (item.currentStock <= item.minimumStock) return 'fill-orange';
    return 'fill-green';
  };

  const cardClass = (item) => {
    const s = Alerts.getItemStatus(item);
    if (s === 'out') return 'status-out';
    if (s === 'low') return 'status-low';
    return '';
  };

  const sliderStyle = (item) => {
    const current = item.currentStock;
    const max = Math.max(item.minimumStock * 3, item.currentStock, 20);
    const percent = Math.min(100, Math.round((current / max) * 100));
    
    let color = '#00c9a7'; // green
    const status = Alerts.getItemStatus(item);
    if (status === 'out') color = '#f9484a'; // red
    else if (status === 'low') color = '#ffc75f'; // orange
    
    return `background: linear-gradient(90deg, ${color} ${percent}%, rgba(255,255,255,0.08) ${percent}%)`;
  };

  const render = () => {
    let items = DB.getInventory();
    const categories = [...new Set(items.map(i => i.category))].sort();

    // Apply filters
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.itemName.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      items = items.filter(i => i.category === categoryFilter);
    }

    // Category filter chips
    const chipsEl = document.getElementById('inv-category-chips');
    chipsEl.innerHTML =
      `<button class="cat-chip ${categoryFilter === 'all' ? 'active' : ''}" data-cat="all">All</button>` +
      categories.map(c =>
        `<button class="cat-chip ${categoryFilter === c ? 'active' : ''}" data-cat="${c}">${c}</button>`
      ).join('');
    chipsEl.querySelectorAll('.cat-chip').forEach(chip =>
      chip.addEventListener('click', () => { categoryFilter = chip.dataset.cat; render(); })
    );

    // Stats
    const all = DB.getInventory();
    document.getElementById('inv-stats-total').textContent = all.length;
    document.getElementById('inv-stats-low').textContent = all.filter(i => i.currentStock > 0 && i.currentStock <= i.minimumStock).length;
    document.getElementById('inv-stats-out').textContent = all.filter(i => i.currentStock <= 0).length;

    // Cards
    const container = document.getElementById('inventory-cards');
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
      const maxVal = Math.max(item.minimumStock * 3, item.currentStock, 20);
      return `
      <div class="inv-card ${cardClass(item)}">
        <div class="inv-card-top">
          <div class="inv-card-info">
            <div class="inv-card-name">${item.itemName}</div>
            <span class="cat-pill">${item.category}</span>
          </div>
          ${statusBadge(item)}
        </div>
        <div class="stock-bar-wrap">
          <input type="range" class="stock-slider" 
                 id="slider-${item.id}"
                 min="0" max="${maxVal}" 
                 step="1" value="${item.currentStock}" 
                 data-original="${item.currentStock}"
                 style="${sliderStyle(item)}"
                 oninput="Inventory.onSliderInput(this, '${item.id}')" />
          <div class="stock-numbers">
            <span class="${qtyClass(item)} stock-current" id="qty-val-${item.id}">${item.currentStock} ${item.unit}</span>
          </div>
          
          <!-- Slider Save/Cancel Actions -->
          <div class="slider-actions" id="slider-actions-${item.id}" style="display:none; justify-content: flex-end; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.08);">
            <button class="btn btn-ghost" onclick="Inventory.cancelSliderChange('${item.id}')" style="padding: 4px 10px; font-size:11px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; height: 28px;">
              <i data-lucide="x" style="width:12px; height:12px;"></i> Cancel
            </button>
            <button class="btn btn-success" onclick="Inventory.saveSliderChange('${item.id}')" style="padding: 4px 10px; font-size:11px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; height: 28px; background: linear-gradient(135deg, #00c9a7, #00b4d8); color: #fff;">
              <i data-lucide="check" style="width:12px; height:12px;"></i> Save
            </button>
          </div>
        </div>
        <div class="inv-card-actions" id="card-actions-${item.id}" style="justify-content: flex-end; gap: 8px;">
          <button class="btn btn-ghost btn-sm" onclick="Inventory.openEdit('${item.id}')" title="Edit Details" style="padding: 6px 12px; font-size: 11.5px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="pencil" style="width: 13px; height: 13px;"></i> Edit
          </button>
          <button class="btn btn-ghost btn-sm text-danger" onclick="Inventory.confirmDelete('${item.id}', '${item.itemName.replace(/'/g, '\\&apos;')}')" title="Delete Item" style="padding: 6px 12px; font-size: 11.5px; border-radius: 8px; display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Delete
          </button>
        </div>
      </div>`;
    }).join('');

    lucide.createIcons();
  };

  const openEdit = (id) => {
    const item = DB.getItemById(id);
    if (!item) return;
    document.getElementById('edit-item-id').value = id;
    document.getElementById('edit-item-name').value = item.itemName;
    document.getElementById('edit-item-category').value = item.category;
    document.getElementById('edit-item-unit').value = item.unit;
    document.getElementById('edit-item-current').value = item.currentStock;
    document.getElementById('edit-item-minimum').value = item.minimumStock;
    openModal('modal-edit-item');
  };

  const saveEdit = () => {
    const id = document.getElementById('edit-item-id').value;
    const data = {
      itemName: document.getElementById('edit-item-name').value.trim(),
      category: document.getElementById('edit-item-category').value.trim(),
      unit: document.getElementById('edit-item-unit').value,
      currentStock: Number(document.getElementById('edit-item-current').value),
      minimumStock: Number(document.getElementById('edit-item-minimum').value)
    };
    if (!data.itemName || !data.category) { showToast('Fill all required fields.', 'error'); return; }
    const updated = DB.updateItem(id, data);
    closeModal('modal-edit-item');
    render();
    showToast(`${data.itemName} updated! ✅`, 'success');
    if (updated) {
      Alerts.checkAndAlert(updated);
    }
  };

  const confirmDelete = (id, name) => {
    if (confirm(`Delete "${name}"? Cannot be undone.`)) {
      DB.deleteItem(id);
      render();
      showToast(`${name} deleted.`, 'info');
    }
  };

  const onSliderInput = (el, id) => {
    const val = Number(el.value);
    const original = Number(el.dataset.original);
    const qtySpan = document.getElementById(`qty-val-${id}`);
    const actionsRow = document.getElementById(`slider-actions-${id}`);
    const cardActions = document.getElementById(`card-actions-${id}`);
    const item = DB.getItemById(id);
    
    if (qtySpan && item) {
      if (val !== original) {
        const colorClass = val <= 0 ? 'text-danger' : val <= item.minimumStock ? 'text-warning' : 'text-success';
        qtySpan.innerHTML = `${original} ${item.unit} ➔ <strong class="${colorClass}">${val} ${item.unit}</strong>`;
        
        if (actionsRow) actionsRow.style.display = 'flex';
        if (cardActions) cardActions.style.display = 'none';
      } else {
        const status = Alerts.getItemStatus(item);
        qtySpan.className = 'stock-current';
        if (status === 'out') qtySpan.classList.add('text-danger');
        else if (status === 'low') qtySpan.classList.add('text-warning');
        else qtySpan.classList.add('text-success');
        qtySpan.textContent = `${original} ${item.unit}`;
        
        if (actionsRow) actionsRow.style.display = 'none';
        if (cardActions) cardActions.style.display = 'flex';
      }

      const max = Math.max(item.minimumStock * 3, val, 20);
      const percent = Math.min(100, Math.round((val / max) * 100));
      
      const tempItem = { ...item, currentStock: val };
      const status = Alerts.getItemStatus(tempItem);
      let color = '#00c9a7';
      if (status === 'out') color = '#f9484a';
      else if (status === 'low') color = '#ffc75f';
      
      el.style.background = `linear-gradient(90deg, ${color} ${percent}%, rgba(255,255,255,0.08) ${percent}%)`;
    }
  };

  const saveSliderChange = async (id) => {
    const el = document.getElementById(`slider-${id}`);
    if (!el) return;
    
    const val = Number(el.value);
    const item = DB.getItemById(id);
    if (!item) return;

    const oldStock = item.currentStock;
    if (val === oldStock) return;

    const updated = DB.updateItem(id, { currentStock: val });

    const diff = val - oldStock;
    const type = diff > 0 ? 'IN' : 'OUT';
    const qty = Math.abs(diff);

    DB.addTransaction({
      itemId: id,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      transactionType: type,
      quantity: qty,
      notes: 'Slider adjustment',
      date: new Date().toISOString().split('T')[0],
      balanceAfter: val
    });

    render();
    App.updateAlertBadge();
    
    if (updated) {
      Alerts.checkAndAlert(updated);
    }
    
    showToast(`Stock updated: ${item.itemName} is now ${val} ${item.unit} (${type === 'IN' ? '+' : '-'}${qty})`, 'success');
  };

  const cancelSliderChange = (id) => {
    const el = document.getElementById(`slider-${id}`);
    const item = DB.getItemById(id);
    if (el && item) {
      const original = Number(el.dataset.original);
      el.value = original;
      
      const max = Math.max(item.minimumStock * 3, original, 20);
      const percent = Math.min(100, Math.round((original / max) * 100));
      const status = Alerts.getItemStatus(item);
      let color = '#00c9a7';
      if (status === 'out') color = '#f9484a';
      else if (status === 'low') color = '#ffc75f';
      
      el.style.background = `linear-gradient(90deg, ${color} ${percent}%, rgba(255,255,255,0.08) ${percent}%)`;
      
      const qtySpan = document.getElementById(`qty-val-${id}`);
      if (qtySpan) {
        qtySpan.className = 'stock-current';
        if (status === 'out') qtySpan.classList.add('text-danger');
        else if (status === 'low') qtySpan.classList.add('text-warning');
        else qtySpan.classList.add('text-success');
        qtySpan.textContent = `${original} ${item.unit}`;
      }
      
      const actionsRow = document.getElementById(`slider-actions-${id}`);
      const cardActions = document.getElementById(`card-actions-${id}`);
      if (actionsRow) actionsRow.style.display = 'none';
      if (cardActions) cardActions.style.display = 'flex';
    }
  };

  const init = () => {
    document.getElementById('inv-search').addEventListener('input', (e) => {
      searchQuery = e.target.value; render();
    });
    document.getElementById('btn-save-edit').addEventListener('click', saveEdit);
  };

  return { render, init, openEdit, confirmDelete, onSliderInput, saveSliderChange, cancelSliderChange };
})();
