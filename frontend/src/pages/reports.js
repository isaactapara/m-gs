import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';

let barChartInstance = null;
let timeframe = 'week';
let isLoading = false;
let loadError = '';
let reportData = null;

const currency = () => store.settings.currency || 'KSH';

const getRangeLabel = () => {
  if (timeframe === 'day') return 'Today';
  if (timeframe === 'month') return 'This Month';
  return 'Last 7 Days';
};

const loadReport = async () => {
  if (store.userRole !== 'owner') {
    return;
  }

  isLoading = true;
  loadError = '';
  renderReports();

  try {
    reportData = await store.fetchReportSummary(timeframe);
  } catch (error) {
    loadError = error.response?.data?.error?.message || error.message || 'Failed to load report data.';
  } finally {
    isLoading = false;
    renderReports();
  }
};

window.setTimeframe = async (value) => {
  timeframe = value;
  await loadReport();
};

window.exportToPDF = async () => {
  if (!reportData) return;

  const btn = document.getElementById('export-btn');
  const originalText = btn.innerHTML;

  btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> GENERATING...`;
  btn.classList.add('opacity-80', 'cursor-not-allowed');
  createIcons({ icons });

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margins = 20;
    const summary = reportData.summary || {};
    const trend = reportData.trend || [];

    const loadLogo = () => new Promise((resolve) => {
      const img = new Image();
      img.src = '/brand-logo-v2.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });

    const logoImg = await loadLogo();
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', margins, margins - 5, 25, 25);
    }

    const titleX = logoImg ? margins + 35 : margins;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('THE', titleX, margins + 5);

    doc.setFontSize(28);
    doc.setTextColor(255, 0, 0);
    doc.text("M&G's", titleX, margins + 13);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('RESTAURANT ANALYTICS', titleX, margins + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Timeframe: ${getRangeLabel()}   |   Generated: ${new Date().toLocaleString()}`, titleX, margins + 24);

    let yPos = margins + 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', margins, yPos);

    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Settled Revenue: ${currency()} ${Number(summary.settledRevenue || 0).toLocaleString()}`, margins, yPos);
    yPos += 7;
    doc.text(`Pending Total: ${currency()} ${Number(summary.pendingTotal || 0).toLocaleString()}`, margins, yPos);
    yPos += 7;
    doc.text(`Failed / Cancelled: ${currency()} ${Number(summary.failedTotal || 0).toLocaleString()}`, margins, yPos);
    yPos += 7;
    doc.text(`Anomaly Total: ${currency()} ${Number(summary.anomalyTotal || 0).toLocaleString()}`, margins, yPos);

    yPos += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Trend Breakdown', margins, yPos);

    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Period', margins, yPos);
    doc.text('Settled', margins + 80, yPos);
    doc.text('Pending', margins + 130, yPos);

    yPos += 4;
    doc.line(margins, yPos, 210 - margins, yPos);
    yPos += 8;

    trend.forEach((entry) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margins + 10;
      }

      doc.text(entry.label, margins, yPos);
      doc.text(`${currency()} ${Number(entry.settledRevenue || 0).toLocaleString()}`, margins + 80, yPos);
      doc.text(`${currency()} ${Number(entry.pendingTotal || 0).toLocaleString()}`, margins + 130, yPos);
      yPos += 6;
    });

    doc.save(`MandGs-Analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
  } finally {
    btn.innerHTML = originalText;
    btn.classList.remove('opacity-80', 'cursor-not-allowed');
    createIcons({ icons });
  }
};

function renderReports() {
  const isDarkMode = store.isDarkMode;
  const summary = reportData?.summary || {};
  const trend = reportData?.trend || [];

  if (store.userRole !== 'owner') {
    document.getElementById('root').innerHTML = renderLayout(`
      <div class="flex flex-col items-center justify-center min-h-[50vh]">
        <i data-lucide="shield-alert" class="w-16 h-16 text-[#FF0000] mb-4 opacity-50"></i>
        <h2 class="text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}">Access Denied</h2>
        <p class="text-gray-500 font-bold mt-2">Only owners can access analytics.</p>
      </div>
    `, '/reports.html');
    initLayoutListeners();
    createIcons({ icons });
    return;
  }

  const stats = [
    {
      label: 'Settled Revenue',
      value: `${currency()} ${Number(summary.settledRevenue || 0).toLocaleString()}`,
      icon: 'badge-dollar-sign',
      growth: `${summary.settledCount || 0} settled`,
      positive: true,
    },
    {
      label: 'Pending Exposure',
      value: `${currency()} ${Number(summary.pendingTotal || 0).toLocaleString()}`,
      icon: 'clock-3',
      growth: `${summary.pendingCount || 0} pending`,
      positive: summary.pendingTotal === 0,
    },
    {
      label: 'Failed / Cancelled',
      value: `${currency()} ${Number(summary.failedTotal || 0).toLocaleString()}`,
      icon: 'x-circle',
      growth: `${summary.failedCount || 0} failed`,
      positive: summary.failedTotal === 0,
    },
    {
      label: 'Anomalies',
      value: `${summary.anomalyCount || 0}`,
      icon: 'alert-triangle',
      growth: `${currency()} ${Number(summary.anomalyTotal || 0).toLocaleString()}`,
      positive: summary.anomalyCount === 0,
    },
  ];

  const html = `
    <div class="lg:h-[calc(100vh-80px)] flex-1 flex flex-col pt-4 md:pt-0 overflow-hidden bg-gray-50/10 dark:bg-black p-4 md:p-8 space-y-6 md:space-y-8 relative">
      <div class="flex flex-col items-center select-none w-full border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} pb-6">
        <span class="text-[9px] font-black uppercase tracking-[0.8em] text-gray-400 mb-1 ml-[0.8em]">THE</span>
        <h2 class="text-5xl font-black text-[#FF0000] tracking-tighter leading-[0.85] mb-2 drop-shadow-sm">M&G's</h2>
        <div class="flex items-center gap-4 w-full px-12">
          <div class="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
          <span class="text-[12px] font-black uppercase tracking-[0.6em] ${isDarkMode ? 'text-white' : 'text-gray-900'} whitespace-nowrap ml-[0.6em]">RESTAURANT</span>
          <div class="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative flex items-center ${isDarkMode ? 'bg-black border border-gray-900' : 'bg-white'} rounded-2xl shadow-sm px-4">
          <i data-lucide="calendar" class="w-4 h-4 text-[#FF0000] absolute left-4 pointer-events-none"></i>
          <select onchange="window.setTimeframe(this.value)" class="pl-8 py-3 pr-8 bg-transparent text-xs font-black uppercase tracking-widest text-[#FF0000] outline-none cursor-pointer appearance-none">
            <option value="day" ${timeframe === 'day' ? 'selected' : ''}>Today</option>
            <option value="week" ${timeframe === 'week' ? 'selected' : ''}>Last 7 Days</option>
            <option value="month" ${timeframe === 'month' ? 'selected' : ''}>This Month</option>
          </select>
          <i data-lucide="chevron-down" class="w-4 h-4 text-[#FF0000] pointer-events-none absolute right-4"></i>
        </div>
        <button id="export-btn" onclick="window.exportToPDF()" ${!reportData || isLoading ? 'disabled' : ''} class="flex justify-center items-center gap-2 px-6 py-3 bg-[#FF0000] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <i data-lucide="download" class="w-4 h-4"></i> Export
        </button>
      </div>

      ${loadError ? `
        <div class="p-4 rounded-2xl bg-red-50 text-red-600 border border-red-200 font-bold text-sm">
          ${store.sanitize(loadError)}
        </div>
      ` : ''}

      ${isLoading ? `
        <div class="flex-1 flex items-center justify-center rounded-[32px] border ${isDarkMode ? 'bg-black border-gray-900 text-gray-400' : 'bg-white border-gray-100 text-gray-500'}">
          <div class="flex items-center gap-3 font-black uppercase tracking-widest text-xs">
            <i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Loading report data...
          </div>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          ${stats.map((stat) => `
            <div class="p-6 md:p-8 rounded-[2rem] md:rounded-[32px] border shadow-sm flex flex-col justify-between ${isDarkMode ? 'bg-black border-gray-900' : 'bg-white border-gray-100'} relative overflow-hidden">
              <div class="relative z-10 flex justify-between items-start mb-6">
                <div class="p-4 rounded-2xl bg-red-100 text-[#FF0000] dark:bg-red-500/20 shadow-inner">
                  <i data-lucide="${stat.icon}" class="w-6 h-6"></i>
                </div>
                <div class="flex items-center px-3 py-1.5 rounded-full ${stat.positive ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-600'} text-[10px] md:text-xs font-black border">
                  ${store.sanitize(stat.growth)}
                </div>
              </div>
              <div class="relative z-10">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">${store.sanitize(stat.label)}</p>
                <h3 class="text-3xl md:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}">${store.sanitize(stat.value)}</h3>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="w-full pb-8 md:pb-10 flex-1 flex flex-col">
          <div class="w-full p-6 md:p-8 rounded-[2rem] md:rounded-[40px] border shadow-sm flex-1 flex flex-col ${isDarkMode ? 'bg-black border-gray-900' : 'bg-white border-gray-100'}">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
              <div>
                <h4 class="font-black text-lg md:text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight">Settled vs Pending</h4>
                <p class="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">${getRangeLabel()}</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-400">
                  <div class="w-3 h-3 rounded-md bg-[#FF0000]"></div> Settled
                </div>
                <div class="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-400">
                  <div class="w-3 h-3 rounded-md bg-amber-400"></div> Pending
                </div>
              </div>
            </div>
            <div class="flex-1 w-full min-h-[300px] md:min-h-[400px] relative">
              <canvas id="barChart"></canvas>
            </div>
          </div>
        </div>
      `}
    </div>
  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/reports.html');
  initLayoutListeners();

  setTimeout(() => {
    createIcons({ icons });
    if (!isLoading && reportData) {
      initCharts(isDarkMode, trend);
    }
  }, 0);
}

function initCharts(isDarkMode, trend) {
  const labels = trend.map((entry) => entry.label);
  const settledRevenue = trend.map((entry) => entry.settledRevenue || 0);
  const pendingTotal = trend.map((entry) => entry.pendingTotal || 0);
  const gridColor = isDarkMode ? '#222' : '#f0f0f0';

  const barCtx = document.getElementById('barChart');
  if (!barCtx) return;

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  barChartInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Settled Revenue',
          data: settledRevenue,
          backgroundColor: '#FF0000',
          borderRadius: 6,
        },
        {
          label: 'Pending Total',
          data: pendingTotal,
          backgroundColor: '#FBBF24',
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: isDarkMode ? '#aaa' : '#666',
            font: { weight: 'bold' },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: isDarkMode ? '#888' : '#aaa', font: { weight: 'bold' } },
        },
        y: {
          grid: { color: gridColor, drawBorder: false, borderDash: [5, 5] },
          ticks: {
            color: isDarkMode ? '#888' : '#aaa',
            font: { weight: 'bold' },
            callback(value) {
              return value >= 1000 ? `${value / 1000}k` : value;
            },
          },
          beginAtZero: true,
        },
      },
    },
  });
}

store.subscribe(() => {
  if (!isLoading) {
    renderReports();
  }
});

renderReports();
loadReport();
