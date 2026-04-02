import '../styles/index.css';
import { store } from '../core/store.js';
import { renderLayout, initLayoutListeners } from '../components/Layout.js';
import { createIcons, icons } from 'lucide';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let barChartInstance = null;
let histogramTimeframe = 'week'; // controls only the histogram + trend card
let allData = null;              // { day, week, month } from /summary/all
let trendData = null;            // current histogram dataset
let isInitialLoad = true;
let isHistogramLoading = false;
let loadError = '';

const currency = () => store.settings.currency || 'KSH';
const fmt = (n) => Number(n || 0).toLocaleString();

const TIMEFRAME_LABELS = { day: 'Today', week: 'Last 7 Days', month: 'This Month' };

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

const loadAllData = async () => {
  if (store.userRole !== 'owner') return;

  // Optimistic rendering if cache exists
  if (store.reportSummary) {
     allData = store.reportSummary;
     trendData = allData[histogramTimeframe]?.trend || [];
     isInitialLoad = false;
     renderReports();
  }

  loadError = '';
  try {
    allData = await store.fetchAllSummaries();
    // Cache management is handled by the store.notify() inside fetchAllSummaries
    trendData = allData[histogramTimeframe]?.trend || [];
  } catch (err) {
    loadError = err.response?.data?.error?.message || err.message || 'Failed to load analytics.';
  } finally {
    isInitialLoad = false;
    renderReports();
  }
};

const loadHistogram = async (tf) => {
  if (store.userRole !== 'owner') return;

  isHistogramLoading = true;
  renderReports();

  try {
    // If we already have this timeframe in allData, use it instantly (zero-cost).
    if (allData?.[tf]) {
      trendData = allData[tf].trend || [];
    } else {
      const d = await store.fetchReportSummary(tf);
      trendData = d.trend || [];
    }
  } catch (err) {
    loadError = err.response?.data?.error?.message || err.message || '';
  } finally {
    isHistogramLoading = false;
    renderReports();
  }
};

// ---------------------------------------------------------------------------
// Window handlers
// ---------------------------------------------------------------------------

window.setHistogramTimeframe = async (value) => {
  histogramTimeframe = value;
  await loadHistogram(value);
};

window.exportToPDF = async () => {
  if (!allData) return;

  const btn = document.getElementById('export-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> GENERATING...`;
  btn.classList.add('opacity-80', 'cursor-not-allowed');
  createIcons({ icons });

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margins = 20;
    const summaryDay   = allData.day?.summary   || {};
    const summaryWeek  = allData.week?.summary  || {};
    const summaryMonth = allData.month?.summary || {};
    const trend = trendData || [];

    const loadLogo = () => new Promise((resolve) => {
      const img = new Image();
      img.src = '/brand-logo-v2.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });

    const logoImg = await loadLogo();
    if (logoImg) doc.addImage(logoImg, 'PNG', margins, margins - 5, 25, 25);

    const titleX = logoImg ? margins + 35 : margins;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text('THE', titleX, margins + 5);
    doc.setFontSize(28); doc.setTextColor(255, 0, 0);
    doc.text("M&G's", titleX, margins + 13);
    doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    doc.text('RESTAURANT ANALYTICS', titleX, margins + 19);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`, titleX, margins + 24);

    let yPos = margins + 38;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(0, 0, 0);
    doc.text('Sales Summary', margins, yPos);

    yPos += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(`Total Sales Today:      ${currency()} ${fmt(summaryDay.totalSales)}   (${summaryDay.billCount || 0} bills)`, margins, yPos);
    yPos += 7;
    doc.text(`Total Sales This Week:  ${currency()} ${fmt(summaryWeek.totalSales)}   (${summaryWeek.billCount || 0} bills)`, margins, yPos);
    yPos += 7;
    doc.text(`Total Sales This Month: ${currency()} ${fmt(summaryMonth.totalSales)}   (${summaryMonth.billCount || 0} bills)`, margins, yPos);
    yPos += 7;
    doc.text(`Active Staff Now: ${summaryDay.activeUsersCount || 0}`, margins, yPos);

    yPos += 12;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text(`Trend: ${TIMEFRAME_LABELS[histogramTimeframe]}`, margins, yPos);

    yPos += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text('Period', margins, yPos);
    doc.text('Total Sales', margins + 100, yPos);
    yPos += 4;
    doc.line(margins, yPos, 210 - margins, yPos);
    yPos += 8;

    trend.forEach((entry) => {
      if (yPos > 270) { doc.addPage(); yPos = margins + 10; }
      doc.text(entry.label, margins, yPos);
      doc.text(`${currency()} ${fmt(entry.totalSales)}`, margins + 100, yPos);
      yPos += 6;
    });

    doc.save(`MandGs-Analytics-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
  } finally {
    btn.innerHTML = originalText;
    btn.classList.remove('opacity-80', 'cursor-not-allowed');
    createIcons({ icons });
  }
};

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderReports() {
  const isDarkMode = store.isDarkMode;
  const card = (isDarkMode)
    ? 'bg-black border-[#111]'
    : 'bg-white border-gray-100';

  if (store.userRole !== 'owner') {
    document.getElementById('root').innerHTML = renderLayout(`
      <div class="flex flex-col items-center justify-center min-h-[50vh]">
        <i data-lucide="shield-alert" class="w-16 h-16 text-[#FF0000] mb-4 opacity-50"></i>
        <h2 class="text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}">Access Denied</h2>
        <p class="text-gray-400 font-bold mt-2">Only owners can access analytics.</p>
      </div>
    `, '/reports.html');
    initLayoutListeners();
    createIcons({ icons });
    return;
  }

  const daySum   = allData?.day?.summary   || {};
  const weekSum  = allData?.week?.summary  || {};
  const monthSum = allData?.month?.summary || {};

  // Three stat cards — always above the fold
  const statCards = [
    {
      label: 'Total Sales Today',
      value: `${currency()} ${fmt(daySum.totalSales)}`,
      sub: `${daySum.billCount || 0} bills`,
      icon: 'sun',
      accent: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Total Sales This Week',
      value: `${currency()} ${fmt(weekSum.totalSales)}`,
      sub: `${weekSum.billCount || 0} bills`,
      icon: 'calendar-days',
      accent: 'text-[#FF0000]',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Total Sales This Month',
      value: `${currency()} ${fmt(monthSum.totalSales)}`,
      sub: `${monthSum.billCount || 0} bills`,
      icon: 'trending-up',
      accent: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Active Staff Now',
      value: `${daySum.activeUsersCount || 0}`,
      sub: daySum.activeUsernames?.length > 0
        ? daySum.activeUsernames.slice(0, 3).join(', ')
        : 'No staff online',
      icon: 'user-check',
      accent: 'text-green-500',
      bg: 'bg-green-500/10',
    },
  ];

  const html = `
    <div class="flex flex-col overflow-y-auto h-[calc(100vh-80px)] -m-4 md:-m-8 p-4 md:p-8 space-y-6 bg-gray-50/10 dark:bg-black">

      <!-- Page header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}">
            Analytics
          </h1>
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            M&amp;G's Restaurant · Settled bills only
          </p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          ${isInitialLoad ? '' : `
            <button
              id="export-btn"
              onclick="window.exportToPDF()"
              ${!allData ? 'disabled' : ''}
              class="flex items-center gap-2 px-5 py-2.5 bg-[#FF0000] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i data-lucide="download" class="w-4 h-4"></i> Export PDF
            </button>
          `}
        </div>
      </div>

      ${loadError ? `
        <div class="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 font-bold text-sm">
          ${store.sanitize(loadError)}
        </div>
      ` : ''}

      <!-- Stat cards: always above the fold -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        ${isInitialLoad
          ? Array.from({ length: 4 }).map(() => `
              <div class="p-6 rounded-[28px] border ${card} animate-pulse space-y-4">
                <div class="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
                <div class="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                <div class="h-4 w-1/2 bg-gray-100 dark:bg-gray-900 rounded-xl"></div>
              </div>
            `).join('')
          : statCards.map((s) => `
              <div class="p-6 rounded-[28px] border shadow-sm flex flex-col gap-4 ${card}">
                <div class="flex justify-between items-start">
                  <div class="p-3 rounded-2xl ${s.bg} ${s.accent}">
                    <i data-lucide="${s.icon}" class="w-5 h-5"></i>
                  </div>
                  <span class="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-gray-100 dark:bg-[#0a0a0a] px-2 py-1 rounded-full border dark:border-[#111]">
                    ${store.sanitize(s.sub)}
                  </span>
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                    ${store.sanitize(s.label)}
                  </p>
                  <h3 class="text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}">
                    ${store.sanitize(s.value)}
                  </h3>
                </div>
              </div>
            `).join('')
        }
      </div>

      <!-- Histogram panel -->
      <div class="flex-1 min-h-0 flex flex-col">
        <div class="rounded-[32px] border shadow-sm flex-1 flex flex-col overflow-hidden ${card}">
          <!-- chart header -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 md:p-8 border-b ${isDarkMode ? 'border-[#111]' : 'border-gray-100'}">
            <div>
              <h2 class="font-black text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight">
                Sales Histogram
              </h2>
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                ${TIMEFRAME_LABELS[histogramTimeframe]} · settled transactions only
              </p>
            </div>
            <!-- Timeframe selector for histogram only -->
            <div class="flex items-center gap-1 bg-gray-100 dark:bg-black border dark:border-[#111] p-1 rounded-xl">
              ${Object.entries(TIMEFRAME_LABELS).map(([tf, lbl]) => `
                <button
                  onclick="window.setHistogramTimeframe('${tf}')"
                  class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    histogramTimeframe === tf
                      ? 'bg-white dark:bg-[#111] text-[#FF0000] shadow-sm border dark:border-white/10'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }"
                >
                  ${lbl}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- chart body -->
          <div class="flex-1 p-6 md:p-8 min-h-[320px] relative">
            ${isHistogramLoading ? `
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="flex items-center gap-3 font-black uppercase tracking-widest text-xs text-gray-400">
                  <i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Loading chart...
                </div>
              </div>
            ` : `
              <canvas id="barChart" class="w-full h-full"></canvas>
            `}
          </div>
        </div>
      </div>

    </div>
  `;

  document.getElementById('root').innerHTML = renderLayout(html, '/reports.html');
  initLayoutListeners();

  setTimeout(() => {
    createIcons({ icons });
    if (!isHistogramLoading && trendData) {
      initChart(isDarkMode, trendData);
    }
  }, 0);
}

// ---------------------------------------------------------------------------
// Chart.js initialisation
// ---------------------------------------------------------------------------

function initChart(isDarkMode, trend) {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;

  if (barChartInstance) {
    barChartInstance.destroy();
    barChartInstance = null;
  }

  const labels     = trend.map((e) => e.label);
  const values     = trend.map((e) => Number(e.totalSales) || 0);
  const maxVal     = Math.max(...values, 1);
  const gridColor  = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
  const tickColor  = isDarkMode ? '#444' : '#bbb';

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Total Sales',
        data: values,
        backgroundColor: values.map((v) => {
          const intensity = maxVal > 0 ? v / maxVal : 0;
          const alpha = 0.4 + intensity * 0.6;
          return `rgba(255,0,0,${alpha.toFixed(2)})`;
        }),
        borderRadius: { topLeft: 8, topRight: 8 },
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDarkMode ? '#111' : '#fff',
          titleColor: isDarkMode ? '#fff' : '#111',
          bodyColor: isDarkMode ? '#aaa' : '#555',
          borderColor: isDarkMode ? '#333' : '#eee',
          borderWidth: 1,
          padding: 12,
          titleFont: { weight: 'bold', size: 13 },
          callbacks: {
            label: (ctx) => ` ${currency()} ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { weight: 'bold', size: 11 } },
          border: { display: false },
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          border: { display: false, dash: [4, 4] },
          ticks: {
            color: tickColor,
            font: { weight: 'bold', size: 11 },
            callback: (v) => v >= 1000 ? `${v / 1000}k` : v,
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

store.subscribe(() => {
  if (!isInitialLoad) renderReports();
});

// Render skeleton first — data arrives asynchronously
renderReports();
loadAllData();
