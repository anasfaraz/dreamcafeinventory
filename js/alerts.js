// alerts.js - WhatsApp alert integration via Green-API

const Alerts = (() => {
  const getItemStatus = (item) => {
    if (item.currentStock <= 0) return 'out';
    if (item.currentStock <= item.minimumStock) return 'low';
    return 'ok';
  };

  const sendWhatsApp = async (message) => {
    const settings = DB.getSettings();
    if (!settings.alertsEnabled || !settings.whatsappPhone || !settings.greenApiInstance || !settings.greenApiToken) return false;
    
    const cleanPhone = settings.whatsappPhone.replace(/\D/g, '').replace(/^00/, '');
    const url = `https://api.green-api.com/waInstance${settings.greenApiInstance}/sendMessage/${settings.greenApiToken}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: `${cleanPhone}@c.us`,
          message: message
        })
      });
      return response.ok;
    } catch (err) {
      console.error('[DreamCafe] Green-API alert error:', err);
      return false;
    }
  };

  const checkAndAlert = async (item) => {
    const settings = DB.getSettings();
    if (!settings.alertsEnabled) {
      console.log(`[DreamCafe] Stock alert for ${item.itemName} skipped (alerts disabled).`);
      return;
    }
    if (!settings.whatsappPhone || !settings.greenApiInstance || !settings.greenApiToken) {
      console.warn('[DreamCafe] WhatsApp credentials not fully configured in Settings.');
      showToast('⚠️ WhatsApp alert not sent: check Settings', 'warning');
      return;
    }

    const status = getItemStatus(item);
    if (status === 'out') {
      const msg = `🔴 Dream Cafe ALERT!\n${item.itemName} is OUT OF STOCK!\nCurrent: 0 ${item.unit}\nPlease reorder immediately.`;
      const sent = await sendWhatsApp(msg);
      if (sent) {
        showToast(`📱 WhatsApp sent: ${item.itemName} OUT OF STOCK`, 'warning');
      } else {
        showToast(`❌ WhatsApp failed: ${item.itemName} OUT OF STOCK`, 'error');
      }
    }
  };

  const testAlert = async () => {
    const msg = `✅ Dream Cafe Stock Manager\nThis is a TEST alert.\nWhatsApp alerts are working correctly!\nTime: ${new Date().toLocaleString()}`;
    const sent = await sendWhatsApp(msg);
    if (sent) showToast('📱 Test WhatsApp message sent!', 'success');
    else showToast('⚠️ Not configured. Please enter Green-API details in Settings.', 'error');
    return sent;
  };

  const sendDailySummary = async (dateStr) => {
    const summary = DB.getFinancesSummary(dateStr);
    const records = DB.getFinances().filter(r => r.date === dateStr);
    const formattedDate = formatDate(dateStr);
    const fmt = (val) => '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    let msg = `☕ *DREAM CAFE DAILY SUMMARY*\n📅 Date: *${formattedDate}*\n\n`;
    
    msg += `💰 *INCOME:*\n`;
    msg += `• Cash: ${fmt(summary.cashIncome)}\n`;
    msg += `• Online: ${fmt(summary.onlineIncome)}\n`;
    msg += `• *Total Income:* *${fmt(summary.totalIncome)}*\n\n`;
    
    msg += `💸 *EXPENSES:*\n`;
    msg += `• Cash: ${fmt(summary.cashExpense)}\n`;
    msg += `• Online: ${fmt(summary.onlineExpense)}\n`;
    msg += `• *Total Expenses:* *${fmt(summary.totalExpense)}*\n\n`;
    
    msg += `⚖️ *NET BALANCE:* *${fmt(summary.net)}*\n\n`;
    
    const expenses = records.filter(r => r.type === 'EXPENSE');
    if (expenses.length > 0) {
      msg += `📋 *PURCHASED ITEMS LIST:*\n`;
      expenses.forEach(e => {
        msg += `• ${e.category}: -${fmt(e.amount)} (${e.paymentMethod})\n`;
      });
      msg += `\n`;
    }
    
    const items = DB.getInventory();
    const outItems = items.filter(i => i.currentStock <= 0);
    const lowItems = items.filter(i => i.currentStock > 0 && i.currentStock <= i.minimumStock);
    
    if (outItems.length > 0 || lowItems.length > 0) {
      msg += `⚠️ *STOCK ALERTS:*\n`;
      outItems.forEach(i => {
        msg += `• 🔴 *${i.itemName}* (OUT OF STOCK)\n`;
      });
      lowItems.forEach(i => {
        msg += `• 🟡 *${i.itemName}* (Low: ${i.currentStock} ${i.unit})\n`;
      });
    } else {
      msg += `✅ *STOCK STATUS:*\n• All items are well stocked!\n`;
    }
    
    const sent = await sendWhatsApp(msg);
    return sent;
  };
  
  const checkAndSendDailySummary = async () => {
    const settings = DB.getSettings();
    if (!settings.alertsEnabled || !settings.whatsappPhone) return;
    
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMins}`;
    
    const targetTime = settings.dailySummaryTime || '21:00';
    const lastSentDate = localStorage.getItem('dcm_last_summary_date') || '';
    
    if (lastSentDate !== currentDate && currentTime >= targetTime) {
      const sent = await sendDailySummary(currentDate);
      if (sent) {
        localStorage.setItem('dcm_last_summary_date', currentDate);
        showToast('📱 Daily summary automated WhatsApp sent!', 'success');
      }
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().split('T')[0];
    
    const lastSentCatchUpDate = localStorage.getItem('dcm_last_summary_catchup') || '';
    if (lastSentDate && lastSentDate < yesterdayDateStr && lastSentCatchUpDate !== yesterdayDateStr) {
      const sent = await sendDailySummary(yesterdayDateStr);
      if (sent) {
        localStorage.setItem('dcm_last_summary_catchup', yesterdayDateStr);
        showToast(`📱 Sent catch-up summary for yesterday (${formatDate(yesterdayDateStr)})`, 'info');
      }
    }
  };

  return { getItemStatus, sendWhatsApp, checkAndAlert, testAlert, sendDailySummary, checkAndSendDailySummary };
})();
