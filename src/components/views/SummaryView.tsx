import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { campaignStore } from '../../services/campaignStore';
import {
  formatDateShort,
  formatNumber,
  formatPercent,
  formatRupiah,
} from '../../utils/formatters';
import {
  ArrowUpDown,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Award,
} from 'lucide-react';
import {
  PeriodFilter,
  CampaignSortKey,
} from '../../types';

Chart.register(...registerables);

type SummarySortKey =
  | 'engagement'
  | 'reach'
  | 'er'
  | 'content'
  | 'cpe'
  | 'cpr'
  | 'cost'
  | 'name';

const PERIOD_BUTTONS: { id: PeriodFilter; label: string }[] = [
  { id: 'all', label: 'Semua Periode' },
  { id: '3m', label: '3 Bulan' },
  { id: '6m', label: '6 Bulan' },
  { id: '9m', label: '9 Bulan' },
  { id: '12m', label: '12 Bulan' },
];

export const SummaryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'influencer' | 'campaign'>('influencer');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('all');
  const [summarySort, setSummarySort] = useState<SummarySortKey>('engagement');
  const [campaignSort, setCampaignSort] = useState<CampaignSortKey>('reach');
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    const unsub = campaignStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const rankingChartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Ambil data analisis periode
  const selectedCampaign = campaignStore.getSelectedCampaign();
  const influencerAnalysis = campaignStore.getInfluencerAnalysis(
    selectedPeriod,
    summarySort === 'reach'
      ? 'reach'
      : summarySort === 'content'
      ? 'content'
      : summarySort === 'name'
      ? 'name'
      : summarySort === 'er'
      ? 'er'
      : 'engagement',
    selectedCampaign
  );

  const campaignAnalysis = campaignStore.getCampaignAnalysis(selectedPeriod, campaignSort, selectedCampaign);

  // Ambil data summary kontrak
  const allSummaries = campaignStore.computeInfluencerSummaries();
  const dateWindow = campaignStore.calculateDateWindow(selectedPeriod);

  // Filter kontrak sesuai periode jika bukan 'all'
  const filteredSummaries = allSummaries.filter((s) => {
    if (selectedPeriod === 'all' || !dateWindow.startDate || !dateWindow.endDate) return true;
    const sStart = new Date(s.periodeMulai).getTime();
    const sEnd = new Date(s.periodeSelesai).getTime();
    const wStart = dateWindow.startDate.getTime();
    const wEnd = dateWindow.endDate.getTime();
    // Overlapping period check
    return sStart <= wEnd && sEnd >= wStart;
  });

  // Sort summaries
  const sortedSummaries = [...filteredSummaries].sort((a, b) => {
    if (summarySort === 'reach') return b.totalReach - a.totalReach;
    if (summarySort === 'er') return b.erPercent - a.erPercent;
    if (summarySort === 'content') return b.totalContent - a.totalContent;
    if (summarySort === 'cost') return b.totalCost - a.totalCost;
    if (summarySort === 'cpe') return a.cpe - b.cpe; // lower CPE is better
    if (summarySort === 'cpr') return a.cpr - b.cpr; // lower CPR is better
    if (summarySort === 'name') return a.influencer.localeCompare(b.influencer);
    return b.totalEngagement - a.totalEngagement; // default
  });

  // Render Chart
  useEffect(() => {
    if (chartInstance.current) chartInstance.current.destroy();

    const top8 = sortedSummaries.slice(0, 8);

    if (rankingChartRef.current) {
      const metricLabel =
        summarySort === 'reach'
          ? 'Total Reach'
          : summarySort === 'er'
          ? 'ER (%)'
          : summarySort === 'cpe'
          ? 'CPE (Rp)'
          : summarySort === 'cpr'
          ? 'CPR (Rp)'
          : 'Total Engagement';

      const metricData = top8.map((s) =>
        summarySort === 'reach'
          ? s.totalReach
          : summarySort === 'er'
          ? Number(s.erPercent.toFixed(2))
          : summarySort === 'cpe'
          ? s.cpe
          : summarySort === 'cpr'
          ? s.cpr
          : s.totalEngagement
      );

      const metricBg =
        summarySort === 'reach'
          ? '#3b82f6'
          : summarySort === 'er'
          ? '#8b5cf6'
          : summarySort === 'cpe' || summarySort === 'cpr'
          ? '#eab308'
          : '#06d6a0';

      chartInstance.current = new Chart(rankingChartRef.current, {
        type: 'bar',
        data: {
          labels: top8.map((s) => s.influencer),
          datasets: [
            {
              label: metricLabel,
              data: metricData,
              backgroundColor: metricBg,
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
                callback: (val) =>
                  summarySort === 'er'
                    ? `${val}%`
                    : Number(val).toLocaleString('id-ID'),
              },
              grid: { color: '#1c2a41' },
            },
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [sortedSummaries, summarySort, selectedPeriod, tick]);

  return (
    <div className="space-y-6">
      {/* FILTER & PERIOD SELECTOR CONTROL BAR */}
      <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm space-y-3">
        {selectedCampaign && (
          <div className="flex items-center justify-between pb-2.5 border-b border-[#253449]/70 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
              <span className="text-white font-bold">Sinkronisasi Campaign Aktif:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {selectedCampaign}
              </span>
            </div>
            <button
              type="button"
              onClick={() => campaignStore.setSelectedCampaign('')}
              className="text-[11px] text-[#94a3b8] hover:text-white underline cursor-pointer"
            >
              Reset ke Semua Campaign
            </button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Switcher (Influencer vs Campaign) */}
          <div className="flex items-center gap-2 bg-[#0f1729] p-1 rounded-xl border border-[#253449] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('influencer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'influencer'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Sort Influencer (3, 6, 9, 12 Bln)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('campaign')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'campaign'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Sort Campaign (3, 6, 9, 12 Bln)
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            {activeTab === 'influencer' ? (
              <select
                value={summarySort}
                onChange={(e) => setSummarySort(e.target.value as SummarySortKey)}
                className="bg-[#0f1729] border border-[#253449] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer font-medium"
              >
                <option value="engagement">Urutkan: Engagement Tertinggi</option>
                <option value="reach">Urutkan: Reach Tertinggi</option>
                <option value="er">Urutkan: ER (%) Tertinggi</option>
                <option value="cpe">Urutkan: CPE Terendah (Efisien)</option>
                <option value="cpr">Urutkan: CPR Terendah (Cost per Reach)</option>
                <option value="cost">Urutkan: Total Biaya Terbesar</option>
                <option value="content">Urutkan: Jumlah Konten Terbanyak</option>
                <option value="name">Urutkan: Nama Influencer (A-Z)</option>
              </select>
            ) : (
              <select
                value={campaignSort}
                onChange={(e) => setCampaignSort(e.target.value as CampaignSortKey)}
                className="bg-[#0f1729] border border-[#253449] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer font-medium"
              >
                <option value="reach">Urutkan: Reach Tertinggi</option>
                <option value="engagement">Urutkan: Engagement Tertinggi</option>
                <option value="er">Urutkan: ER (%) Tertinggi</option>
                <option value="content">Urutkan: Jumlah Post Terbanyak</option>
                <option value="name">Urutkan: Nama Campaign (A-Z)</option>
              </select>
            )}
          </div>
        </div>

        {/* Period Buttons (3 bulan, 6 bulan, 9 bulan, 12 bulan) */}
        <div className="pt-2 border-t border-[#1e2a44] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-[#64748b]">Pilih Periode:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PERIOD_BUTTONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedPeriod(opt.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === opt.id
                      ? activeTab === 'campaign'
                        ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-300/40'
                        : 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-300/40'
                      : 'bg-[#0f1729] hover:bg-[#1f2d45] text-[#94a3b8] hover:text-white border border-[#253449]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[#94a3b8] bg-[#0f1729] px-2.5 py-1 rounded-md border border-[#253449]">
            Rentang: <span className="text-white font-mono">{dateWindow.dateRangeText}</span>
          </div>
        </div>
      </div>

      {/* VIEW CONTENT BASED ON TAB */}
      {activeTab === 'influencer' ? (
        <>
          {/* RANKING CHART */}
          <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] to-[#8b5cf6] absolute top-0 left-0" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Ranking Influencer ({dateWindow.periodLabel})
              </h3>
              <span className="text-[11px] font-bold text-purple-400 bg-purple-950/40 border border-purple-500/20 px-2.5 py-1 rounded-full">
                {sortedSummaries.length} Influencer Terdata
              </span>
            </div>
            <div className="h-[250px] w-full">
              <canvas ref={rankingChartRef}></canvas>
            </div>
          </div>

          {/* SUMMARY TABLE */}
          <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06d6a0] absolute top-0 left-0" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Ringkasan Performa Kontrak Influencer
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Menampilkan data periode {dateWindow.periodLabel} ({dateWindow.dateRangeText})
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#06d6a0] bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                Fitur CPR (Cost per Reach) Aktif
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                    <th className="py-3 px-3">Influencer</th>
                    <th className="py-3 px-3">Periode Kontrak</th>
                    <th className="py-3 px-3 text-center">Platform Dominan</th>
                    <th className="py-3 px-3 text-right">Konten</th>
                    <th className="py-3 px-3 text-right">Total Reach</th>
                    <th className="py-3 px-3 text-right text-emerald-400">Total Eng.</th>
                    <th className="py-3 px-3 text-right text-cyan-400">ER (%)</th>
                    <th className="py-3 px-3 text-right">Total Biaya</th>
                    <th className="py-3 px-3 text-right text-amber-400">CPE (Rp)</th>
                    <th className="py-3 px-3 text-right">Cost / Konten</th>
                    <th className="py-3 px-3 text-right text-sky-400">CPR (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2a41]">
                  {sortedSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-[#64748b]">
                        Belum ada data kontrak atau konten pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    sortedSummaries.map((s) => (
                      <tr key={s.idKontrak} className="hover:bg-[#182337] transition-colors">
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          {s.influencer}
                        </td>
                        <td className="py-3 px-3 text-[#94a3b8] whitespace-nowrap">
                          {formatDateShort(s.periodeMulai)} – {formatDateShort(s.periodeSelesai)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e2a44] text-[#94a3b8]">
                            {s.platform}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-white">
                          {formatNumber(s.totalContent)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#94a3b8]">
                          {formatNumber(s.totalReach)}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-[#06d6a0]">
                          {formatNumber(s.totalEngagement)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-cyan-400">
                          {formatPercent(s.erPercent)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-white whitespace-nowrap">
                          {formatRupiah(s.totalCost)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-400 whitespace-nowrap">
                          {formatRupiah(s.cpe)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#94a3b8] whitespace-nowrap">
                          {formatRupiah(s.costPerContent)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-sky-400 whitespace-nowrap">
                          {formatRupiah(s.cpr)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* CAMPAIGN PERFORMANCE TABLE */
        <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 absolute top-0 left-0" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Ringkasan Performa Campaign ({campaignAnalysis.periodLabel})
              </h3>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Rentang: {campaignAnalysis.dateRangeText} • Total {campaignAnalysis.totalItems} Campaign
              </p>
            </div>
            <span className="text-[11px] font-bold text-sky-400 bg-sky-950/40 border border-sky-500/20 px-2.5 py-1 rounded-full">
              {formatNumber(campaignAnalysis.totalContent)} Total Konten
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3">Nama Campaign</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-3 text-center">KOL Terlibat</th>
                  <th className="py-3 px-3 text-right">Jumlah Post</th>
                  <th className="py-3 px-3 text-right text-sky-400">Total Reach / View</th>
                  <th className="py-3 px-3 text-right text-emerald-400">Total Engagement</th>
                  <th className="py-3 px-3 text-right text-cyan-400">Avg ER (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2a41]">
                {campaignAnalysis.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#64748b]">
                      Belum ada data campaign pada periode ini.
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
      )}
    </div>
  );
};

