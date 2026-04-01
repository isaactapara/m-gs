import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';
import jsPDF from 'jspdf';

let search = '';
let filterStatus = 'ALL';
let selectedBillId = null;

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    day: '2-digit', 
    month: 'short',
    year: 'numeric'
  }).format(date);
};

function renderBills() {
  const isDarkMode = store.isDarkMode;
  const userRole = store.userRole;
  const settings = store.settings;
  const allBills = store.userRole === 'owner' 
      ? store.bills 
      : store.bills.filter(b => b.cashierId === store.currentUser?.id);

  const filteredBills = allBills.filter(bill => {
    const matchesSearch = bill.billNumber.includes(search) || 
                          bill.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || 
                          bill.status === filterStatus || 
                          (filterStatus === 'PAID' && bill.status === 'CONFIRMED');
    return matchesSearch && matchesStatus;
  });

  const html = `
    <div class="h-[calc(100vh-80px)] -m-4 md:-m-8 flex flex-col overflow-hidden bg-gray-50/30 dark:bg-transparent relative">
      <!-- Table Header / Actions -->
      <div class="p-6 border-b flex flex-wrap gap-4 items-center justify-between z-10 backdrop-blur-md ${isDarkMode ? "bg-black/80 border-[#111]" : "bg-white/80 border-gray-100"}">
        <div class="flex items-center gap-6">
          <h2 class="text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Transaction Ledger</h2>
          <div class="flex bg-gray-100 dark:bg-black p-1 rounded-xl border dark:border-[#111]">
            ${['ALL', 'PAID', 'PENDING'].map(status => `
              <button 
                onclick="window.setFilterStatus('${status}')"
                class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === status 
                    ? "bg-white dark:bg-[#111] text-[#FF0000] shadow-sm border dark:border-white/10" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }"
              >
                ${status}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
            <input 
              type="text" 
              id="search-input"
              placeholder="Search by Bill # or Dish..."
              value="${search}"
              class="pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium w-64 transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black border border-[#111] text-white" : "bg-gray-100 border-transparent text-gray-900"}"
            />
          </div>
          ${userRole === 'owner' ? `
            <button class="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-[#FF0000] transition-all">
              <i data-lucide="download" class="w-5 h-5"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Main Table Content -->
      <div class="flex-1 overflow-auto p-2 md:p-6 styled-scrollbar">
        <div class="rounded-3xl md:rounded-[32px] overflow-hidden border shadow-sm ${isDarkMode ? "bg-black border-[#111]" : "bg-white border-gray-100"}">
          <div class="overflow-x-auto w-full">
          <table class="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr class="border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "bg-black border-[#111] text-gray-500" : "bg-gray-50 border-gray-100 text-gray-400"}">
                <th class="px-6 py-4 px-2">Bill Number</th>
                <th class="px-6 py-4 px-2">Date & Time</th>
                <th class="px-6 py-4 px-2">Items</th>
                <th class="px-6 py-4 px-2">Payment</th>
                <th class="px-6 py-4 px-2 text-[#FF0000]">Transaction ID</th>
                <th class="px-6 py-4 px-2">Total Amount</th>
                <th class="px-6 py-4 px-2">Time</th>
                <th class="px-6 py-4 px-2">Status</th>
                <th class="px-6 py-4 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-[#111]">
              ${filteredBills.map((bill) => `
                <tr 
                  onclick="window.openBillModal('${bill.id}')"
                  class="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td class="px-6 py-5 px-2">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/20 text-[#FF0000] flex items-center justify-center">
                        <i data-lucide="receipt-text" class="w-4 h-4"></i>
                      </div>
                      <span class="font-black ${isDarkMode ? "text-white" : "text-gray-900"}">#${store.sanitize(bill.billNumber)}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 px-2">
                    <span class="text-sm font-medium text-gray-500 dark:text-gray-400">${formatDate(bill.timestamp)}</span>
                    ${userRole === 'owner' && bill.cashier ? `<br><span class="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500">${store.sanitize(bill.cashier)}</span>` : ''}
                  </td>
                  <td class="px-6 py-5 max-w-xs px-2">
                    <p class="text-sm font-bold text-gray-600 dark:text-gray-300 truncate">
                      ${bill.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </td>
                  <td class="px-6 py-5 px-2">
                    <div class="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-gray-400">
                      ${bill.paymentMethod === 'M-Pesa' ? '<i data-lucide="smartphone" class="w-3.5 h-3.5 text-green-500"></i>' : ''}
                      ${bill.paymentMethod}
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <span class="text-[10px] font-mono font-bold tracking-tight text-red-600/70 bg-red-50/30 dark:bg-red-900/10 rounded px-2 py-1">
                      ${bill.mpesaReceiptNumber || '—'}
                    </span>
                  </td>
                  <td class="px-6 py-5 px-2">
                    <span class="text-lg font-black text-[#FF0000]">${settings.currency} ${bill.total.toFixed(2)}</span>
                  </td>
                  <td class="px-6 py-5 px-2">
                    <span class="text-[10px] font-bold text-gray-400">
                      ${new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td class="px-6 py-5 px-2">
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      bill.status === 'PAID' || bill.status === 'CONFIRMED'
                        ? "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400" 
                        : "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }">
                      ${bill.status === 'CONFIRMED' ? 'PAID' : bill.status}
                    </span>
                  </td>
                  <td class="px-6 py-5 text-right px-2">
                    <button class="p-2 text-gray-400 hover:text-[#FF0000] opacity-0 group-hover:opacity-100 transition-all">
                      <i data-lucide="chevron-right" class="w-5 h-5"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
              
              ${filteredBills.length === 0 ? `
                <tr>
                  <td colspan="7" class="px-6 py-20 text-center text-gray-400 font-bold">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <!-- Bill Detail Drawer Modal -->
      ${(() => {
        const selectedBill = selectedBillId ? store.bills.find(b => b.id === selectedBillId) : null;
        if (!selectedBill) return '';
        
        return `
        <div 
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] px-6 py-12 flex justify-center items-center transition-opacity"
          onclick="window.closeBillModal()"
        >
          <div 
            class="w-full max-w-2xl rounded-3xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-full transition-transform slide-in-from-bottom-4 ${isDarkMode ? "bg-black border border-[#111]" : "bg-white"}"
            onclick="event.stopPropagation()"
          >
            <div class="bg-[#FF0000] p-10 text-white flex justify-between items-start shrink-0">
              <div>
                <span class="text-xs font-black uppercase tracking-[0.2em] text-white/60 mb-2 block">Invoice Details</span>
                <h2 class="text-5xl font-black">#${store.sanitize(selectedBill.billNumber)}</h2>
                <div class="mt-2 flex flex-col gap-1 text-white/80 font-bold">
                    <p>${formatDate(selectedBill.timestamp)}</p>
                   ${selectedBill.cashier ? `<p class="flex items-center gap-2 text-xs opacity-75"><i data-lucide="user" class="w-3 h-3"></i> Cashier: ${store.sanitize(selectedBill.cashier)}</p>` : ''}
                </div>
              </div>
              <div class="flex flex-col items-end gap-3">
                <span class="bg-white text-[#FF0000] px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl">
                  ${selectedBill.status}
                </span>
                <button onclick="window.closeBillModal()" class="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                  <i data-lucide="x" class="w-6 h-6"></i>
                </button>
              </div>
            </div>

            <div class="p-10 overflow-y-auto flex-1 space-y-10 styled-scrollbar">
              <div>
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Itemized Receipt</h4>
                <div class="space-y-4">
                  ${selectedBill.items.map(item => `
                    <div class="flex justify-between items-center group">
                      <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#111] flex items-center justify-center font-black text-[#FF0000] text-sm border dark:border-white/5">
                          ${item.quantity}x
                        </div>
                        <span class="font-bold text-lg ${isDarkMode ? "text-gray-200" : "text-gray-800"}">${item.name}</span>
                      </div>
                      <span class="font-black text-lg ${isDarkMode ? "text-white" : "text-gray-900"}">
                        ${settings.currency} ${item.price * item.quantity}
                      </span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div class="pt-8 border-t border-gray-100 dark:border-[#111] space-y-4">
                <div class="flex justify-between items-center text-gray-400 font-bold">
                  <span class="uppercase tracking-widest text-xs">Payment Method</span>
                  <span class="text-sm flex items-center gap-2">
                    ${selectedBill.paymentMethod === 'M-Pesa' ? '<i data-lucide="smartphone" class="w-4 h-4 text-green-500"></i>' : ''}
                    ${selectedBill.paymentMethod}
                  </span>
                </div>
                ${selectedBill.mpesaReceiptNumber ? `
                  <div class="flex justify-between items-center text-gray-400 font-bold">
                    <span class="uppercase tracking-widest text-xs">M-Pesa Ref</span>
                    <span class="text-sm text-green-500">${selectedBill.mpesaReceiptNumber}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between items-end pt-4">
                  <span class="text-xl font-black ${isDarkMode ? "text-white" : "text-black"}">Total Amount</span>
                  <span class="text-4xl font-black text-[#FF0000]">${settings.currency} ${selectedBill.total.toFixed(2)}</span>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4 pt-4">
                <button id="download-receipt-btn" class="py-4 rounded-2xl bg-[#FF0000] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-red-500/20 hover:scale-[1.02] transition-transform">
                  <i data-lucide="arrow-down-to-line" class="w-[18px] h-[18px]"></i> Download Receipt
                </button>
                <button class="py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] ${
                  isDarkMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"
                }">
                  <i data-lucide="share-2" class="w-[18px] h-[18px]"></i> Share
                </button>
                ${userRole === 'owner' ? `
                  <button 
                    onclick="window.deleteBill('${selectedBill.id}')"
                    class="py-4 rounded-2xl bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                  >
                    <i data-lucide="trash-2" class="w-[18px] h-[18px]"></i> Delete
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
        `;
      })()}
    </div>
  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/bills.html');
  initLayoutListeners();

  setTimeout(() => {
    createIcons({ icons });
    attachListeners();
  }, 0);
}

function reRender() {
  renderBills();
}

function attachListeners() {
  const downloadBtn = document.getElementById('download-receipt-btn');
  if (downloadBtn && selectedBillId) {
    downloadBtn.addEventListener('click', () => {
      window.downloadReceipt(selectedBillId);
    });
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      search = e.target.value;
      reRender();
    });
    searchInput.focus();
    searchInput.setSelectionRange(search.length, search.length);
  }
}

window.setFilterStatus = (status) => {
  filterStatus = status;
  reRender();
};

window.openBillModal = (billId) => {
  selectedBillId = billId;
  reRender();
};

window.closeBillModal = () => {
  selectedBillId = null;
  reRender();
};

window.downloadReceipt = async (billId) => {
  const bill = store.bills.find(b => b.id === billId);
  if (!bill) return;
  
  const btn = document.getElementById('download-receipt-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> GENERATING...`;
  btn.classList.add('opacity-50', 'pointer-events-none');
  createIcons({ icons });

  try {
    const docHeight = Math.max(150, 120 + (bill.items.length * 12));
    const doc = new jsPDF('p', 'mm', [80, docHeight]);
    const margins = 6;
    const rightMargin = 80 - margins;

    const loadLogo = () => new Promise((resolve) => {
      const img = new Image();
      img.src = '/brand-logo-v2.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
    
    const logoImg = await loadLogo();
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', (80 / 2) - 10, margins, 20, 20);
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("THE", 80/2, margins + 23, { align: 'center' });
    
    doc.setFontSize(18);
    doc.setTextColor(255, 0, 0);
    doc.text("M&G's", 80/2, margins + 29, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("RESTAURANT", 80/2, margins + 34, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Receipt: ${bill.billNumber}`, 80/2, margins + 42, { align: 'center' });
    doc.text(`Date: ${formatDate(bill.timestamp)}`, 80/2, margins + 46, { align: 'center' });
    
    doc.setDrawColor(220, 220, 220);
    doc.line(margins, margins + 50, rightMargin, margins + 50);
    
    // Receipt Details
    let yPos = margins + 56;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("QTY", margins, yPos);
    doc.text("ITEM", margins + 10, yPos);
    doc.text("AMT", rightMargin, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    yPos += 2;
    doc.setDrawColor(200, 200, 200);
    doc.line(margins, yPos, rightMargin, yPos);
    yPos += 6;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    bill.items.forEach(item => {
      doc.text(`${item.quantity}x`, margins, yPos);
      
      const itemName = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;
      doc.text(itemName, margins + 10, yPos);
      
      const itemTotal = `${store.settings.currency} ${(item.price * item.quantity).toLocaleString()}`;
      doc.text(itemTotal, rightMargin, yPos, { align: 'right' });
      yPos += 6;
    });
    
    yPos += 2;
    doc.setDrawColor(240, 240, 240);
    doc.line(margins, yPos, rightMargin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.text("TOTAL:", margins, yPos);
    doc.setTextColor(255, 0, 0);
    doc.text(`${store.settings.currency} ${bill.total.toLocaleString()}`, rightMargin, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Method: ${bill.paymentMethod}`, margins, yPos);
    if (bill.mpesaReceiptNumber) {
      yPos += 4;
      doc.setFont("helvetica", "bold");
      doc.text(`MPESA REF: ${bill.mpesaReceiptNumber}`, margins, yPos);
      doc.setFont("helvetica", "normal");
    }
    
    if (bill.cashier) {
      yPos += 4;
      doc.text(`Served By: ${bill.cashier}`, margins, yPos);
    }

    yPos += 12;
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for dining with us!", 80/2, yPos, { align: 'center' });
    doc.text("Official M&G's Restaurant Receipt", 80/2, yPos + 3, { align: 'center' });
    
    doc.save(`MandGs-Receipt-${bill.billNumber}.pdf`);
  } catch (error) {
    console.error('PDF Receipt Generation Failed:', error);
    btn.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4"></i> DOWNLOAD FAILED`;
    setTimeout(() => {
       btn.innerHTML = originalText;
       createIcons({ icons });
    }, 3000);
  } finally {
    btn.innerHTML = originalText;
    btn.classList.remove('opacity-50', 'pointer-events-none');
    createIcons({ icons });
  }
};

window.deleteBill = (billId) => {
  store.deleteBill(billId);
  selectedBillId = null;
  reRender();
};

store.subscribe(reRender);
renderBills();
