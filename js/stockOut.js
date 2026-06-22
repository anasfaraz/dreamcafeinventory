// stockOut.js - Stock Out form logic

const StockOut = (() => {
  const refreshSelect = () => {
    const items = DB.getInventory();
    const sel = document.getElementById('so-item-select');
    sel.innerHTML = `<option value="">-- Select Item --</option>` +
      items.map(i => `<option value="${i.id}">${i.itemName} (${i.currentStock} ${i.unit})</option>`).join('');
  };

  const updatePreview = () => {
    const itemId = document.getElementById('so-item-select').value;
    const qty = Number(document.getElementById('so-qty').value);
    const preview = document.getElementById('so-preview');
    if (!itemId || !qty || qty <= 0) { preview.style.display = 'none'; return; }
    const item = DB.getItemById(itemId);
    if (!item) return;
    const newStock = item.currentStock - qty;
    preview.style.display = 'flex';
    const warn = newStock < 0 ? ' <span class="warn-pill">⚠️ Stock will go negative!</span>' : (newStock <= item.minimumStock ? ' <span class="warn-pill warn-orange">⚠️ Will trigger low stock alert</span>' : '');
    document.getElementById('so-preview-text').innerHTML =
      `<strong>${item.itemName}</strong>: ${item.currentStock} <span class="op-minus">-</span> <span class="text-danger">${qty}</span> = <strong class="${newStock <= 0 ? 'text-danger' : newStock <= item.minimumStock ? 'text-warning' : 'text-success'}">${Math.max(0, newStock)} ${item.unit}</strong>${warn}`;
  };

  const render = () => {
    refreshSelect();
    document.getElementById('so-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('so-qty').value = '';
    document.getElementById('so-notes').value = '';
    document.getElementById('so-preview').style.display = 'none';
  };

  const submit = async () => {
    const itemId = document.getElementById('so-item-select').value;
    const qty = Number(document.getElementById('so-qty').value);
    const date = document.getElementById('so-date').value;
    const notes = document.getElementById('so-notes').value.trim();

    if (!itemId) { showToast('Please select an item.', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Please enter a valid quantity.', 'error'); return; }
    if (!date) { showToast('Please select a date.', 'error'); return; }

    const item = DB.getItemById(itemId);
    const newStock = Math.max(0, item.currentStock - qty);

    DB.updateItem(itemId, { currentStock: newStock });
    DB.addTransaction({
      itemId, itemName: item.itemName, category: item.category,
      unit: item.unit, transactionType: 'OUT',
      quantity: qty, notes, date, balanceAfter: newStock
    });

    const updatedItem = DB.getItemById(itemId);
    Alerts.checkAndAlert(updatedItem);

    showToast(`✅ ${item.itemName} -${qty} ${item.unit} → Stock: ${newStock}`, 'success');
    render();
    App.navigate('dashboard');
  };

  const init = () => {
    document.getElementById('so-item-select').addEventListener('change', updatePreview);
    document.getElementById('so-qty').addEventListener('input', updatePreview);
    document.getElementById('btn-stock-out-submit').addEventListener('click', submit);
  };

  return { render, init };
})();
