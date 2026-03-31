import { store } from '../core/store.js';
import { createIcons, icons } from 'lucide';

window.toggleSidebar = () => {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  
  if (sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
};

export function renderLayout(contentHtml, currentPage = '/') {
  const isDarkMode = store.isDarkMode;
  const userRole = store.userRole;

  if (!userRole && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
    return '';
  }

  const navItems = [
    { to: '/', icon: 'home', label: 'Dashboard', roles: ['owner', 'cashier'] },
    { to: '/menu.html', icon: 'grid-3x3', label: 'Menu', roles: ['owner', 'cashier'] },
    { to: '/tables.html', icon: 'grid-2x2', label: 'Table Plan', roles: ['owner', 'cashier'] },
    { to: '/bills.html', icon: 'receipt-text', label: 'Billing History', roles: ['owner', 'cashier'] },
    { to: '/reports.html', icon: 'pie-chart', label: 'Analytics', roles: ['owner'] },
    { to: '/settings.html', icon: 'settings', label: 'Settings', roles: ['owner'] },
  ].filter(item => item.roles.includes(userRole));

  const currentNav = navItems.find(i => i.to === currentPage) || navItems[0];

  const layoutHtml = `
    <div class="flex h-screen w-full transition-colors duration-300 overflow-hidden ${isDarkMode ? "bg-black text-white" : "bg-white text-gray-900"}">
      
      <!-- Mobile Sidebar Overlay -->
      <div id="mobile-sidebar-overlay" class="fixed inset-0 bg-black/50 z-40 hidden md:hidden transition-opacity" onclick="window.toggleSidebar()"></div>

      <!-- Desktop & Mobile Sidebar -->
      <aside id="main-sidebar" class="fixed md:static inset-y-0 left-0 ${store.isSidebarCollapsed ? "w-20 hover:w-64" : "w-64"} flex flex-col border-r transition-all duration-300 z-50 shrink-0 -translate-x-full md:translate-x-0 ${isDarkMode ? "bg-black border-gray-900" : "bg-white border-gray-100"} group">
        <div class="p-6 flex items-center justify-between gap-3">
          <div class="flex items-center gap-4 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 p-2 -ml-2 rounded-2xl transition-all">
            <div class="bg-transparent flex-shrink-0 relative">
               <div class="absolute inset-0 bg-white/20 dark:bg-white/10 blur-xl rounded-full scale-150 group-hover:bg-white/30 transition-colors"></div>
                <img src="/brand-logo-v2.png" alt="M&G Logo" class="relative w-16 h-16 object-contain dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.08)]" />
            </div>
            <div class="flex flex-col justify-center translate-y-0.5 ${store.isSidebarCollapsed ? 'hidden group-hover:flex' : 'flex'}">
              <span class="text-[8px] font-black tracking-[0.6em] text-gray-400 dark:text-gray-500 leading-none mb-0.5 ml-[0.6em]">THE</span>
              <span class="font-black text-2xl tracking-tighter text-[#FF0000] leading-none mb-0.5">M&G's</span>
              <span class="text-[9px] font-black tracking-[0.3em] text-gray-900 dark:text-gray-300 leading-none uppercase">RESTAURANT</span>
            </div>
          </div>
          <button onclick="window.toggleSidebar()" class="md:hidden p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto styled-scrollbar">
          ${navItems.map(item => {
            const isActive = currentPage === item.to;
            return `
              <a href="${item.to}" title="${item.label}" class="flex flex-row items-center ${store.isSidebarCollapsed ? 'md:justify-center group-hover:md:justify-start group-hover:gap-3' : 'gap-3'} px-4 py-3 rounded-2xl font-bold transition-all duration-200 ${
                isActive 
                  ? "text-[#FF0000] bg-red-50 dark:bg-red-500/10 shadow-sm" 
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50"
              }">
                <i data-lucide="${item.icon}" class="w-5 h-5 shrink-0" stroke-width="${isActive ? '2.5' : '2'}"></i>
                <span class="${store.isSidebarCollapsed ? 'hidden group-hover:block' : 'block'} whitespace-nowrap">${item.label}</span>
              </a>
            `;
          }).join('')}
        </nav>

        <div class="p-4 border-t dark:border-gray-800 space-y-2 bg-inherit">
          <button id="toggle-theme-btn" title="Toggle Theme" class="w-full flex items-center ${store.isSidebarCollapsed ? 'md:justify-center group-hover:md:justify-start group-hover:gap-3' : 'gap-3'} px-4 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800/50 transition-all">
            <i data-lucide="${isDarkMode ? 'sun' : 'moon'}" class="w-5 h-5 shrink-0"></i>
            <span class="${store.isSidebarCollapsed ? 'hidden group-hover:block' : 'block'} whitespace-nowrap">${isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button id="logout-btn" title="Logout" class="w-full flex items-center ${store.isSidebarCollapsed ? 'md:justify-center group-hover:md:justify-start group-hover:gap-3' : 'gap-3'} px-4 py-3 rounded-2xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
            <i data-lucide="log-out" class="w-5 h-5 shrink-0"></i>
            <span class="${store.isSidebarCollapsed ? 'hidden group-hover:block' : 'block'} whitespace-nowrap">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <!-- Top Header -->
        <header class="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b shrink-0 z-20 transition-colors ${
          isDarkMode ? "bg-black border-gray-900" : "bg-white/80 border-gray-100 backdrop-blur-md"
        }">
          <div class="flex items-center gap-3">
            <button onclick="window.toggleSidebar()" class="md:hidden p-2.5 bg-gray-100 dark:bg-black border dark:border-gray-900 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors">
              <i data-lucide="menu" class="w-5 h-5"></i>
            </button>
            <button id="toggle-desktop-sidebar" class="hidden md:block p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <i data-lucide="menu" class="w-6 h-6 ${store.isSidebarCollapsed ? 'text-[#FF0000]' : ''} transition-all"></i>
            </button>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold uppercase tracking-widest text-[#FF0000]">
                  ${currentNav ? currentNav.label : 'Overview'}
                </h2>
              </div>
              <p class="text-xs font-medium hidden sm:block ${isDarkMode ? "text-gray-400" : "text-gray-500"}">
                Welcome back, <span class="text-primary capitalize">${userRole}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
             <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-inner ${isDarkMode ? "bg-black border border-gray-800 text-white" : "bg-gray-100 text-gray-900"}">
               ${userRole ? userRole[0].toUpperCase() : ''}
             </div>
          </div>
        </header>

        <!-- Scrollable Content -->
        <main class="flex-1 overflow-y-auto p-4 md:p-8 styled-scrollbar relative">
          <div class="max-w-[1400px] mx-auto" id="page-content">
            ${contentHtml}
          </div>
        </main>
      </div>
    </div>
  `;

  return layoutHtml;
}

export function initLayoutListeners() {
  setTimeout(() => {
    createIcons({ icons });
    
    const collapseBtn = document.getElementById('toggle-desktop-sidebar');
    if(collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        store.toggleSidebarCollapse();
      });

      // Auto-collapse after 5 seconds if not already collapsed and timer not active
      if (!store.isSidebarCollapsed && !window.collapseTimerStarted) {
        window.collapseTimerStarted = true;
        setTimeout(() => {
          if (!store.isSidebarCollapsed) {
            store.toggleSidebarCollapse();
          }
        }, 5000);
      }
    }

    const themeBtn = document.getElementById('toggle-theme-btn');
    if(themeBtn) {
      themeBtn.addEventListener('click', () => {
        store.toggleDarkMode();
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        store.logout();
        window.location.href = '/login.html';
      });
    }
  }, 0);
}
