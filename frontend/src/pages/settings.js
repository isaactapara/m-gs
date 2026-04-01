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
        <div class="flex flex-col items-center select-none w-full border-b ${isDarkMode ? 'border-[#111]' : 'border-gray-100'} pb-8">
          <span class="text-[10px] font-black uppercase tracking-[0.8em] text-gray-400 mb-1 ml-[0.8em]">THE</span>
          <h1 class="text-6xl font-[900] text-[#FF0000] tracking-tighter leading-[0.85] mb-2 drop-shadow-sm">${store.sanitize(settings.restaurantName)}</h1>
          <span class="text-[12px] font-black uppercase tracking-[0.5em] ${isDarkMode ? 'text-white' : 'text-gray-900'} ml-[0.5em]">RESTAURANT</span>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <!-- Change Password Form -->
          <form id="change-password-form" class="p-8 rounded-[40px] border shadow-sm space-y-6 ${isDarkMode ? 'bg-black border-[#111]' : 'bg-white border-gray-100'}">
            <div>
              <div class="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                <i data-lucide="lock" class="w-6 h-6"></i>
              </div>
              <h4 class="font-black text-xl tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}">Security & Password</h4>
              <p class="text-xs font-bold text-gray-400">Update your account password (at least 8 chars).</p>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Current Password</label>
                <input id="currentPassword" type="password" required class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-[#111]' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">New Password</label>
                <input id="newPassword" type="password" required minlength="8" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-[#111]' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
            </div>

            <div id="password-feedback" class="hidden text-xs font-bold p-3 rounded-xl"></div>

            <button type="submit" class="w-full py-4 rounded-[20px] bg-blue-600 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              Update Password
            </button>
          </form>

          <form id="create-cashier-form" class="p-8 rounded-[40px] border shadow-sm space-y-6 flex flex-col ${isDarkMode ? 'bg-black border-[#111]' : 'bg-white border-gray-100'}">
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
                <input id="newUsername" required placeholder="e.g. john" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-[#111]' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Password (min 8 chars)</label>
                <input id="newPasswordInput" required type="password" minlength="8" placeholder="Enter secure password" class="w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? 'bg-black text-white border border-[#111]' : 'bg-gray-50 text-gray-900 border-transparent'}" />
              </div>
            </div>

            <div id="form-error" class="hidden text-xs font-bold text-[#FF0000] bg-red-50 dark:bg-red-500/10 p-3 rounded-xl"></div>

            <button type="submit" class="w-full py-4 mt-auto rounded-[20px] bg-[#FF0000] text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
              Create Cashier
            </button>
          </form>

          <div class="rounded-[40px] border shadow-sm flex flex-col overflow-hidden ${isDarkMode ? 'bg-black border-[#111]' : 'bg-white border-gray-100'}">
            <div class="p-8 border-b ${isDarkMode ? 'border-[#111]' : 'border-gray-100'}">
              <h4 class="font-black text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}">Active Accounts</h4>
              <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Manage system access</p>
            </div>
            <div class="overflow-y-auto flex-1 p-8 space-y-4 styled-scrollbar max-h-[500px]">
              ${store.users.map((user) => `
                <div class="p-5 rounded-3xl border flex items-center justify-between transition-all hover:border-gray-300 dark:hover:border-zinc-800 ${isDarkMode ? 'bg-black border-[#111]' : 'bg-gray-50 border-gray-200'} ${!user.isActive ? 'opacity-60 saturate-50' : ''}">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black uppercase text-white shadow-md ${user.role === 'owner' ? 'bg-blue-500' : 'bg-gray-400'}">
                      ${store.sanitize(user.username[0])}
                    </div>
                    <div>
                      <p class="font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} capitalize">${store.sanitize(user.username)}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'owner' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-200 text-gray-600 dark:bg-[#111] dark:text-gray-400 border dark:border-white/5'}">
                          ${store.sanitize(user.role)}
                        </span>
                        ${!user.isActive ? '<span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 animate-pulse">Suspended</span>' : ''}
                      </div>
                    </div>
                  </div>

                  <div class="flex gap-2">
                    ${user.role !== 'owner' ? `
                      <button onclick="window.toggleUserStatus('${user.id}')" class="p-3 ${user.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10'} rounded-2xl transition-all shadow-sm" title="${user.isActive ? 'Suspend' : 'Activate'}">
                        <i data-lucide="${user.isActive ? 'user-minus' : 'user-check'}" class="w-5 h-5"></i>
                      </button>
                      <button onclick="window.deleteUser('${user.id}')" class="p-3 bg-red-50 text-[#FF0000] hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-2xl transition-all shadow-sm" title="Delete Cashier">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                      </button>
                    ` : `
                      <div class="p-3 text-gray-300 dark:text-gray-700">
                        <i data-lucide="shield-check" class="w-5 h-5"></i>
                      </div>
                    `}
                  </div>
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
  const passwordForm = document.getElementById('change-password-form');
  const formError = document.getElementById('form-error');
  const passwordFeedback = document.getElementById('password-feedback');

  if (cashierForm) {
    cashierForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = document.getElementById('newUsername').value.trim();
      const password = document.getElementById('newPasswordInput').value;

      if (!username || !password) return;

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

      const result = await store.addUser(username, password);
      if (!result.success) {
        formError.textContent = result.message;
        formError.classList.remove('hidden');
      } else {
        formError.classList.add('hidden');
        document.getElementById('newUsername').value = '';
        document.getElementById('newPasswordInput').value = '';
      }

      button.innerHTML = originalText;
      button.disabled = false;
      createIcons({ icons });
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;

      const button = event.submitter;
      const originalText = button.innerHTML;
      button.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> UPDATING...`;
      button.disabled = true;
      createIcons({ icons });

      try {
        await store.apiClient.patch('/auth/change-password', { currentPassword, newPassword });
        passwordFeedback.textContent = 'Password updated successfully!';
        passwordFeedback.className = 'text-xs font-bold p-3 rounded-xl bg-green-50 text-green-600 dark:bg-green-500/10 block';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
      } catch (error) {
        passwordFeedback.textContent = error.response?.data?.error?.message || error.message || 'Update failed.';
        passwordFeedback.className = 'text-xs font-bold p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 block';
      }

      button.innerHTML = originalText;
      button.disabled = false;
      createIcons({ icons });
    });
  }
}

window.toggleUserStatus = async (id) => {
  try {
    await store.toggleUserStatus(id);
  } catch (err) {
    console.error('Failed to toggle user status:', err);
  }
};


window.deleteUser = async (id) => {
  await store.deleteUser(id);
  renderSettings();
};

store.subscribe(renderSettings);
renderSettings();
