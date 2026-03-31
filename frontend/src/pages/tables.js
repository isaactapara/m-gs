import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';

let selectedTableId = null;
let isEditMode = false;
let accessError = null;

// Drag state
let draggingTableId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Edit name state
let editingTableNameId = null;

function renderTables() {
  const isDarkMode = store.isDarkMode;
  const tables = store.tables;
  const selectedTable = tables.find(t => t.id === selectedTableId);

  const getStatusColor = (status) => {
    switch (status) {
      case 'FREE': return 'bg-green-50/80 border-green-500/20 text-green-600 dark:bg-green-950/30 dark:text-green-400';
      case 'OCCUPIED': return 'bg-red-50/80 border-[#FF0000]/20 text-[#FF0000] dark:bg-red-950/30 dark:text-red-400';
      case 'PENDING': return 'bg-amber-50/80 border-amber-500/20 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OCCUPIED': return 'users';
      case 'FREE': return 'check-circle-2';
      case 'PENDING': return 'clock';
      default: return 'circle';
    }
  };

  const html = `
    <div class="h-[calc(100vh-80px)] -m-4 md:-m-8 flex flex-col xl:flex-row overflow-hidden relative">
      <!-- Canvas Area -->
      <div class="flex-1 flex flex-col overflow-hidden relative ${isDarkMode ? "bg-black" : "bg-gray-50"}">
        
        <div class="p-6 flex items-center justify-between z-10 absolute top-0 left-0 right-0 pointer-events-none">
          <div>
            <h2 class="text-3xl font-black drop-shadow-sm ${isDarkMode ? "text-white" : "text-gray-900"}">Floor Plan</h2>
            <p class="text-xs font-bold ${accessError ? 'text-red-500 bg-red-50 dark:bg-red-950/30' : 'text-gray-500 bg-white/50 dark:bg-black/50'} uppercase tracking-widest mt-1 backdrop-blur-md px-3 py-1 rounded-full inline-block transition-colors">
              ${accessError || (isEditMode ? 'Drag tables to arrange • Click table to rename' : 'Select a table to manage orders')}
            </p>
          </div>

          <div class="flex gap-3 pointer-events-auto">
            ${(store.userRole === 'owner' || store.userRole === 'cashier') && isEditMode ? `
               <button id="add-table-btn" onclick="window.addTable()" class="px-5 py-2.5 bg-gray-100 dark:bg-black border dark:border-gray-900 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors shadow-sm flex items-center gap-2">
                 <i data-lucide="plus" class="w-4 h-4 inline-block -mt-1 mr-1"></i> Add Table
               </button>
            ` : ''}
            <button 
              id="edit-mode-btn"
              onclick="window.toggleEditMode()"
              class="px-6 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 shadow-xl backdrop-blur-md ${
                isEditMode 
                  ? "bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700" 
                  : "bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white hover:bg-white border border-gray-200 dark:border-gray-800"
              }"
            >
              <i data-lucide="${isEditMode ? 'save' : 'move'}" class="w-4 h-4"></i> 
              ${isEditMode ? 'Save Layout' : 'Edit Floor Plan'}
            </button>
          </div>
        </div>

        <!-- Interior Canvas -->
        <div 
          id="canvas-container"
          class="flex-1 w-full h-full relative overflow-hidden transition-all ${
            isEditMode ? "cursor-crosshair" : "cursor-default"
          }"
        >
          <!-- Grid Background pattern -->
          <div class="absolute inset-0 opacity-40 ${
            isDarkMode ? "bg-[radial-gradient(#ffffff20_2px,transparent_2px)]" : "bg-[radial-gradient(#00000015_2px,transparent_2px)]"
          }" style="background-size: 50px 50px;"></div>

          ${tables.map(table => `
            <div
              class="table-btn absolute w-28 h-28 rounded-[2rem] flex flex-col items-center justify-center border-4 transition-all shadow-xl backdrop-blur-md group ${getStatusColor(table.status)} ${
                selectedTableId === table.id && !isEditMode
                  ? "border-[#FF0000] ring-8 ring-[#FF0000]/10 z-20 scale-110" 
                  : "border-transparent z-10 scale-100"
              } ${isEditMode ? "hover:scale-105 cursor-grab active:cursor-grabbing border-dashed border-indigo-400 hover:border-indigo-500 bg-white/90 dark:bg-black/80 text-gray-900 dark:text-white hover:shadow-2xl hover:shadow-indigo-500/20" : "hover:-translate-y-1 hover:shadow-2xl cursor-pointer"} ${table.status === 'OCCUPIED' && !isEditMode ? 'animate-pulse shadow-[#FF0000]/10' : ''}"
              style="left: ${table.position?.x ?? table.x ?? 0}px; top: ${table.position?.y ?? table.y ?? 0}px; transform-origin: center center;"
              data-id="${table.id}"
            >
              ${isEditMode ? `
                <div class="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                  <button onclick="window.deleteTable(event, '${table.id}')" class="bg-[#FF0000] text-white p-2 rounded-full shadow-xl hover:scale-110 active:scale-95 cursor-pointer">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                  </button>
                  <button onclick="window.openEditName(event, '${table.id}')" class="bg-indigo-500 text-white p-2 rounded-full shadow-xl hover:scale-110 active:scale-95 cursor-pointer">
                    <i data-lucide="pencil" class="w-3 h-3"></i>
                  </button>
                </div>
                <div class="absolute -top-3 -left-3 bg-white dark:bg-black text-gray-400 p-2 rounded-full shadow-lg border dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <i data-lucide="grip-horizontal" class="w-3 h-3"></i>
                </div>
              ` : ''}
              
              <div class="relative flex flex-col items-center pointer-events-none">
                <i data-lucide="${isEditMode ? 'move' : getStatusIcon(table.status)}" class="w-8 h-8 mb-2 ${isEditMode ? 'text-indigo-400' : ''}"></i>
                <span class="font-black text-xs block text-center truncate px-2 max-w-full">${table.name}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Control Sidebar -->
      <div class="w-full xl:w-[450px] flex flex-col shadow-2xl z-20 transition-transform duration-500 overflow-y-auto backdrop-blur-xl ${isDarkMode ? "bg-black/80 border-l border-white/5" : "bg-white border-l border-gray-200"}">
        ${selectedTable ? `
          <div class="p-8 h-full flex flex-col animate-in slide-in-from-right-8 fade-in duration-500">
            <!-- Header -->
            <div class="flex items-start justify-between mb-8 pb-8 border-b ${isDarkMode ? "border-gray-800" : "border-gray-100"}">
              <div class="flex gap-5 items-center">
                <div class="w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner font-black text-2xl ${getStatusColor(selectedTable.status)} ring-4 ring-gray-50 dark:ring-gray-950">
                   ${selectedTable.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 class="text-3xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}">${selectedTable.name}</h3>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="relative flex h-3 w-3">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        selectedTable.status === 'FREE' ? 'bg-green-400' : 
                        selectedTable.status === 'OCCUPIED' ? 'bg-[#FF0000]' : 'bg-amber-400'
                      }"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 ${
                        selectedTable.status === 'FREE' ? 'bg-green-500' : 
                        selectedTable.status === 'OCCUPIED' ? 'bg-[#FF0000]' : 'bg-amber-500'
                      }"></span>
                    </span>
                    <span class="text-xs font-black uppercase tracking-widest text-gray-500">${selectedTable.status}</span>
                  </div>
                </div>
              </div>
              <button onclick="window.closeSidebar()" class="p-3 bg-gray-100 dark:bg-black border dark:border-gray-800 rounded-2xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                 <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>

            <!-- Creative Action Grid -->
            <div class="flex-1 flex flex-col justify-center space-y-4">
              <div class="relative z-10 font-black text-xs uppercase tracking-tighter opacity-80 mb-1 -mt-2">
                ${store.sanitize(selectedTable.name)}
              </div>
              <button 
                onclick="window.setTableStatus('FREE')"
                class="relative overflow-hidden w-full p-6 rounded-[2rem] border-2 transition-all group text-left ${
                  selectedTable.status === 'FREE' 
                    ? "border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20 ring-4 ring-green-500/10" 
                    : "border-transparent bg-gray-50 dark:bg-black border dark:border-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800/50"
                }"
              >
                <div class="flex items-center gap-5 relative z-10">
                  <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedTable.status === 'FREE' ? "bg-green-500 text-white shadow-md shadow-green-500/30" : "bg-white dark:bg-gray-700 text-green-500 shadow-sm"
                  }">
                    <i data-lucide="check-circle-2" class="w-6 h-6"></i>
                  </div>
                  <div>
                     <span class="block text-xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Free Table</span>
                     <span class="block text-xs font-bold text-gray-400 mt-1">Clean and ready for new guests</span>
                  </div>
                </div>
              </button>

              <button 
                onclick="window.setTableStatus('OCCUPIED')"
                class="relative overflow-hidden w-full p-6 rounded-[2rem] border-2 transition-all group text-left ${
                  selectedTable.status === 'OCCUPIED' 
                    ? "border-[#FF0000] bg-red-500/10 shadow-lg shadow-red-500/20 ring-4 ring-red-500/10" 
                    : "border-transparent bg-gray-50 dark:bg-black border dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/50"
                }"
              >
                <div class="flex items-center gap-5 relative z-10">
                  <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedTable.status === 'OCCUPIED' ? "bg-[#FF0000] text-white shadow-md shadow-red-500/30" : "bg-white dark:bg-gray-700 text-[#FF0000] shadow-sm"
                  }">
                    <i data-lucide="users" class="w-6 h-6"></i>
                  </div>
                  <div>
                     <span class="block text-xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Occupied</span>
                     <span class="block text-xs font-bold text-gray-400 mt-1">Guests are currently seated</span>
                  </div>
                </div>
              </button>

              <button 
                onclick="window.setTableStatus('PENDING')"
                class="relative overflow-hidden w-full p-6 rounded-[2rem] border-2 transition-all group text-left ${
                  selectedTable.status === 'PENDING' 
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/10" 
                    : "border-transparent bg-gray-50 dark:bg-black border dark:border-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800/50"
                }"
              >
                <div class="flex items-center gap-5 relative z-10">
                  <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedTable.status === 'PENDING' ? "bg-amber-500 text-white shadow-md shadow-amber-500/30" : "bg-white dark:bg-gray-700 text-amber-500 shadow-sm"
                  }">
                    <i data-lucide="clock" class="w-6 h-6"></i>
                  </div>
                  <div>
                     <span class="block text-xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Needs Attention</span>
                     <span class="block text-xs font-bold text-gray-400 mt-1">Waiting for food or bill payment</span>
                  </div>
                </div>
              </button>
            </div>

            <div class="pt-8 mt-auto">
              <button onclick="window.location.href='/menu.html'" class="w-full py-5 rounded-[24px] bg-[#FF0000] text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/30 hover:bg-red-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                <i data-lucide="smartphone" class="w-5 h-5"></i> Take Order
              </button>
            </div>
          </div>
        ` : `
          <!-- Empty State -->
          <div class="flex flex-col items-center justify-start h-full text-center p-8 fade-in opacity-80 pt-24">

            <!-- Legend Status Guide moved here -->
            <div class="w-full bg-gray-50 dark:bg-black p-6 rounded-3xl border border-gray-100 dark:border-gray-900 space-y-4 text-left">
               <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">Status Guide</p>
               <div class="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                 <div class="w-4 h-4 rounded-full bg-green-500 shadow-sm flex-shrink-0"></div> Free - Ready for guests
               </div>
               <div class="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                 <div class="w-4 h-4 rounded-full bg-[#FF0000] shadow-sm flex-shrink-0"></div> Occupied - Guests seated
               </div>
               <div class="flex items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                 <div class="w-4 h-4 rounded-full bg-amber-500 shadow-sm flex-shrink-0"></div> Pending - Needs attention
               </div>
            </div>
          </div>
        `}
      </div>

      <!-- Edit Name Modal -->
      ${editingTableNameId ? `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in" onclick="window.closeEditModal()">
           <div class="bg-white dark:bg-black p-8 rounded-[2rem] shadow-2xl border dark:border-gray-800 w-full max-w-sm flex flex-col gap-6" onclick="event.stopPropagation()">
              <div>
                <h3 class="text-2xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}">Rename Table</h3>
                <p class="text-xs font-bold text-gray-500 mt-1">Give this table a custom identifier</p>
              </div>
              <input 
                type="text" 
                id="edit-table-name"
                value="${store.tables.find(t => t.id === editingTableNameId)?.name || store.tables.find(t => t.id === editingTableNameId)?.number || ''}"
                class="w-full p-4 rounded-2xl font-black text-lg transition-all focus:ring-4 focus:ring-indigo-500/20 focus:outline-none ${isDarkMode ? "bg-black text-white border-gray-800 shadow-inner" : "bg-gray-50 text-gray-900 border-gray-200"} border"
              />
              <div class="flex gap-3">
                <button onclick="window.closeEditModal()" class="flex-1 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                <button onclick="window.saveTableName()" class="flex-1 py-4 rounded-xl font-bold bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition-colors">Save Name</button>
              </div>
           </div>
        </div>
      ` : ''}

    </div>
  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/tables.html');
  initLayoutListeners();
  
  setTimeout(() => {
    try {
      if (typeof createIcons === 'function') {
        createIcons({ icons });
      }
    } catch (e) { console.warn('Lucide icons failed to load', e); }
    attachListeners();
    attachDragListeners();
  }, 0);
}

function reRender() {
  renderTables();
}

function attachDragListeners() {
  const canvas = document.getElementById('canvas-container');
  if (!canvas) return;

  const handleMouseMove = (e) => {
    if (isEditMode && draggingTableId) {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left - dragOffsetX;
      let y = e.clientY - rect.top - dragOffsetY;
      
      const TABLE_SIZE = 112; // width-28 & height-28 in tailwind
      const maxW = Math.max(rect.width, 800) - TABLE_SIZE;
      const maxH = Math.max(rect.height, 600) - TABLE_SIZE;
      
      x = Math.max(20, Math.min(x, maxW));
      y = Math.max(100, Math.min(y, maxH)); // 100px clearance keeps it safely below the Floor Plan header!
      
      const el = document.querySelector(`.table-btn[data-id="${draggingTableId}"]`);
      if (el) {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
    }
  };

  const handleMouseUp = (e) => {
    if (isEditMode && draggingTableId) {
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left - dragOffsetX;
      let y = e.clientY - rect.top - dragOffsetY;
      
      const TABLE_SIZE = 112;
      const maxW = Math.max(rect.width, 800) - TABLE_SIZE;
      const maxH = Math.max(rect.height, 600) - TABLE_SIZE;
      
      x = Math.max(20, Math.min(x, maxW));
      y = Math.max(100, Math.min(y, maxH));
      
      store.updateTablePosition(draggingTableId, x, y);
      draggingTableId = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // We don't need to reRender because the position was already updated visually and stored in the data store.
    }
  };

  const tableBtns = document.querySelectorAll('.table-btn');
  tableBtns.forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      // Prevent drag initiation if they click a nested button
      if (e.target.closest('button')) return;

      if (isEditMode) {
        draggingTableId = btn.getAttribute('data-id');
        const rect = btn.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isEditMode) {
        selectedTableId = btn.getAttribute('data-id');
        reRender();
      }
    });
  });

  // Background click to clear selection
  canvas.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.table-btn')) {
      if (!isEditMode && selectedTableId) {
        selectedTableId = null;
        reRender();
      }
    }
  });
}

function attachListeners() {
  // edit-mode-btn now uses onclick
}

window.toggleEditMode = () => {
  if (store.userRole !== 'owner' && store.userRole !== 'cashier') {
    accessError = 'Access Restricted: You do not have permission to edit the floor plan.';
    reRender();
    setTimeout(() => { accessError = null; reRender(); }, 3000);
    return;
  }
  isEditMode = !isEditMode;
  if (isEditMode) selectedTableId = null;
  reRender();
};

window.openEditName = (e, tableId) => {
  e.stopPropagation();
  editingTableNameId = tableId;
  reRender();
};

window.addTable = () => {
  if (store.userRole !== 'owner' && store.userRole !== 'cashier') return;

  store.addTable({
    id: `t${Date.now()}`,
    name: `Table ${store.tables.length + 1}`,
    status: 'FREE',
    position: { x: 50, y: 150 },
  });
};

window.deleteTable = (e, id) => {
  e.stopPropagation();
  if (store.userRole !== 'owner' && store.userRole !== 'cashier') return;

  store.removeTable(id);
  if (selectedTableId === id) selectedTableId = null;
};

window.closeSidebar = () => {
  selectedTableId = null;
  reRender();
};

window.setTableStatus = (status) => {
  if (selectedTableId) {
    store.updateTableStatus(selectedTableId, status);
    reRender();
  }
};

window.closeEditModal = () => {
  editingTableNameId = null;
  reRender();
};

window.saveTableName = () => {
  const input = document.getElementById('edit-table-name');
  if (input && editingTableNameId) {
    const nextName = input.value.trim();

    if (nextName) {
      store.renameTable(editingTableNameId, nextName);
    }

    editingTableNameId = null;
    reRender();
  }
};

store.subscribe(reRender);
renderTables();
