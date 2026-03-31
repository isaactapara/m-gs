import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';

let search = '';
let selectedCategory = 'All';
let isAddItemOpen = false;
let editingItem = null;
let paymentMethod = 'M-Pesa';
let paymentStatus = 'idle';
let isMpesaPromptOpen = false;
let mpesaStatus = null; // null, 'sending', 'pending', 'success', 'error'
let mpesaError = '';
let mpesaPhone = '';
let pendingOrderData = null;

// Form Data State
let formData = {
  name: '',
  price: '',
  category: 'Mains'
};

function renderMenu() {
  const isDarkMode = store.isDarkMode;
  const userRole = store.userRole;
  const settings = store.settings;
  const cart = store.cart;

  const filteredMenu = store.menu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamically extract categories from the database items
  const uniqueCategories = ['All', ...new Set(store.menu.map(item => item.category))];

  const html = `
    <div class="h-[calc(100vh-80px)] -m-4 md:-m-8 flex flex-col lg:flex-row overflow-hidden relative">
      
      <!-- Main Content Area (Menu Grid) -->
      <div class="flex-1 flex flex-col overflow-hidden bg-gray-50/30 dark:bg-black relative">
        <!-- Search & Actions Header -->
        <div class="p-6 border-b flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10 backdrop-blur-md ${isDarkMode ? "bg-black/80 border-gray-900" : "bg-white/80 border-gray-200"}">
          <div class="flex items-center gap-4 flex-1 min-w-[300px]">
            <div class="relative flex-1 max-w-md">
              <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
              <input 
                type="text" 
                id="search-input"
                placeholder="Find dishes, drinks, appetizers..."
                value="${search}"
                class="w-full pl-12 pr-4 py-3 rounded-2xl text-sm font-medium transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black text-white border-gray-900 border" : "bg-gray-100 text-gray-900 border-transparent shadow-sm"}"
              />
            </div>
            
            <div class="flex flex-wrap gap-2">
              ${uniqueCategories.map(cat => `
                <button onclick="window.setCategory('${cat}')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-[#FF0000] text-white shadow-lg shadow-red-500/20"
                    : "bg-gray-200 dark:bg-black border dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-900"
                }">
                  ${store.sanitize(cat)}
                </button>
              `).join('')}
            </div>
          </div>

          ${userRole === 'owner' ? `
            <button 
              onclick="window.openAddItemModal()"
              class="px-6 py-3 bg-[#FF0000] text-white rounded-2xl flex items-center gap-2 font-bold shadow-xl shadow-red-500/30 active:scale-95 transition-all"
            >
              <i data-lucide="plus-circle" class="w-5 h-5"></i>
              Add New Item
            </button>
          ` : ''}
        </div>

        <!-- Menu Grid -->
        <div class="p-6 overflow-y-auto flex-1 h-full pb-24">
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            ${filteredMenu.map(item => {
              const cartItem = cart.find(c => c.id === item.id);
              const quantity = cartItem?.quantity || 0;

              return `
                <div class="rounded-[28px] p-6 flex flex-col justify-between shadow-xl border-2 transition-all relative group cursor-pointer ${
                    quantity > 0 
                      ? "border-[#FF0000] " + (isDarkMode ? "bg-black" : "bg-red-50/20") 
                      : "border-transparent hover:border-gray-300 dark:hover:border-gray-700 " + (isDarkMode ? "bg-black" : "bg-white")
                  }" onclick="window.handleAdd('${item.id}')">
                  
                  ${userRole === 'owner' ? `
                    <div class="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onclick="window.openEditModal('${item.id}'); event.stopPropagation();"
                        class="p-2 bg-blue-500 text-white rounded-xl shadow-lg hover:bg-blue-600"
                      >
                        <i data-lucide="edit-2" class="w-[14px] h-[14px]"></i>
                      </button>
                      <button 
                        onclick="window.deleteItem('${item.id}'); event.stopPropagation();"
                        class="p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600"
                      >
                        <i data-lucide="trash-2" class="w-[14px] h-[14px]"></i>
                      </button>
                    </div>
                  ` : ''}

                  <div class="space-y-4 relative z-10 pointer-events-none">
                    <div class="flex justify-between items-start">
                      <div class="space-y-1">
                        <span class="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-[10px] font-black uppercase tracking-widest text-[#FF0000] rounded-full">
                          ${store.sanitize(item.category)}
                        </span>
                        <h3 class="font-black text-lg leading-tight mt-2 ${isDarkMode ? "text-white" : "text-gray-900"}">
                          ${store.sanitize(item.name)}
                        </h3>
                      </div>
                      <div class="text-right">
                        <p class="text-xl font-black text-[#FF0000]">${settings.currency} ${item.price}</p>
                      </div>
                    </div>
                  </div>

                  <div class="mt-8 flex items-center justify-between bg-gray-50 dark:bg-black border dark:border-gray-900 rounded-2xl p-2 relative z-10">
                     ${quantity > 0 ? `
                        <div class="flex items-center gap-3 w-full justify-between" onclick="event.stopPropagation()">
                          <button 
                            onclick="window.handleRemove('${item.id}')"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-700 border dark:border-gray-600 shadow-sm text-[#FF0000] active:scale-90 transition-transform"
                          >
                            <i data-lucide="minus" class="w-[18px] h-[18px]"></i>
                          </button>
                          <span class="font-black text-lg w-8 text-center ${isDarkMode ? "text-white" : "text-gray-900"}">
                            ${quantity}
                          </span>
                          <button 
                            onclick="window.handleAdd('${item.id}')"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-[#FF0000] text-white shadow-lg shadow-red-500/20 active:scale-90 transition-transform"
                          >
                            <i data-lucide="plus" class="w-[18px] h-[18px]"></i>
                          </button>
                        </div>
                     ` : `
                       <div class="w-full py-3 flex items-center justify-center gap-2 rounded-xl font-black text-sm transition-all bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-[#FF0000] hover:text-white pointer-events-none">
                         <i data-lucide="plus" class="w-[18px] h-[18px]"></i> Add to Order
                       </div>
                     `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Checkout Sidebar (Right Side) -->
      <div class="w-full lg:w-[450px] border-l flex flex-col p-8 lg:h-full shadow-2xl z-20 ${isDarkMode ? "bg-black border-gray-900" : "bg-white border-gray-200"}">
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-[#FF0000] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <i data-lucide="shopping-cart" class="w-6 h-6"></i>
            </div>
            <div>
               <h2 class="text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Current Order</h2>
               <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">${cartItemCount} items selected</p>
            </div>
          </div>
          <button onclick="window.clearCart()" class="text-xs font-bold text-gray-400 hover:text-[#FF0000] tracking-widest uppercase transition-colors">
            Clear
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4 mb-8 styled-scrollbar pr-2">
          ${cart.length === 0 ? `
            <div class="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 opacity-50">
              <i data-lucide="shopping-bag" class="w-16 h-16 stroke-1"></i>
              <p class="font-bold text-sm tracking-widest uppercase">Cart is empty</p>
            </div>
          ` : cart.map(item => `
              <div class="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-black/50 border dark:border-gray-900 relative group">
                <div class="w-12 h-12 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center font-black text-[#FF0000] shadow-sm">
                  ${item.quantity}x
                </div>
                <div class="flex-1">
                  <p class="font-bold text-sm leading-tight ${isDarkMode ? "text-gray-200" : "text-gray-800"}">${item.name}</p>
                  <p class="text-xs text-gray-400 font-bold mt-1">${settings.currency} ${item.price}</p>
                </div>
                <div class="text-right">
                  <p class="font-black ${isDarkMode ? "text-white" : "text-gray-900"}">${settings.currency} ${item.price * item.quantity}</p>
                </div>
                <button 
                  onclick="window.handleRemove('${item.id}')"
                  class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-100 text-red-500 border border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white dark:bg-red-900/50 dark:border-red-500/30"
                >
                  <i data-lucide="x" class="w-3 h-3"></i>
                </button>
              </div>
          `).join('')}
        </div>

        ${cart.length > 0 ? `
          <div class="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <div class="flex justify-between items-end">
              <span class="font-black text-xl text-gray-500 uppercase tracking-widest">Total</span>
              <span class="text-4xl font-black text-[#FF0000]">${settings.currency} ${cartTotal}</span>
            </div>

            <!-- Payment Methods -->
            <div class="flex gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-black border dark:border-gray-900">
              ${['M-Pesa', 'Cash'].map(method => `
                <button onclick="window.setPayment('${method}')" class="flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  paymentMethod === method 
                    ? "bg-white dark:bg-black shadow-sm text-gray-900 dark:text-white border dark:border-gray-900" 
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }">
                  ${method}
                </button>
              `).join('')}
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button 
                onclick="window.submitOrder('PENDING')"
                class="py-4 rounded-2xl font-black transition-all flex flex-col items-center justify-center gap-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-2 border-transparent hover:border-amber-500/30"
              >
                <i data-lucide="clock" class="w-6 h-6 mb-1"></i> PAY LATER
              </button>
              <button onclick="window.submitOrder('PAID')" ${cart.length === 0 || store.isPaymentProcessing ? 'disabled' : ''} class="w-full sm:w-auto py-5 sm:py-4 px-8 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all ${
                  paymentStatus === 'success' ? "bg-green-500 shadow-green-500/40" : 
                  paymentStatus === 'error' ? "bg-amber-500 shadow-amber-500/40" : 
                  "bg-[#FF0000] shadow-red-500/40 hover:bg-red-600 hover:-translate-y-1"
                } shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none">
                  ${paymentStatus === 'success' ? `<i data-lucide="check-circle-2" class="w-5 h-5"></i> PAID` : 
                    paymentStatus === 'error' ? `<i data-lucide="alert-circle" class="w-5 h-5"></i> FAILED` : 
                    `<i data-lucide="banknote" class="w-5 h-5"></i> PAY NOW`}
                </button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Add/Edit Overlay Drawer -->
      ${isAddItemOpen ? `
        <div 
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity animate-in fade-in"
          onclick="window.closeAddItemModal()"
        ></div>
        <div class="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 shadow-2xl p-8 flex flex-col transition-transform slide-in-from-right animate-in ${isDarkMode ? "bg-black border-l border-gray-900" : "bg-white"}">
          <div class="flex justify-between items-center mb-10">
            <h2 class="text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">
              ${editingItem ? 'Edit Dish' : 'New Dish'}
            </h2>
            <button onclick="window.closeAddItemModal()" class="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500">
              <i data-lucide="x" class="w-6 h-6"></i>
            </button>
          </div>

          <form id="add-item-form" class="space-y-6">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Dish Name</label>
              <input 
                id="form-name"
                required
                value="${formData.name}"
                class="w-full p-4 rounded-2xl font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black border border-gray-900 text-white" : "bg-gray-50 text-gray-900 border-transparent"}"
                placeholder="e.g. Masala Chips"
              />
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Price (${settings.currency})</label>
              <input 
                type="number"
                id="form-price"
                required min="1"
                value="${formData.price}"
                class="w-full p-4 rounded-2xl font-black transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black border border-gray-900 text-white" : "bg-gray-50 text-gray-900 border-transparent"}"
              />
            </div>

            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Category</label>
              <select
                id="form-category"
                required
                class="w-full p-4 rounded-2xl font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black border border-gray-900 text-white" : "bg-gray-50 text-gray-900 border-transparent"}"
              >
                <option value="Mains" ${formData.category === 'Mains' ? 'selected' : ''}>Main Courses</option>
                <option value="Snacks" ${formData.category === 'Snacks' ? 'selected' : ''}>Snacks</option>
                <option value="Hot Beverages" ${formData.category === 'Hot Beverages' ? 'selected' : ''}>Hot Beverages</option>
                <option value="Sides" ${formData.category === 'Sides' ? 'selected' : ''}>Side Dishes</option>
                <option value="Drinks" ${formData.category === 'Drinks' ? 'selected' : ''}>Drinks</option>
                <option value="Staples" ${formData.category === 'Staples' ? 'selected' : ''}>Staples</option>
                <option value="Vegetables" ${formData.category === 'Vegetables' ? 'selected' : ''}>Vegetables</option>
              </select>
            </div>

            <button
              type="submit"
              class="w-full mt-10 py-5 rounded-[24px] bg-[#FF0000] text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
            >
              <i data-lucide="check-circle-2" class="w-5 h-5"></i> Save Changes
            </button>
          </form>
        </div>
      ` : ''}

      <!-- M-Pesa Phone Prompt Modal -->
      ${isMpesaPromptOpen ? `
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in">
          <div class="p-10 rounded-[40px] shadow-2xl w-full max-w-sm flex flex-col gap-6 scale-in-center ${isDarkMode ? "bg-gray-950 border border-gray-900" : "bg-white"}">
            <div class="text-center space-y-4">
              <div class="w-20 h-20 rounded-3xl bg-green-100 text-green-600 dark:bg-green-500/10 flex items-center justify-center mx-auto shadow-inner">
                <i data-lucide="smartphone" class="w-10 h-10"></i>
              </div>
              <h3 class="text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">M-Pesa Push</h3>
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Enter customer's M-Pesa number</p>
            </div>
            
            <div class="space-y-4">
              <div class="relative group">
                <i data-lucide="phone" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF0000] transition-colors"></i>
                <input 
                  type="tel" 
                  id="mpesa-phone-input"
                  placeholder="07XXXXXXXX"
                  value="${mpesaPhone}"
                  oninput="window.mpesaPhone = this.value"
                  class="w-full pl-14 pr-5 py-5 rounded-2xl text-lg font-black tracking-widest transition-all focus:ring-4 focus:ring-red-500/10 focus:outline-none ${isDarkMode ? "bg-gray-800 text-white border-transparent" : "bg-gray-50 text-gray-900 border-transparent shadow-inner"}"
                />
              </div>
              
              <button onclick="window.triggerStkPush()" class="w-full py-5 rounded-2xl bg-[#FF0000] text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" ${store.isPaymentProcessing ? 'disabled' : ''}>
                ${mpesaStatus === 'sending' ? 'Connecting...' : 'Send STK Push'}
              </button>
              <button onclick="window.closeMpesaPrompt()" class="w-full py-4 rounded-2xl font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- STK Pushing Overlay -->
      ${mpesaStatus ? `
        <div class="fixed inset-0 bg-[#FF0000]/95 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center text-white px-8 text-center animate-in fade-in" 
             ${mpesaStatus === 'pending' ? 'onclick="window.cancelMpesa()"' : ''}>
          
          <div class="relative mb-12">
            ${mpesaStatus === 'sending' || mpesaStatus === 'pending' ? `
              <div class="w-12 h-12 bg-white rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <i data-lucide="smartphone" class="w-12 h-12 animate-bounce"></i>
              </div>
            ` : ''}

            ${mpesaStatus === 'success' ? `
              <div class="w-32 h-32 rounded-full bg-white flex items-center justify-center text-[#00FF00] scale-in-center shadow-2xl">
                <i data-lucide="check" class="w-16 h-16 stroke-[4]"></i>
              </div>
            ` : ''}

            ${mpesaStatus === 'error' ? `
              <div class="w-32 h-32 rounded-full bg-white flex items-center justify-center text-[#FF0000] scale-in-center shadow-2xl">
                <i data-lucide="x" class="w-16 h-16 stroke-[4]"></i>
              </div>
            ` : ''}
          </div>

          <h2 class="text-4xl font-black mb-4 tracking-tight">
            ${mpesaStatus === 'pending' || mpesaStatus === 'sending' ? 'Waiting for PIN' : ''}
            ${mpesaStatus === 'processing' || mpesaStatus === 'verifying' ? 'Verifying...' : ''}
            ${mpesaStatus === 'success' ? 'Settled!' : ''}
            ${mpesaStatus === 'error' ? 'Payment Failed' : ''}
          </h2>

          <p class="text-lg font-bold opacity-80 max-w-sm mx-auto">
            ${mpesaStatus === 'pending' || mpesaStatus === 'sending' ? `M-Pesa push sent to <span class="underline">${mpesaPhone}</span>. Confirm the prompt on your phone.` : ''}
            ${mpesaStatus === 'processing' || mpesaStatus === 'verifying' ? 'Your payment is being verified by Safaricom. Please wait...' : ''}
            ${mpesaStatus === 'success' ? `Excellent! Payment confirmed.<br><span class="text-xs opacity-60 font-mono mt-2 block">REF: ${window.lastPaymentReceipt || 'Captured'}</span>` : ''}
            ${mpesaStatus === 'error' ? mpesaError : ''}
          </p>

          ${mpesaStatus === 'pending' || mpesaStatus === 'processing' ? `
            <p class="mt-8 text-[10px] font-black uppercase tracking-widest opacity-50">Click anywhere to cancel</p>
          ` : ''}

          ${mpesaStatus === 'error' ? `
            <button onclick="window.closeMpesaError()" class="mt-12 px-8 py-4 bg-white text-[#FF0000] rounded-2xl font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95 shadow-xl">
              Retry Payment
            </button>
          ` : ''}

          ${mpesaStatus === 'sending' || mpesaStatus === 'pending' ? `
            <div class="mt-12 flex gap-2">
               <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
               <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
               <div class="w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/menu.html');
  initLayoutListeners();
  
  setTimeout(() => {
    createIcons({ icons });
    attachListeners();
  }, 0);
}

function reRender() {
  renderMenu();
}

function attachListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      search = e.target.value;
      reRender();
    });
    searchInput.focus();
    searchInput.setSelectionRange(search.length, search.length);
  }

  const addItemForm = document.getElementById('add-item-form');
  if (addItemForm) {
    addItemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newName = document.getElementById('form-name').value;
      const newPrice = Number(document.getElementById('form-price').value);
      const newCat = document.getElementById('form-category').value;

      if (editingItem) {
        store.updateMenuItem(editingItem, {
          name: newName,
          price: newPrice,
          category: newCat
        });
      } else {
        store.addMenuItem({
          name: newName,
          price: newPrice,
          category: newCat
        });
      }

      isAddItemOpen = false;
      editingItem = null;
      reRender();
    });
  }
}

window.setCategory = (cat) => {
  search = ''; // reset search when changing category
  selectedCategory = cat;
  reRender();
};

window.handleAdd = (itemId) => {
  const item = store.menu.find(i => i.id === itemId);
  if (item) store.addToCart(item);
};

window.handleRemove = (itemId) => {
  store.removeFromCart(itemId);
};

window.clearCart = () => {
  store.clearCart();
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

  if (targetStatus === 'PAID' && paymentMethod === 'M-Pesa') {
    pendingOrderData = billData;
    isMpesaPromptOpen = true;
    reRender();
    return;
  }

  try {
    const newBill = await store.createBill(billData);
    
    if (targetStatus === 'PAID') {
      paymentStatus = 'success';
      reRender();
      setTimeout(() => {
        paymentStatus = 'idle';
        reRender();
      }, 2000);
    }
    store.clearCart();
  } catch (err) {
    console.error('Submit Order Error:', err);
    paymentStatus = 'error';
    reRender();
    setTimeout(() => { paymentStatus = 'idle'; reRender(); }, 3000);
  }

  reRender();
};

window.closeMpesaPrompt = () => {
  isMpesaPromptOpen = false;
  pendingOrderData = null;
  reRender();
};

window.triggerStkPush = () => {
  if (store.isPaymentProcessing) return;
  const phone = document.getElementById('mpesa-phone-input')?.value || mpesaPhone;
  if (!phone || phone.length < 10) {
    mpesaError = "Please enter a valid M-Pesa phone number";
    mpesaStatus = 'error';
    reRender();
    return;
  }
  
  mpesaPhone = phone;
  isMpesaPromptOpen = false;
  mpesaStatus = 'pending'; // Transition IMMEDIATELY to waiting screen
  store.isPaymentProcessing = true;
  reRender();

  (async () => {
    if (pendingOrderData) {
      try {
        const newBill = await store.createBill({
          ...pendingOrderData,
          paymentMethod: 'M-Pesa',
          status: 'PENDING'
        });

        if (newBill && newBill._id) {
          const res = await store.triggerStkPushApi(phone, pendingOrderData.total, newBill._id);
          
          if (res.ok) {
            // Background polling starts immediately
            const pollResult = await store.pollBillStatus(newBill.id || newBill._id, (status) => {
              if (status === 'PAID' || status === 'CONFIRMED' || status === 'verifying') {
                mpesaStatus = status === 'verifying' ? 'verifying' : 'success';
                reRender();
              }
            });
            
            if (pollResult.success) {
              window.lastPaymentReceipt = pollResult.bill?.mpesaReceiptNumber;
              store.clearCart();
              mpesaStatus = 'success';
              reRender();
              setTimeout(() => {
                mpesaStatus = null;
                window.lastPaymentReceipt = null;
                reRender();
              }, 4000); // Keep success message longer as requested
            } else if (pollResult.message !== 'Polling cancelled.') {
              mpesaStatus = 'error';
              mpesaError = pollResult.message;
              reRender();
            }
          } else {
            mpesaStatus = 'error';
            mpesaError = res.data?.message || 'Daraja API Connection Error';
            reRender();
          }
        } else {
          mpesaStatus = 'error';
          mpesaError = "Failed to sync transaction data.";
          reRender();
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        const details = err.response?.data?.receivedBody;
        console.error('M-Pesa Init Error Details:', msg, details);
        mpesaStatus = 'error';
        mpesaError = msg || "System error during initialization.";
        reRender();
      } finally {
        store.isPaymentProcessing = false;
        reRender();
      }
    }
    pendingOrderData = null;
  })();
};

window.closeMpesaError = () => {
  mpesaStatus = null;
  reRender();
};

window.cancelMpesa = () => {
  if (pendingOrderData && (pendingOrderData.billId || pendingOrderData._id)) {
      store.stopPolling(pendingOrderData.billId || pendingOrderData._id);
  }
  mpesaStatus = null;
  reRender();
};

window.openAddItemModal = () => {
  editingItem = null;
  formData = { name: '', price: '', category: 'Mains' };
  isAddItemOpen = true;
  reRender();
};

window.openEditModal = (itemId) => {
  const item = store.menu.find(i => i.id === itemId);
  if (item) {
    editingItem = item.id;
    formData = {
      name: item.name,
      price: item.price,
      category: item.category
    };
    isAddItemOpen = true;
    reRender();
  }
};

window.deleteItem = (itemId) => {
  store.deleteMenuItem(itemId);
  reRender();
};

window.closeAddItemModal = () => {
  isAddItemOpen = false;
  reRender();
};

store.subscribe(reRender);
renderMenu();
