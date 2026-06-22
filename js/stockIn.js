// stockIn.js - Stock In form logic

const StockIn = (() => {
  const refreshSelect = () => {
    const items = DB.getInventory();
    const sel = document.getElementById('si-item-select');
    sel.innerHTML = `<option value="">-- Select Item --</option>` +
      items.map(i => `<option value="${i.id}">${i.itemName} (${i.currentStock} ${i.unit})</option>`).join('');
  };

  const updatePreview = () => {
    const itemId = document.getElementById('si-item-select').value;
    const qty = Number(document.getElementById('si-qty').value);
    const preview = document.getElementById('si-preview');
    if (!itemId || !qty || qty <= 0) { preview.style.display = 'none'; return; }
    const item = DB.getItemById(itemId);
    if (!item) return;
    const newStock = item.currentStock + qty;
    preview.style.display = 'flex';
    document.getElementById('si-preview-text').innerHTML =
      `<strong>${item.itemName}</strong>: ${item.currentStock} <span class="op-plus">+</span> <span class="text-success">${qty}</span> = <strong class="text-success">${newStock} ${item.unit}</strong>`;
  };

  const render = () => {
    refreshSelect();
    document.getElementById('si-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('si-qty').value = '';
    document.getElementById('si-notes').value = '';
    document.getElementById('si-preview').style.display = 'none';
  };

  const submit = async () => {
    const itemId = document.getElementById('si-item-select').value;
    const qty = Number(document.getElementById('si-qty').value);
    const date = document.getElementById('si-date').value;
    const notes = document.getElementById('si-notes').value.trim();

    if (!itemId) { showToast('Please select an item.', 'error'); return; }
    if (!qty || qty <= 0) { showToast('Please enter a valid quantity.', 'error'); return; }
    if (!date) { showToast('Please select a date.', 'error'); return; }

    const item = DB.getItemById(itemId);
    const newStock = item.currentStock + qty;

    DB.updateItem(itemId, { currentStock: newStock });
    DB.addTransaction({
      itemId, itemName: item.itemName, category: item.category,
      unit: item.unit, transactionType: 'IN',
      quantity: qty, notes, date, balanceAfter: newStock
    });

    showToast(`✅ ${item.itemName} +${qty} ${item.unit} → Stock: ${newStock}`, 'success');
    render();
    App.navigate('dashboard');
  };

  const init = () => {
    document.getElementById('si-item-select').addEventListener('change', updatePreview);
    document.getElementById('si-qty').addEventListener('input', updatePreview);
    document.getElementById('btn-stock-in-submit').addEventListener('click', submit);
  };

  return { render, init };
})();
