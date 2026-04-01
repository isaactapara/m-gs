import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';

let paymentMethod = 'M-Pesa';
let isSuccess = false;
let payingBillId = null;


function renderHome() {
  const isDarkMode = store.isDarkMode;
  const settings = store.settings;
  
  // Sort menu by frequency (descending) - backend already does this but we'll slice the top 5
  const topItems = store.menu.slice(0, 5);


  const allBills = store.userRole === 'owner' 
      ? store.bills 
      : store.bills.filter(b => b.cashierId === store.currentUser?.id);

  const todayBills = allBills.filter(b => b.timestamp.toDateString() === new Date().toDateString());
  const dailyRevenue = todayBills.reduce((acc, b) => acc + b.total, 0);
  const cart = store.cart;
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const html = `
    <div class="flex flex-col gap-8 duration-500 animate-in fade-in slide-in-from-bottom-4">
      
      <!-- Top Stats Bar -->
      <div class="grid grid-cols-1">
        <div class="p-6 rounded-[32px] border shadow-sm flex items-center justify-between gap-4 ${isDarkMode ? "bg-black border-gray-900" : "bg-white border-gray-100"}">
          <div class="flex items-center gap-4">
            <div class="p-4 rounded-2xl bg-blue-500/10 text-blue-500"><i data-lucide="receipt" class="w-6 h-6"></i></div>
            <div>
              <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Total Bills</p>
              <p class="text-3xl font-black">${todayBills.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-8">
        <!-- Main: Menu Selection -->
        <div class="flex-1 flex flex-col gap-6">
          <div class="${isDarkMode ? "bg-black border-gray-900" : "bg-white border-gray-100"} rounded-[32px] p-8 border shadow-[0_8px_30px_rgb(0,0,0,0.02)] h-full overflow-hidden flex flex-col">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 class="text-2xl font-black tracking-tight">Quick Billing</h2>
                <p class="text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}">Top 5 Trending Items</p>
              </div>
              
              ${store.userRole === 'owner' ? `
                <button onclick="window.location.href='/menu.html'" class="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm">
                  <i data-lucide="edit-3" class="w-4 h-4"></i> Manage Full Menu
                </button>
              ` : ''}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 styled-scrollbar pb-4 min-h-[300px]">
              ${topItems.map((item, index) => {
                const cartItem = cart.find(c => c.id === item.id);
                const quantity = cartItem?.quantity || 0;
                
                return `
                  <div class="rounded-[24px] p-4 flex flex-col justify-between shadow-sm border-2 transition-all cursor-pointer h-[160px] relative overflow-hidden group ${
                      quantity > 0 
                        ? "border-[#FF0000] " + (isDarkMode ? "bg-neutral-950" : "bg-red-50/30") 
                        : "border-transparent " + (isDarkMode ? "bg-black" : "bg-gray-50")
                  }" onclick="window.handleAdd('${item.id}')">
                    ${index === 0 ? `<div class="absolute -right-6 -top-6 w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform duration-500"><i data-lucide="flame" class="w-5 h-5 text-amber-500 ml-3 mt-3"></i></div>` : ''}
                    <div class="relative z-10">
                      <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg mb-2 inline-block ${isDarkMode ? "bg-gray-800 text-gray-500" : "bg-gray-200/50 text-gray-500"}">${item.category}</span>
                      <h3 class="font-black text-sm leading-tight mb-1 line-clamp-2 ${isDarkMode ? "text-white" : "text-gray-900"}">
                        ${item.name}
                      </h3>
                      <p class="font-black text-sm text-[#FF0000]">${settings.currency} ${item.price}</p>
                    </div>
                    <div class="flex items-center justify-between mt-auto pt-2 relative z-10">
                       ${quantity > 0 ? `
                         <div class="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm w-full justify-between" onclick="event.stopPropagation()">
                           <button onclick="window.handleRemove('${item.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[#FF0000] transition-colors"><i data-lucide="minus" class="w-3.5 h-3.5"></i></button>
                           <span class="font-black text-sm w-4 text-center">${quantity}</span>
                           <button onclick="window.handleAdd('${item.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FF0000] text-white shadow-lg shadow-red-500/20"><i data-lucide="plus" class="w-3.5 h-3.5"></i></button>
                         </div>
                       ` : `
                         <div class="ml-auto p-2 rounded-xl text-gray-300 dark:text-gray-700 hover:text-[#FF0000] transition-colors">
                            <i data-lucide="plus-circle"></i>
                         </div>
                       `}
                    </div>
                  </div>
                `;
              }).join('')}
              
              <button onclick="window.location.href='/menu.html'" class="rounded-[24px] p-4 flex flex-col items-center justify-center gap-3 shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-800 transition-all hover:border-[#FF0000] hover:text-[#FF0000] cursor-pointer h-[160px] text-gray-400 ${isDarkMode ? "hover:bg-red-500/5" : "hover:bg-red-50"}">
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-current transition-colors">
                   <i data-lucide="arrow-right" class="w-5 h-5"></i>
                </div>
                <span class="font-black text-sm uppercase tracking-widest text-current">View Full Menu</span>
              </button>
            </div>

            <!-- Bottom Checkout Bar inside the Grid area -->
            <div class="mt-auto pt-8 border-t dark:border-gray-800 flex flex-col xl:flex-row items-center justify-between gap-6">
              <div class="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                <div class="flex flex-col items-center md:items-start w-full md:w-auto">
                  <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Amount</span>
                  <span class="text-3xl font-black text-[#FF0000]">${settings.currency} ${totalAmount}</span>
                </div>
                <div class="h-10 w-px bg-gray-200 dark:bg-gray-800 hidden md:block"></div>
                <div class="flex w-full md:w-auto items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-xl border dark:border-gray-800">
                  ${['M-Pesa', 'Cash'].map(method => `
                    <button onclick="window.setPayment('${method}')" class="flex-1 px-6 py-3 md:py-2 rounded-lg text-sm md:text-xs font-bold transition-all ${
                      paymentMethod === method 
                        ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white" 
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }">
                      ${method}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <button onclick="window.submitOrder('PENDING')" ${cart.length === 0 ? 'disabled' : ''} class="w-full sm:w-auto py-5 sm:py-4 px-8 rounded-2xl font-black transition-all flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <i data-lucide="clock" class="w-5 h-5"></i> PAY LATER
                </button>
                <button onclick="window.submitOrder('PAID')" ${cart.length === 0 || store.isPaymentProcessing ? 'disabled' : ''} class="w-full sm:w-auto py-5 sm:py-4 px-8 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all ${
                  isSuccess ? "bg-green-500 shadow-green-500/40" : 
                  "bg-[#FF0000] shadow-red-500/40 hover:bg-red-600 hover:-translate-y-1"
                } shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none">
                  ${isSuccess ? `<i data-lucide="check-circle" class="w-5 h-5"></i> PAID` : 
                    `<i data-lucide="banknote" class="w-5 h-5"></i> PAY NOW`}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Recent Activity Table View -->
      <div class="rounded-[32px] p-8 border shadow-sm flex flex-col xl:flex-row gap-8 ${isDarkMode ? "bg-black border-gray-900" : "bg-white border-gray-100"}">
        
        <!-- PENDING BILLS -->
        <div class="flex-1">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-black tracking-tight text-amber-500 flex items-center gap-2"><i data-lucide="clock" class="w-5 h-5"></i> Pending Bills</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b dark:border-gray-800">
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Ref No.</th>
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Items</th>
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                ${allBills.filter(b => b.status !== 'PAID' && b.status !== 'CONFIRMED').slice(0, 5).map(bill => `
                  <tr class="group hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors">
                    <td class="py-4 font-bold text-sm">
                      #${bill.billNumber}
                      ${bill.status === 'FAILED' ? '<span class="ml-2 text-[8px] font-black uppercase tracking-widest bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Failed</span>' : ''}
                    </td>
                    <td class="py-4 text-xs font-medium max-w-[150px] truncate">${bill.items.map(i => i.name).join(', ')}</td>
                    <td class="py-4 text-right">
                       <button onclick="window.promptPaymentMethod('${bill.id}')" class="text-[9px] px-3 py-1.5 rounded-full font-black uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 transition-colors shadow-sm border border-amber-200 dark:border-amber-800/50 flex items-center justify-end gap-1 w-full group">
                         COLLECT <i data-lucide="arrow-right" class="w-3 h-3 group-hover:translate-x-1 transition-transform"></i>
                       </button>
                    </td>
                  </tr>
                `).join('')}
                ${allBills.filter(b => b.status !== 'PAID' && b.status !== 'CONFIRMED').length === 0 ? `
                  <tr>
                    <td colspan="4" class="py-6 text-center text-xs font-bold text-gray-400">No pending bills</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="w-px bg-gray-100 dark:bg-gray-950 hidden xl:block"></div>
        <div class="h-px bg-gray-100 dark:bg-gray-950 xl:hidden"></div>

        <!-- PAID BILLS -->
        <div class="flex-1">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-black tracking-tight text-green-500 flex items-center gap-2"><i data-lucide="check-circle" class="w-5 h-5"></i> Settled Bills</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b dark:border-gray-950">
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Ref No.</th>
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Method</th>
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Transaction ID</th>
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Amount</th>
                  <th class="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-950">
                ${allBills.filter(b => b.status === 'PAID' || b.status === 'CONFIRMED').slice(0, 5).map(bill => `
                  <tr class="group hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                    <td class="py-4 font-bold text-sm">#${bill.billNumber}</td>
                    <td class="py-4 text-xs font-bold">${bill.paymentMethod}</td>
                    <td class="py-4 text-[10px] font-mono font-bold tracking-tight text-red-600/70 bg-red-50/30 dark:bg-black border dark:border-gray-900 rounded-lg px-3 text-center">
                      ${bill.mpesaReceiptNumber || '—'}
                    </td>
                    <td class="py-4 text-right font-black text-gray-600 dark:text-gray-300">${settings.currency} ${bill.total.toFixed(2)}</td>
                    <td class="py-4 text-right text-[10px] font-bold text-gray-400">
                      ${new Date(bill.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                `).join('')}
                ${allBills.filter(b => b.status === 'PAID' || b.status === 'CONFIRMED').length === 0 ? `
                  <tr>
                    <td colspan="5" class="py-6 text-center text-xs font-bold text-gray-400">No settled bills</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
    
    <!-- Payment Method Modal -->
    ${payingBillId ? `
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in" onclick="window.cancelPayment()">
        <div class="p-8 rounded-[40px] shadow-2xl w-full max-w-sm flex flex-col gap-6 scale-in-center ${isDarkMode ? "bg-gray-950 border border-gray-900" : "bg-white"}" onclick="event.stopPropagation()">
          <div class="text-center space-y-2">
            <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-500 dark:bg-black border dark:border-gray-900 flex items-center justify-center mx-auto mb-4">
              <i data-lucide="banknote" class="w-8 h-8"></i>
            </div>
            <h3 class="text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Collect Payment</h3>
            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Select payment method to settle bill</p>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <button onclick="window.confirmPayment('M-Pesa')" class="py-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-2 border-transparent bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-500 dark:hover:bg-green-900/40">
              <i data-lucide="smartphone" class="w-6 h-6"></i>
              <span class="text-xs font-black uppercase tracking-wider">M-Pesa</span>
            </button>
            <button onclick="window.confirmPayment('Cash')" class="py-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-2 border-transparent bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-500 dark:hover:bg-blue-900/40">
              <i data-lucide="banknote" class="w-6 h-6"></i>
              <span class="text-xs font-black uppercase tracking-wider">Cash</span>
            </button>
          </div>
          <button onclick="window.cancelPayment()" class="w-full py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    ` : ''}


  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/');
  initLayoutListeners();
  createIcons({ icons });
  // Initial render handled by script tags
}

function reRender() {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(() => renderHome());
  } else {
    renderHome();
  }
}

window.handleAdd = (itemId) => {
  const item = store.menu.find(i => i.id === itemId);
  if (item) store.addToCart(item);
};

window.handleRemove = (itemId) => {
  store.removeFromCart(itemId);
};

window.setPayment = (method) => {
  paymentMethod = method;
  reRender();
};

window.submitOrder = async (targetStatus = 'PAID') => {
  if (store.cart.length === 0) return;
  const totalAmount = store.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const billData = {
    items: [...store.cart],
    total: totalAmount,
    status: targetStatus,
    paymentMethod,
  };



  try {
    await store.createBill(billData);
    if (targetStatus === 'PAID') {
      isSuccess = true;
      setTimeout(() => {
        isSuccess = false;
        reRender();
      }, 2000);
    }
    store.clearCart();
  } catch (err) {
    console.error('Submit Order Error:', err);
    // You could add an error state here if needed
  }
  reRender();
};



window.promptPaymentMethod = (billId) => {
  payingBillId = billId;
  reRender();
};

window.cancelPayment = () => {
  payingBillId = null;
  reRender();
};

window.confirmPayment = (method) => {
  if (payingBillId) {
    store.updateBillStatus(payingBillId, 'PAID', method);
    payingBillId = null;
    reRender();
  }
};

// Handle cross-page cache properly
store.subscribe(reRender);
renderHome();
