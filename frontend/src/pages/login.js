import '../styles/index.css';
import { store } from '../core/store.js';
import { createIcons, icons } from 'lucide';

let showPassword = false;

function renderLogin() {
  const isDarkMode = store.isDarkMode;

  const html = `
    <div class="flex items-center justify-center min-h-screen w-full transition-colors duration-300 p-6 ${isDarkMode ? "bg-black" : "bg-gray-50"}">
      <div class="w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-black border border-gray-900" : "bg-white border border-gray-100"}">
        <div class="p-12 flex flex-col items-center">
          <div class="mb-12 relative flex justify-center w-full">
            <img src="/brand-logo-v2.png" alt="M&G Logo" class="relative w-64 h-64 object-contain dark:drop-shadow-[0_0_50px_rgba(255,255,255,0.05)] transition-transform hover:scale-105 duration-500" />
          </div>
          
          <div class="flex flex-col items-center select-none">
            <span class="text-[11px] font-black uppercase tracking-[1em] text-gray-400 dark:text-gray-400 mb-1 ml-[1em]">THE</span>
            <h1 class="text-8xl font-[900] text-[#FF0000] tracking-tighter leading-[0.85] mb-2 drop-shadow-sm select-none">M&G's</h1>
            <div class="flex items-center gap-4 w-full px-2">
              <div class="h-px bg-gray-200 dark:bg-neutral-800 flex-1"></div>
              <span class="text-[15px] font-black uppercase tracking-[0.5em] ${isDarkMode ? "text-white" : "text-gray-900"} whitespace-nowrap">RESTAURANT</span>
              <div class="h-px bg-gray-200 dark:bg-neutral-800 flex-1"></div>
            </div>
          </div>

          <form id="login-form" class="w-full space-y-6">
            <div class="space-y-2">
              <label class="block text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-400"}">
                Username
              </label>
              <div class="relative group">
                <i data-lucide="user" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF0000] transition-colors"></i>
                <input 
                  type="text" 
                  id="username"
                  placeholder="Enter username"
                  class="w-full pl-14 pr-5 py-5 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black border border-neutral-800 text-white" : "bg-gray-100 border-transparent text-gray-900"}"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-black uppercase tracking-widest ml-1 ${isDarkMode ? "text-gray-400" : "text-gray-400"}">
                Password
              </label>
              <div class="relative group">
                <i data-lucide="lock" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#FF0000] transition-colors"></i>
                <input 
                  type="${showPassword ? 'text' : 'password'}" 
                  id="password"
                  placeholder="Enter password"
                  class="w-full pl-14 pr-14 py-5 rounded-2xl text-sm font-bold transition-all focus:ring-2 focus:ring-[#FF0000] focus:outline-none ${isDarkMode ? "bg-black border border-neutral-800 text-white" : "bg-gray-100 border-transparent text-gray-900"}"
                />
                <button 
                  type="button"
                  id="toggle-password"
                  class="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF0000] transition-colors"
                >
                  <i data-lucide="${showPassword ? 'eye-off' : 'eye'}" class="w-5 h-5"></i>
                </button>
              </div>
            </div>

            <div id="error-message" class="hidden p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[#FF0000] text-xs font-bold text-center">
            </div>

            <button
              type="submit"
              class="w-full mt-6 py-5 rounded-2xl bg-[#FF0000] text-white font-black uppercase tracking-[0.2em] flex items-center justify-center shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all hover:-translate-y-1 active:scale-95 text-sm"
            >
              LOG IN
            </button>
          </form>


        </div>
      </div>
    </div>
  `;

  document.getElementById('root').innerHTML = html;
  
  // Need a tiny delay for Lucide to process the new DOM
  setTimeout(() => {
    createIcons({ icons });
    attachListeners();
  }, 0);
}

function attachListeners() {
  const form = document.getElementById('login-form');
  const toggleBtn = document.getElementById('toggle-password');
  const errorDiv = document.getElementById('error-message');
  
  const originalUsername = document.getElementById('username').value;
  const originalPassword = document.getElementById('password').value;

  toggleBtn.addEventListener('click', () => {
    showPassword = !showPassword;
    const pwInput = document.getElementById('password');
    const toggleIcon = toggleBtn.querySelector('i');
    
    pwInput.type = showPassword ? 'text' : 'password';
    if (toggleIcon) {
       toggleIcon.setAttribute('data-lucide', showPassword ? 'eye-off' : 'eye');
       createIcons({ icons });
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin mr-2 inline-block"></i> LOGGING IN...`;
    createIcons({ icons });

    try {
      const result = await store.login(username, password);
      
      if (result.success) {
        window.location.href = '/';
      } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
        createIcons({ icons });
        
        let message = result.message || 'Invalid username or password. Please try again.';
        
        // Specifically handle suspended accounts (Fix #5)
        if (result.code === 'ACCOUNT_SUSPENDED') {
          message = 'Your account has been suspended. Please contact the owner.';
        }
        
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Login system error:', error);
      btn.disabled = false;
      btn.innerHTML = originalText;
      createIcons({ icons });
      errorDiv.textContent = 'A system error occurred. Please try again.';
      errorDiv.classList.remove('hidden');
    }
  });
}


// Initial render
renderLogin();
