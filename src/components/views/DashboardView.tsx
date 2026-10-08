import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { campaignStore } from '../../services/campaignStore';
import { formatNumber, formatPercent } from '../../utils/formatters';
import {
  Layers,
  Film,
  Eye,
  Flame,
  Activity,
  ArrowUpDown,
  Calendar,
  Sparkles,
  Users,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  PeriodFilter,
  CampaignSortKey,
  InfluencerSortKey,
} from '../../types';

Chart.register(...registerables);

interface DashboardViewProps {
  onGoToDataKonten?: () => void;
}

const PERIOD_OPTIONS: { id: PeriodFilter; label: string; short: string }[] = [
  { id: 'all', label: 'Semua Waktu', short: 'Semua' },
  { id: '3m', label: '3 Bulan Terakhir', short: '3 Bulan' },
  { id: '6m', label: '6 Bulan Terakhir', short: '6 Bulan' },
  { id: '9m', label: '9 Bulan Terakhir', short: '9 Bulan' },
  { id: '12m', label: '12 Bulan (1 Thn)', short: '12 Bulan' },
];

const CAMPAIGN_SORT_OPTIONS: { id: CampaignSortKey; label: string }[] = [
  { id: 'reach', label: 'Urutkan: Reach / View Tertinggi' },
  { id: 'engagement', label: 'Urutkan: Engagement Tertinggi' },
  { id: 'er', label: 'Urutkan: ER (%) Tertinggi' },
  { id: 'content', label: 'Urutkan: Jumlah Post Terbanyak' },
  { id: 'name', label: 'Urutkan: Nama Campaign (A-Z)' },
];

const INFLUENCER_SORT_OPTIONS: { id: InfluencerSortKey; label: string }[] = [
  { id: 'er', label: 'Urutkan: ER (%) Tertinggi' },
  { id: 'engagement', label: 'Urutkan: Engagement Tertinggi' },
  { id: 'reach', label: 'Urutkan: Reach Tertinggi' },
  { id: 'content', label: 'Urutkan: Jumlah Post Terbanyak' },
  { id: 'name', label: 'Urutkan: Nama Influencer (A-Z)' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({ onGoToDataKonten }) => {
  // Campaign Filter & Sync State
  const [selectedCampaign, setSelectedCampaign] = useState<string>(() => campaignStore.getSelectedCampaign());

  // Filter & Sort States
  const [campaignPeriod, setCampaignPeriod] = useState<PeriodFilter>('all');
  const [campaignSort, setCampaignSort] = useState<CampaignSortKey>('reach');

  const [influencerPeriod, setInfluencerPeriod] = useState<PeriodFilter>('all');
  const [influencerSort, setInfluencerSort] = useState<InfluencerSortKey>('er');

  // Breakdown Table Tab state
  const [activeTableTab, setActiveTableTab] = useState<'campaign' | 'influencer'>('campaign');

  const [tick, setTick] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [isUpdatingFlash, setIsUpdatingFlash] = useState<boolean>(false);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = campaignStore.subscribe(() => {
      setTick((t) => t + 1);
      setSelectedCampaign(campaignStore.getSelectedCampaign());
      setLastUpdatedTime(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setIsUpdatingFlash(true);
      setTimeout(() => setIsUpdatingFlash(false), 1200);
    });
    return unsubscribe;
  }, []);

  const handleSelectCampaign = (c: string) => {
    setSelectedCampaign(c);
    campaignStore.setSelectedCampaign(c);
  };

  // Compute live statistics and analyses based on selected campaign, periods & sort
  const stats = campaignStore.getDashboardStats(
    campaignPeriod,
    influencerPeriod,
    campaignSort,
    influencerSort,
    selectedCampaign
  );
  const campaignAnalysis = campaignStore.getCampaignAnalysis(campaignPeriod, campaignSort, selectedCampaign);
  const influencerAnalysis = campaignStore.getInfluencerAnalysis(influencerPeriod, influencerSort, selectedCampaign);
  const distinctCampaigns = campaignStore.getDistinctOptions().campaigns;

  const campaignChartRef = useRef<HTMLCanvasElement | null>(null);
  const platformChartRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartRef = useRef<HTMLCanvasElement | null>(null);
  const influencerChartRef = useRef<HTMLCanvasElement | null>(null);

  const chartInstances = useRef<Record<string, Chart>>({});

  // Quick preset apply both
  const handleApplyGlobalPeriod = (period: PeriodFilter) => {
    setCampaignPeriod(period);
    setInfluencerPeriod(period);
  };

  useEffect(() => {
    // Destroy previous charts before redrawing
    Object.values(chartInstances.current).forEach((c) => c.destroy());
    chartInstances.current = {};

    // 1. Campaign Reach & Engagement (Bar Chart)
    if (campaignChartRef.current) {
      const labels = stats.campaignBreakdown.map((c) => c.campaign);
      const reachData = stats.campaignBreakdown.map((c) => c.reach);
      const engData = stats.campaignBreakdown.map((c) => c.engagement);

      chartInstances.current['campaign'] = new Chart(campaignChartRef.current, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['Tidak ada data'],
          datasets: [
            {
              label: 'Reach / View',
              data: reachData.length > 0 ? reachData : [0],
              backgroundColor: '#3b82f6',
              borderRadius: 6,
            },
            {
              label: 'Engagement',
              data: engData.length > 0 ? engData : [0],
              backgroundColor: '#06d6a0',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
            },
            tooltip: {
              backgroundColor: '#0f1729',
              borderColor: '#253449',
              borderWidth: 1,
              titleColor: '#f1f5f9',
              bodyColor: '#94a3b8',
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('id-ID')}`,
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                maxRotation: 30,
                minRotation: 0,
              },
              grid: { color: '#1c2a41' },
            },
            y: {
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                callback: (val) => Number(val).toLocaleString('id-ID'),
              },
              grid: { color: '#1c2a41' },
            },
          },
        },
      });
    }

    // 2. Platform Distribution (Doughnut)
    if (platformChartRef.current) {
      chartInstances.current['platform'] = new Chart(platformChartRef.current, {
        type: 'doughnut',
        data: {
          labels: stats.platformBreakdown.map((p) => p.platform),
          datasets: [
            {
              data: stats.platformBreakdown.map((p) => p.count),
              backgroundColor: [
                '#06d6a0',
                '#3b82f6',
                '#8b5cf6',
                '#eab308',
                '#ef4444',
                '#64748b',
              ],
              borderColor: '#16213a',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
            },
            tooltip: {
              backgroundColor: '#0f1729',
              borderColor: '#253449',
              borderWidth: 1,
            },
          },
        },
      });
    }

    // 3. Post Trend per Month (Line)
    if (trendChartRef.current) {
      chartInstances.current['trend'] = new Chart(trendChartRef.current, {
        type: 'line',
        data: {
          labels: stats.trend.map((t) => t.period),
          datasets: [
            {
              label: 'Jumlah Post',
              data: stats.trend.map((t) => t.count),
              borderColor: '#06d6a0',
              backgroundColor: 'rgba(6,214,160,0.15)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#06d6a0',
              pointBorderColor: '#ffffff',
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { size: 11 } },
            },
            tooltip: {
              backgroundColor: '#0f1729',
              borderColor: '#253449',
              borderWidth: 1,
            },
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 11 } },
              grid: { color: '#1c2a41' },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                stepSize: 1,
              },
              grid: { color: '#1c2a41' },
            },
          },
        },
      });
    }

    // 4. Influencer Ranking Chart (Horizontal Bar)
    if (influencerChartRef.current) {
      const topItems = stats.topInfluencers;
      const labels = topItems.map((t) => t.influencer);
      
      let metricLabel = 'ER (%)';
      let metricData = topItems.map((t) => Number(t.erPercent.toFixed(2)));
      let metricBg = '#8b5cf6';

      if (influencerSort === 'engagement') {
        metricLabel = 'Total Engagement';
        metricData = topItems.map((t) => Number(t.engagement || 0));
        metricBg = '#06d6a0';
      } else if (influencerSort === 'reach') {
        metricLabel = 'Total Reach';
        metricData = topItems.map((t) => Number(t.reach || 0));
        metricBg = '#3b82f6';
      } else if (influencerSort === 'content') {
        metricLabel = 'Jumlah Konten';
        metricData = topItems.map((t) => Number(t.count || 0));
        metricBg = '#eab308';
      }

      chartInstances.current['influencer'] = new Chart(influencerChartRef.current, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['Tidak ada data'],
          datasets: [
            {
              label: metricLabel,
              data: metricData.length > 0 ? metricData : [0],
              backgroundColor: metricBg,
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: '#0f1729',
              borderColor: '#253449',
              borderWidth: 1,
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed.x;
                  return influencerSort === 'er'
                    ? `ER: ${val}%`
                    : `${metricLabel}: ${Number(val).toLocaleString('id-ID')}`;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                callback: (val) =>
                  influencerSort === 'er'
                    ? `${val}%`
                    : Number(val).toLocaleString('id-ID'),
              },
              grid: { color: '#1c2a41' },
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' } },
              grid: { color: '#1c2a41' },
            },
          },
        },
      });
    }

    return () => {
      Object.values(chartInstances.current).forEach((c) => c.destroy());
    };
  }, [
    stats,
    campaignPeriod,
    campaignSort,
    influencerPeriod,
    influencerSort,
    selectedCampaign,
    tick,
  ]);

  return (
    <div className="space-y-6">
      {/* REAL-TIME DASHBOARD STATUS & SYNC BANNER */}
      <div className="bg-gradient-to-r from-[#131c2e] via-[#16213a] to-[#131c2e] border border-[#253449] rounded-xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-[#06d6a0] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-white">
                  {selectedCampaign ? `Dashboard Analisis: ${selectedCampaign}` : 'Dashboard Analisis Interaktif'}
                </span>
                {selectedCampaign ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    SINKRON: {selectedCampaign.toUpperCase()}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-[#06d6a0] border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06d6a0] animate-ping" />
                    LIVE SYNCED: SEMUA CAMPAIGN
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                {selectedCampaign
                  ? `Status Sinkronisasi Aktif: Terhubung ke "${selectedCampaign}". Menampilkan ${stats.totalContent} konten, reach ${formatNumber(stats.totalReach)}, dan ER ${formatPercent(stats.averageEr || 0)}.`
                  : 'Status Sinkronisasi Aktif: Terhubung ke seluruh basis data. Pilih campaign di bawah ini untuk melihat fokus performa spesifik.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            {selectedCampaign && (
              <button
                type="button"
                onClick={() => handleSelectCampaign('')}
                className="px-2.5 py-1 text-[11px] font-semibold text-[#94a3b8] hover:text-white bg-[#0f1729] hover:bg-[#1e2a44] border border-[#253449] rounded-lg transition-colors cursor-pointer"
                title="Tampilkan semua campaign"
              >
                Reset ke Semua Campaign
              </button>
            )}

            <div
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                isUpdatingFlash
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30'
                  : 'bg-[#0f1729] border-[#253449] text-[#94a3b8]'
              }`}
            >
              <span>Update: </span>
              <span className="text-white font-mono">{lastUpdatedTime}</span>
            </div>

            {onGoToDataKonten && (
              <button
                type="button"
                onClick={onGoToDataKonten}
                className="px-3 py-1.5 bg-[#1e2a44] hover:bg-[#253449] text-sky-400 hover:text-sky-300 font-bold rounded-lg border border-sky-500/30 transition-colors cursor-pointer text-xs"
              >
                Data Konten →
              </button>
            )}
          </div>
        </div>

        {/* Campaign Selection Row (Synced with Data Konten & Store) */}
        <div className="pt-2.5 border-t border-[#1e2a44] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-white">Pilih & Sinkronkan Campaign:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectCampaign('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !selectedCampaign
                  ? 'bg-gradient-to-r from-[#06d6a0] to-[#3b82f6] text-[#06121f] shadow-sm font-extrabold ring-1 ring-white/20'
                  : 'bg-[#0f1729] hover:bg-[#1f2d45] text-[#94a3b8] hover:text-white border border-[#253449]'
              }`}
            >
              Semua Campaign ({distinctCampaigns.length})
            </button>

            {distinctCampaigns.map((camp) => {
              const isSelected = selectedCampaign.toLowerCase() === camp.toLowerCase();
              return (
                <button
                  key={camp}
                  type="button"
                  onClick={() => handleSelectCampaign(camp)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm font-extrabold ring-1 ring-white/30'
                      : 'bg-[#0f1729] hover:bg-[#1f2d45] text-[#94a3b8] hover:text-white border border-[#253449]'
                  }`}
                  title={`Fokuskan status dashboard ke campaign: ${camp}`}
                >
                  {camp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Quick Period Selector */}
        <div className="pt-2 border-t border-[#1e2a44] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-white">Preset Rentang Waktu Dashboard:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PERIOD_OPTIONS.map((opt) => {
              const isAllActive = campaignPeriod === opt.id && influencerPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleApplyGlobalPeriod(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isAllActive
                      ? 'bg-gradient-to-r from-[#06d6a0] to-[#3b82f6] text-[#06121f] shadow-sm font-extrabold ring-1 ring-white/20'
                      : 'bg-[#0f1729] hover:bg-[#1f2d45] text-[#94a3b8] hover:text-white border border-[#253449]'
                  }`}
                  title={`Terapkan ${opt.label} ke grafik Campaign & Influencer`}
                >
                  {opt.short}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#3b82f6]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              {selectedCampaign ? 'Fokus Campaign' : 'Total Campaign'}
            </span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div
            className="text-xl sm:text-2xl font-black text-white truncate"
            title={selectedCampaign || `${formatNumber(stats.totalCampaign)} Kampanye`}
          >
            {selectedCampaign ? selectedCampaign : formatNumber(stats.totalCampaign)}
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            {selectedCampaign ? '1 Kampanye terpilih (Live Synced)' : 'Kampanye terdaftar'}
          </p>
        </div>

        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#8b5cf6]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              Total Konten
            </span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Film className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">{formatNumber(stats.totalContent)}</div>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            Postingan terdata{selectedCampaign ? ` (${selectedCampaign})` : ''}
          </p>
        </div>

        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#06d6a0]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              Total Reach / View
            </span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-[#06d6a0]">
              <Eye className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#06d6a0]">
            {formatNumber(stats.totalReach)}
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            Total impresi{selectedCampaign ? ` (${selectedCampaign})` : ''}
          </p>
        </div>

        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              Total Engagement
            </span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatNumber(stats.totalEngagement)}
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            {stats.averageEr !== undefined && stats.averageEr > 0
              ? `ER: ${formatPercent(stats.averageEr)} • `
              : ''}
            Likes, comments, shares, saves
          </p>
        </div>
      </div>

      {/* TOP ROW: CAMPAIGN ANALYSIS (WITH 3, 6, 9, 12 MONTH SELECTOR & SORT) & PLATFORM DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Campaign Breakdown Chart Card */}
        <div className="lg:col-span-7 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />
          
          <div>
            {/* Header with Title and Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Kinerja Campaign
                  </h3>
                  {selectedCampaign && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      Fokus: {selectedCampaign}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    {campaignAnalysis.periodLabel}
                  </span>
                </div>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">
                  Rentang: <span className="text-white font-medium">{campaignAnalysis.dateRangeText}</span>
                  {' • '}
                  <span className="text-emerald-400 font-bold">{campaignAnalysis.totalItems} Campaign</span>
                  {' • '}
                  <span className="text-sky-400 font-bold">{formatNumber(campaignAnalysis.totalContent)} Konten</span>
                </p>
              </div>

              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <select
                  value={campaignSort}
                  onChange={(e) => setCampaignSort(e.target.value as CampaignSortKey)}
                  className="bg-[#0f1729] border border-[#253449] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
                >
                  {CAMPAIGN_SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campaign Period Buttons (3 bulan, 6 bulan, 9 bulan, 12 bulan) */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 bg-[#0f1729]/80 p-1.5 rounded-lg border border-[#253449]/70">
              <span className="text-[11px] font-bold text-[#64748b] px-1.5">Pilih Periode:</span>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCampaignPeriod(opt.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    campaignPeriod === opt.id
                      ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-300/40'
                      : 'bg-[#16213a] text-[#94a3b8] hover:text-white hover:bg-[#1e2a44]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-[280px] w-full">
            <canvas ref={campaignChartRef}></canvas>
          </div>
        </div>

        {/* Platform Distribution Card */}
        <div className="lg:col-span-5 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#06d6a0] absolute top-0 left-0" />
          <div>
            <h3 className="text-sm font-bold text-[#f1f5f9] mb-1">
              Distribusi Konten per Platform
            </h3>
            <p className="text-[11px] text-[#94a3b8] mb-4">
              Komposisi postingan berdasarkan kanal media sosial
            </p>
          </div>
          <div className="h-[280px] w-full">
            <canvas ref={platformChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW CHARTS: Trend per Month & Influencer Ranking (with 3, 6, 9, 12 Month Selector & Sort) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Post Trend Card */}
        <div className="lg:col-span-5 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#06d6a0] to-[#3b82f6] absolute top-0 left-0" />
          <div>
            <h3 className="text-sm font-bold text-[#f1f5f9] mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Tren Jumlah Post per Bulan
            </h3>
            <p className="text-[11px] text-[#94a3b8] mb-4">
              Frekuensi peluncuran konten per bulan kalender
            </p>
          </div>
          <div className="h-[260px] w-full">
            <canvas ref={trendChartRef}></canvas>
          </div>
        </div>

        {/* Influencer Ranking Card with 3, 6, 9, 12 Month Selector */}
        <div className="lg:col-span-7 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] absolute top-0 left-0" />
          
          <div>
            {/* Header with Title and Sort Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Peringkat Influencer
                  </h3>
                  {selectedCampaign && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                      Fokus: {selectedCampaign}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    {influencerAnalysis.periodLabel}
                  </span>
                </div>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">
                  Rentang: <span className="text-white font-medium">{influencerAnalysis.dateRangeText}</span>
                  {' • '}
                  <span className="text-purple-400 font-bold">{influencerAnalysis.totalItems} Influencer</span>
                  {' • '}
                  Avg ER: <span className="text-cyan-400 font-bold">{influencerAnalysis.avgErPercent}%</span>
                </p>
              </div>

              {/* Influencer Sort Selector */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <select
                  value={influencerSort}
                  onChange={(e) => setInfluencerSort(e.target.value as InfluencerSortKey)}
                  className="bg-[#0f1729] border border-[#253449] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
                >
                  {INFLUENCER_SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Influencer Period Buttons (3 bulan, 6 bulan, 9 bulan, 12 bulan) */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 bg-[#0f1729]/80 p-1.5 rounded-lg border border-[#253449]/70">
              <span className="text-[11px] font-bold text-[#64748b] px-1.5">Pilih Periode:</span>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInfluencerPeriod(opt.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    influencerPeriod === opt.id
                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-300/40'
                      : 'bg-[#16213a] text-[#94a3b8] hover:text-white hover:bg-[#1e2a44]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-[260px] w-full">
            <canvas ref={influencerChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* TABEL HASIL ANALISIS REKAPITULASI SESUAI PILIHAN (CAMPAIGN & INFLUENCER) */}
      <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-sky-400 via-purple-400 to-emerald-400 absolute top-0 left-0" />

        {/* Section Header & Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Tabel Rekapitulasi Hasil Pilihan
            </h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Data terperinci hasil sortir per rentang periode 3 bulan, 6 bulan, 9 bulan, atau 12 bulan yang Anda pilih.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#0f1729] p-1 rounded-xl border border-[#253449]">
            <button
              type="button"
              onClick={() => setActiveTableTab('campaign')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTableTab === 'campaign'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Hasil Campaign ({campaignAnalysis.periodLabel})
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {campaignAnalysis.items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTableTab('influencer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTableTab === 'influencer'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Hasil Influencer ({influencerAnalysis.periodLabel})
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {influencerAnalysis.items.length}
              </span>
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        {activeTableTab === 'campaign' ? (
          <div>
            <div className="flex items-center justify-between bg-[#111927] px-3.5 py-2.5 rounded-lg border border-[#1e2a44] mb-3 text-xs">
              <div className="text-[#94a3b8]">
                <span>Filter Periode: </span>
                <span className="text-sky-400 font-bold">{campaignAnalysis.periodLabel}</span>
                <span className="mx-2">•</span>
                <span>Rentang Tanggal: </span>
                <span className="text-white font-mono">{campaignAnalysis.dateRangeText}</span>
              </div>
              <div className="text-[#94a3b8]">
                <span>Urutan: </span>
                <span className="text-emerald-400 font-semibold">
                  {CAMPAIGN_SORT_OPTIONS.find((s) => s.id === campaignSort)?.label}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3">Nama Campaign</th>
                    <th className="py-3 px-3">Platform</th>
                    <th className="py-3 px-3 text-center">Influencer</th>
                    <th className="py-3 px-3 text-right">Total Post</th>
                    <th className="py-3 px-3 text-right text-sky-400">Total Reach / View</th>
                    <th className="py-3 px-3 text-right text-emerald-400">Total Engagement</th>
                    <th className="py-3 px-3 text-right text-cyan-400">ER (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2a41]">
                  {campaignAnalysis.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-[#64748b]">
                        Tidak ada data campaign pada periode {campaignAnalysis.periodLabel} ({campaignAnalysis.dateRangeText}).
                      </td>
                    </tr>
                  ) : (
                    campaignAnalysis.items.map((c, idx) => (
                      <tr key={c.campaign} className="hover:bg-[#182337] transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-[#64748b] font-bold">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          {c.campaign}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {c.platforms.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e2a44] text-[#94a3b8]"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            title={c.influencers.join(', ')}
                          >
                            {c.influencerCount} KOL
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-white">
                          {formatNumber(c.totalContent)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-sky-400">
                          {formatNumber(c.totalReach)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {formatNumber(c.totalEngagement)}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-cyan-400">
                          {formatPercent(c.erPercent)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between bg-[#111927] px-3.5 py-2.5 rounded-lg border border-[#1e2a44] mb-3 text-xs">
              <div className="text-[#94a3b8]">
                <span>Filter Periode: </span>
                <span className="text-purple-400 font-bold">{influencerAnalysis.periodLabel}</span>
                <span className="mx-2">•</span>
                <span>Rentang Tanggal: </span>
                <span className="text-white font-mono">{influencerAnalysis.dateRangeText}</span>
              </div>
              <div className="text-[#94a3b8]">
                <span>Urutan: </span>
                <span className="text-purple-300 font-semibold">
                  {INFLUENCER_SORT_OPTIONS.find((s) => s.id === influencerSort)?.label}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-3">Nama Influencer</th>
                    <th className="py-3 px-3">Platform</th>
                    <th className="py-3 px-3 text-center">Campaign</th>
                    <th className="py-3 px-3 text-right">Total Post</th>
                    <th className="py-3 px-3 text-right text-sky-400">Total Reach</th>
                    <th className="py-3 px-3 text-right text-emerald-400">Total Engagement</th>
                    <th className="py-3 px-3 text-right text-purple-400">ER (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2a41]">
                  {influencerAnalysis.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-[#64748b]">
                        Tidak ada data influencer pada periode {influencerAnalysis.periodLabel} ({influencerAnalysis.dateRangeText}).
                      </td>
                    </tr>
                  ) : (
                    influencerAnalysis.items.map((inf, idx) => (
                      <tr key={inf.influencer} className="hover:bg-[#182337] transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-[#64748b] font-bold">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          {inf.influencer}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {inf.platforms.map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e2a44] text-[#94a3b8]"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            title={inf.campaigns.join(', ')}
                          >
                            {inf.campaignCount} Campaign
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-white">
                          {formatNumber(inf.totalContent)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-sky-400">
                          {formatNumber(inf.totalReach)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {formatNumber(inf.totalEngagement)}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-cyan-400">
                          {formatPercent(inf.erPercent)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

