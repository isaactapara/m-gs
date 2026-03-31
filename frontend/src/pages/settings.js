import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';

let settingsFeedback = '';
let settingsError = '';

function renderSettings() {
  const isDarkMode = store.isDarkMode;
  const userRole = store.userRole;
  const settings = store.settings;

  if (userRole !== 'owner') {
    document.getElementById('root').innerHTML = renderLayout(`
      <div class="flex flex-col items-center justify-center min-h-[50vh]">
        <i data-lucide="shield-alert" class="w-16 h-16 text-[#FF0000] mb-4 opacity-50"></i>
        <h2 class="text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}">Access Denied</h2>
        <p class="text-gray-500 font-bold mt-2">Only owners can manage settings and staff accounts.</p>
      </div>
    `, '/settings.html');
    initLayoutListeners();
    createIcons({ icons });
    return;
  }

  const html = `
    <div class="h-[calc(100vh-80px)] -m-4 md:-m-8 flex flex-col overflow-y-auto bg-gray-50/10 dark:bg-black p-4 md:p-8">
      <div class="max-w-6xl mx-auto w-full space-y-8">
        <div class="flex flex-col items-center select-none w-full border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} pb-8">
          <span class="text-[10px] font-black uppercase tracking-[0.8em] text-gray-400 mb-1 ml-[0.8em]">THE</span>
          <h1 class="text-6xl font-[900] text-[#FF0000] tracking-tighter leading-[0.85] mb-2 drop-shadow-sm">${store.sanitize(settings.restaurantName)}</h1>
          <span class="text-[12px] font-black uppercase tracking-[0.5em] ${isDarkMode ? 'text-white' : 'text-gray-900'} ml-[0.5em]">RESTAURANT</span>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <form id="restaurant-settings-form" class="p-8 rounded-[40px] border shadow-sm space-y-6 ${isDarkMode ? 'bg-black border-gray-900' : 'bg-white border-gray-100'}">
            <div>
              <div class="w-12 h-12 bg-red-100 text-[#FF0000] dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <i data-lucide="settings-2" class="w-6 h-6"></i>
              </div>
              <h4 class="font-black text-xl tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}">Restaurant Settings</h4>
              <p class="text-xs font-bold text-gray-400">Shared across devices via MongoDB.</p>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Restaurant Name</label>
                <input id="restaurantName" value="${store.sanitize(settings.restaurantName)}" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-gray-900' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Currency</label>
                <input id="currency" value="${store.sanitize(settings.currency)}" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-gray-900' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Timezone</label>
                <input id="timezone" value="${store.sanitize(settings.timezone || 'Africa/Nairobi')}" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-gray-900' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
            </div>

            <div id="settings-feedback" class="${settingsFeedback ? '' : 'hidden'} text-xs font-bold ${settingsError ? 'text-[#FF0000] bg-red-50 dark:bg-red-500/10' : 'text-green-600 bg-green-50 dark:bg-green-500/10'} p-3 rounded-xl">
              ${store.sanitize(settingsError || settingsFeedback)}
            </div>

            <button type="submit" class="w-full py-4 rounded-[20px] bg-[#FF0000] text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              Save Settings
            </button>
          </form>

          <form id="create-cashier-form" class="p-8 rounded-[40px] border shadow-sm space-y-6 flex flex-col ${isDarkMode ? 'bg-black border-gray-900' : 'bg-white border-gray-100'}">
            <div>
              <div class="w-12 h-12 bg-red-100 text-[#FF0000] dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <i data-lucide="user-plus" class="w-6 h-6"></i>
              </div>
              <h4 class="font-black text-xl tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}">New Cashier</h4>
              <p class="text-xs font-bold text-gray-400">Provision a new login for a staff member.</p>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Username</label>
                <input id="newUsername" required placeholder="e.g. john" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-gray-900' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Security PIN</label>
                <input id="newPin" required type="password" placeholder="e.g. 5678" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-gray-900' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
            </div>

            <div id="form-error" class="hidden text-xs font-bold text-[#FF0000] bg-red-50 dark:bg-red-500/10 p-3 rounded-xl"></div>

            <button type="submit" class="w-full py-4 mt-auto rounded-[20px] bg-[#FF0000] text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              Create Cashier
            </button>
          </form>

          <div class="rounded-[40px] border shadow-sm flex flex-col overflow-hidden ${isDarkMode ? 'bg-black border-gray-900' : 'bg-white border-gray-100'}">
            <div class="p-8 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}">
              <h4 class="font-black text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}">Active Accounts</h4>
              <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Manage system access</p>
            </div>
            <div class="overflow-y-auto flex-1 p-8 space-y-4 styled-scrollbar max-h-[500px]">
              ${store.users.map((user) => `
                <div class="p-5 rounded-3xl border flex items-center justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700 ${isDarkMode ? 'bg-black border-gray-900' : 'bg-gray-50 border-gray-200'}">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black uppercase text-white shadow-md ${user.role === 'owner' ? 'bg-blue-500' : 'bg-gray-400'}">
                      ${store.sanitize(user.username[0])}
                    </div>
                    <div>
                      <p class="font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} capitalize">${store.sanitize(user.username)}</p>
                      <span class="inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'owner' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}">
                        ${store.sanitize(user.role)}
                      </span>
                    </div>
                  </div>

                  ${user.role !== 'owner' ? `
                    <button onclick="window.deleteUser('${user.id}')" class="p-3 bg-red-50 text-[#FF0000] hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-2xl transition-all shadow-sm" title="Delete Cashier">
                      <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                  ` : `
                    <div class="p-3 text-gray-300 dark:text-gray-700">
                      <i data-lucide="shield-check" class="w-5 h-5"></i>
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/settings.html');
  initLayoutListeners();

  setTimeout(() => {
    createIcons({ icons });
    attachListeners();
  }, 0);
}

function attachListeners() {
  const cashierForm = document.getElementById('create-cashier-form');
  const settingsForm = document.getElementById('restaurant-settings-form');
  const formError = document.getElementById('form-error');

  if (cashierForm) {
    cashierForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = document.getElementById('newUsername').value.trim();
      const pin = document.getElementById('newPin').value;

      if (!username || !pin) return;

      if (store.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
        formError.textContent = 'A user with this username already exists.';
        formError.classList.remove('hidden');
        return;
      }

      const button = event.submitter;
      const originalText = button.innerHTML;
      button.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> CREATING...`;
      button.disabled = true;
      createIcons({ icons });

      const result = await store.addUser(username, pin);
      if (!result.success) {
        formError.textContent = result.message;
        formError.classList.remove('hidden');
      } else {
        formError.classList.add('hidden');
        document.getElementById('newUsername').value = '';
        document.getElementById('newPin').value = '';
      }

      button.innerHTML = originalText;
      button.disabled = false;
      createIcons({ icons });
      renderSettings();
    });
  }

  if (settingsForm) {
    settingsForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const patch = {
        restaurantName: document.getElementById('restaurantName').value.trim(),
        currency: document.getElementById('currency').value.trim(),
        timezone: document.getElementById('timezone').value.trim(),
      };

      const button = event.submitter;
      const originalText = button.innerHTML;
      button.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> SAVING...`;
      button.disabled = true;
      createIcons({ icons });

      try {
        await store.updateSettings(patch);
        settingsError = '';
        settingsFeedback = 'Settings saved successfully.';
      } catch (error) {
        settingsFeedback = '';
        settingsError = error.response?.data?.error?.message || error.message || 'Failed to save settings.';
      }

      button.innerHTML = originalText;
      button.disabled = false;
      createIcons({ icons });
      renderSettings();
    });
  }
}

window.deleteUser = async (id) => {
  await store.deleteUser(id);
  renderSettings();
};

store.subscribe(renderSettings);
renderSettings();
