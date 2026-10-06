import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { campaignStore } from '../../services/campaignStore';
import { formatNumber } from '../../utils/formatters';
import { Layers, Film, Eye, Flame } from 'lucide-react';

Chart.register(...registerables);

export const DashboardView: React.FC = () => {
  const stats = campaignStore.getDashboardStats();

  const campaignChartRef = useRef<HTMLCanvasElement | null>(null);
  const platformChartRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartRef = useRef<HTMLCanvasElement | null>(null);
  const topInfluencerChartRef = useRef<HTMLCanvasElement | null>(null);

  const chartInstances = useRef<Record<string, Chart>>({});

  useEffect(() => {
    // Destroy previous charts
    Object.values(chartInstances.current).forEach((c) => c.destroy());
    chartInstances.current = {};

    // 1. Campaign Reach & Engagement (Bar Chart)
    if (campaignChartRef.current) {
      chartInstances.current['campaign'] = new Chart(campaignChartRef.current, {
        type: 'bar',
        data: {
          labels: stats.campaignBreakdown.map((c) => c.campaign),
          datasets: [
            {
              label: 'Reach / View',
              data: stats.campaignBreakdown.map((c) => c.reach),
              backgroundColor: '#3b82f6',
              borderRadius: 6,
            },
            {
              label: 'Engagement',
              data: stats.campaignBreakdown.map((c) => c.engagement),
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
            },
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 11 } },
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

    // 4. Top 5 Influencers by ER% (Horizontal Bar)
    if (topInfluencerChartRef.current) {
      chartInstances.current['topInfluencer'] = new Chart(topInfluencerChartRef.current, {
        type: 'bar',
        data: {
          labels: stats.topInfluencers.map((t) => t.influencer),
          datasets: [
            {
              label: 'ER (%)',
              data: stats.topInfluencers.map((t) => Number(t.erPercent.toFixed(2))),
              backgroundColor: '#8b5cf6',
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
                label: (ctx) => `ER: ${ctx.parsed.x}%`,
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: '#94a3b8',
                font: { size: 11 },
                callback: (val) => `${val}%`,
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
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* 4 KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-[#3b82f6]/40 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              Total Campaign
            </span>
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">{formatNumber(stats.totalCampaign)}</div>
          <p className="text-[11px] text-[#94a3b8] mt-1">Kampanye terdaftar</p>
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
          <p className="text-[11px] text-[#94a3b8] mt-1">Postingan terdata</p>
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
          <p className="text-[11px] text-[#94a3b8] mt-1">Total impresi & audiens</p>
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
          <p className="text-[11px] text-[#94a3b8] mt-1">Likes, comments, shares, saves</p>
        </div>
      </div>

      {/* TOP ROW CHARTS: Campaign Breakdown & Platform Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />
          <h3 className="text-sm font-bold text-[#f1f5f9] mb-4">
            Reach & Engagement per Campaign
          </h3>
          <div className="h-[280px] w-full">
            <canvas ref={campaignChartRef}></canvas>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#06d6a0] absolute top-0 left-0" />
          <h3 className="text-sm font-bold text-[#f1f5f9] mb-4">
            Distribusi Konten per Platform
          </h3>
          <div className="h-[280px] w-full">
            <canvas ref={platformChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW CHARTS: Trend per Month & Top ER% Influencer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#06d6a0] to-[#3b82f6] absolute top-0 left-0" />
          <h3 className="text-sm font-bold text-[#f1f5f9] mb-4">
            Tren Jumlah Post per Bulan
          </h3>
          <div className="h-[240px] w-full">
            <canvas ref={trendChartRef}></canvas>
          </div>
        </div>

        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="h-0.5 w-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] absolute top-0 left-0" />
          <h3 className="text-sm font-bold text-[#f1f5f9] mb-4">
            Top 5 Influencer by ER%
          </h3>
          <div className="h-[240px] w-full">
            <canvas ref={topInfluencerChartRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};
