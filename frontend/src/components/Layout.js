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
    { to: '/bills.html', icon: 'receipt-text', label: 'Ledger', roles: ['owner', 'cashier'] },
    { to: '/reports.html', icon: 'pie-chart', label: 'Analytics', roles: ['owner'] },
    { to: '/settings.html', icon: 'settings', label: 'Settings', roles: ['owner'] },
  ].filter(item => item.roles.includes(userRole));

  const currentNav = navItems.find(i => i.to === currentPage) || navItems[0];

  const layoutHtml = `
    <div class="flex h-screen w-full transition-colors duration-500 overflow-hidden ${isDarkMode ? "bg-black text-white" : "bg-white text-gray-900"}">
      
      <!-- Mobile Sidebar Overlay (Enhanced) -->
      <div id="mobile-sidebar-overlay" class="fixed inset-0 bg-black/60 z-40 hidden backdrop-blur-sm transition-opacity duration-500" onclick="window.toggleSidebar()"></div>

      <!-- Progressive Navigation Sidebar -->
      <aside 
        id="main-sidebar" 
        class="fixed md:static inset-y-0 left-0 ${store.isSidebarCollapsed ? "w-20 hover:w-64" : "w-64"} flex flex-col border-r z-50 shrink-0 -translate-x-full md:translate-x-0 group ${
          isDarkMode ? "bg-black border-[#111] glass-black" : "bg-white border-gray-100 glass-white"
        }"
      >
        <!-- Brand Identity -->
        <div class="p-6 flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-4 group/brand cursor-pointer p-2 -ml-2 rounded-2xl transition-all">
            <div class="bg-transparent flex-shrink-0 relative">
                <div class="absolute inset-0 bg-[#FF0000]/10 blur-2xl rounded-full scale-150 group-hover/brand:bg-[#FF0000]/20 transition-all duration-700"></div>
                <img src="/brand-logo-v2.png" alt="M&G Logo" class="relative w-12 h-12 object-contain dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-transform duration-500 ${store.isSidebarCollapsed ? 'md:scale-110 group-hover:scale-100' : ''}" />
            </div>
            <div class="flex flex-col justify-center translate-y-0.5 overflow-hidden transition-all duration-300 ${store.isSidebarCollapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100' : 'w-auto opacity-100'}">
              <span class="text-[8px] font-black tracking-[0.6em] text-gray-400 leading-none mb-0.5 ml-[0.6em]">THE</span>
              <span class="font-black text-2xl tracking-tighter text-[#FF0000] leading-none mb-0.5">M&G's</span>
              <span class="text-[9px] font-black tracking-[0.3em] ${isDarkMode ? 'text-gray-300' : 'text-gray-900'} leading-none uppercase">RESTAURANT</span>
            </div>
          </div>
          <button onclick="window.toggleSidebar()" class="md:hidden p-2 text-gray-400 hover:bg-red-500/10 hover:text-[#FF0000] rounded-xl transition-all">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 py-8 space-y-2 overflow-y-auto styled-scrollbar">
          ${navItems.map(item => {
            const isActive = currentPage === item.to;
            return `
              <a 
                href="${item.to}" 
                title="${store.isSidebarCollapsed ? item.label : ''}" 
                class="relative flex flex-row items-center ${store.isSidebarCollapsed ? 'md:justify-center group-hover:md:justify-start group-hover:gap-3' : 'gap-3'} px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 overflow-hidden ${
                  isActive 
                    ? "text-[#FF0000] bg-[#FF0000]/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                }"
              >
                ${isActive ? '<div class="sidebar-active-indicator"></div>' : ''}
                <i data-lucide="${item.icon}" class="w-5 h-5 shrink-0" stroke-width="${isActive ? '2.5' : '2'}"></i>
                <span class="transition-all duration-300 ${store.isSidebarCollapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100' : 'w-auto opacity-100'} whitespace-nowrap">
                  ${item.label}
                </span>
              </a>
            `;
          }).join('')}
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t dark:border-[#111] space-y-2 bg-transparent shrink-0">
          <button id="toggle-theme-btn" class="w-full flex items-center ${store.isSidebarCollapsed ? 'md:justify-center group-hover:md:justify-start group-hover:gap-3' : 'gap-3'} px-4 py-3.5 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 transition-all">
            <i data-lucide="${isDarkMode ? 'sun' : 'moon'}" class="w-5 h-5 shrink-0"></i>
            <span class="transition-all duration-300 ${store.isSidebarCollapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100' : 'w-auto opacity-100'} whitespace-nowrap">
              ${isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          
          <button id="logout-btn" class="w-full flex items-center ${store.isSidebarCollapsed ? 'md:justify-center group-hover:md:justify-start group-hover:gap-3' : 'gap-3'} px-4 py-3.5 rounded-2xl font-bold text-red-500/80 hover:bg-red-500/10 hover:text-[#FF0000] transition-all">
            <i data-lucide="log-out" class="w-5 h-5 shrink-0"></i>
            <span class="transition-all duration-300 ${store.isSidebarCollapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100' : 'w-auto opacity-100'} whitespace-nowrap">Logout</span>
          </button>
        </div>
      </aside>

      <!-- Main Application Container -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <!-- Dashboard Header (Glassmorphism) -->
        <header class="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b shrink-0 z-20 transition-all ${
          isDarkMode ? "bg-black/80 border-[#111] glass-black" : "bg-white/80 border-gray-100 backdrop-blur-md"
        }">
          <div class="flex items-center gap-4">
            <button onclick="window.toggleSidebar()" class="md:hidden p-2.5 bg-gray-100 dark:bg-[#111] border dark:border-[#222] rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-500/10 hover:text-[#FF0000] transition-all">
              <i data-lucide="menu" class="w-6 h-6"></i>
            </button>
            <button id="toggle-desktop-sidebar" class="hidden md:block p-2 text-gray-400 hover:text-[#FF0000] transition-all hover:scale-110 active:scale-95">
              <i data-lucide="menu-primary" class="w-6 h-6 ${store.isSidebarCollapsed ? 'text-[#FF0000]' : ''}"></i>
            </button>
            <div class="flex flex-col">
              <h2 class="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0000]/80">
                ${currentNav ? currentNav.label : 'Overview'}
              </h2>
              <p class="text-xs font-bold leading-none mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"} capitalize">
                POS Mode · ${userRole}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-6">
             <div class="hidden sm:flex flex-col items-end">
                <span class="text-[10px] font-black uppercase tracking-widest text-[#FF0000]">Live Session</span>
                <span class="text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}">${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
             </div>
             <div class="w-10 h-10 rounded-full flex items-center justify-center font-black shadow-[0_0_15px_rgba(0,0,0,0.1)] border-2 ${isDarkMode ? "bg-black border-[#111] text-white" : "bg-gray-100 border-white text-gray-900"}">
               ${userRole ? userRole[0].toUpperCase() : ''}
             </div>
          </div>
        </header>

        <!-- Viewport Container -->
        <main class="flex-1 overflow-y-auto p-4 md:p-8 styled-scrollbar relative animate-in fade-in duration-700">
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
    // Register custom primary menu icon if not exists
    if (!icons.menuPrimary) {
      icons.menuPrimary = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="15" y2="6"></line><line x1="3" y1="18" x2="18" y2="18"></line></svg>`;
    }
    
    createIcons({ icons });
    
    const collapseBtn = document.getElementById('toggle-desktop-sidebar');
    if(collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        store.toggleSidebarCollapse();
      });
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
