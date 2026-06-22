// reports.js - Reports and Export (Excel + PDF)

const Reports = (() => {
  let currentReport = 'current-stock';
  let reportFrom = '';
  let reportTo = '';

  const getData = () => {
    const items = DB.getInventory();
    if (currentReport === 'current-stock') {
      return items.map(i => ({
        'Item Name': i.itemName, 'Category': i.category, 'Unit': i.unit,
        'Current Stock': i.currentStock, 'Minimum Stock': i.minimumStock,
        'Status': Alerts.getItemStatus(i) === 'out' ? 'Out of Stock' : Alerts.getItemStatus(i) === 'low' ? 'Low Stock' : 'In Stock'
      }));
    }
    if (currentReport === 'low-stock') {
      return items.filter(i => i.currentStock <= i.minimumStock).map(i => ({
        'Item Name': i.itemName, 'Category': i.category, 'Unit': i.unit,
        'Current Stock': i.currentStock, 'Minimum Stock': i.minimumStock,
        'Status': i.currentStock <= 0 ? 'Out of Stock' : 'Low Stock'
      }));
    }
    if (currentReport === 'stock-movement') {
      let txns = DB.getTransactions();
      if (reportFrom) txns = txns.filter(t => t.date >= reportFrom);
      if (reportTo) txns = txns.filter(t => t.date <= reportTo);
      txns.sort((a, b) => new Date(b.date) - new Date(a.date));
      return txns.map(t => ({
        'Date': formatDate(t.date), 'Item Name': t.itemName, 'Category': t.category || '',
        'Type': t.transactionType,
        'Quantity': (t.transactionType === 'IN' ? '+' : '-') + t.quantity,
        'Balance': t.balanceAfter + ' ' + (t.unit || ''),
        'Notes': t.notes || ''
      }));
    }
    return [];
  };

  const renderTable = (data) => {
    const c = document.getElementById('report-table-container');
    if (data.length === 0) {
      c.innerHTML = `<div class="empty-state"><p>No data for this report.</p></div>`; return;
    }
    const headers = Object.keys(data[0]);
    c.innerHTML = `
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${data.map(row => `<tr>${headers.map(h => {
            const v = row[h];
            if (h === 'Status') { const cls = v === 'Out of Stock' ? 'badge-danger' : v === 'Low Stock' ? 'badge-warning' : 'badge-success'; return `<td><span class="badge ${cls}">${v}</span></td>`; }
            if (h === 'Type') { return `<td><span class="badge ${v === 'IN' ? 'badge-success' : 'badge-danger'}">${v}</span></td>`; }
            return `<td>${v}</td>`;
          }).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
  };

  const render = () => {
    const dateRange = document.getElementById('report-date-range');
    dateRange.style.display = currentReport === 'stock-movement' ? 'flex' : 'none';
    renderTable(getData());
  };

  const exportExcel = () => {
    const data = getData();
    if (!data.length) { showToast('No data to export.', 'error'); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `DreamCafe_${currentReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel file downloaded! 📊', 'success');
  };

  const exportPDF = () => {
    const data = getData();
    if (!data.length) { showToast('No data to export.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const keys = Object.keys(data[0]);
    const doc = new jsPDF({ orientation: keys.length > 5 ? 'landscape' : 'portrait' });
    const titles = { 'current-stock': 'Current Stock Report', 'low-stock': 'Low Stock Report', 'stock-movement': 'Stock Movement Report' };
    doc.setFontSize(16); doc.setTextColor(0, 201, 167);
    doc.text('☕ Dream Cafe Stock Manager', 14, 18);
    doc.setFontSize(11); doc.setTextColor(80, 80, 80);
    doc.text(titles[currentReport], 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    doc.autoTable({
      head: [keys],
      body: data.map(row => keys.map(k => String(row[k]))),
      startY: 38,
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [0, 201, 167], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });
    doc.save(`DreamCafe_${currentReport}_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF downloaded! 📄', 'success');
  };

  const init = () => {
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentReport = tab.dataset.report;
        render();
      });
    });
    document.getElementById('btn-export-excel').addEventListener('click', exportExcel);
    document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
    document.getElementById('report-from').addEventListener('change', (e) => { reportFrom = e.target.value; render(); });
    document.getElementById('report-to').addEventListener('change', (e) => { reportTo = e.target.value; render(); });
  };

  return { render, init };
})();
