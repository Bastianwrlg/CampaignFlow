import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { campaignStore } from '../../services/campaignStore';
import {
  formatDateShort,
  formatNumber,
  formatPercent,
  formatRupiah,
} from '../../utils/formatters';

Chart.register(...registerables);

export const SummaryView: React.FC = () => {
  const summaries = campaignStore.computeInfluencerSummaries();
  // Sort descending by Total Engagement
  const sortedSummaries = [...summaries].sort((a, b) => b.totalEngagement - a.totalEngagement);

  const rankingChartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartInstance.current) chartInstance.current.destroy();

    const top8 = sortedSummaries.slice(0, 8);

    if (rankingChartRef.current) {
      chartInstance.current = new Chart(rankingChartRef.current, {
        type: 'bar',
        data: {
          labels: top8.map((s) => s.influencer),
          datasets: [
            {
              label: 'Total Engagement',
              data: top8.map((s) => s.totalEngagement),
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

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [summaries]);

  return (
    <div className="space-y-6">
      {/* RANKING CHART */}
      <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] to-[#3b82f6] absolute top-0 left-0" />
        <h3 className="text-sm font-bold text-white mb-4">
          Ranking Influencer by Total Engagement
        </h3>
        <div className="h-[250px] w-full">
          <canvas ref={rankingChartRef}></canvas>
        </div>
      </div>

      {/* SUMMARY TABLE */}
      <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06d6a0] absolute top-0 left-0" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Ringkasan Performa Kontrak Influencer</h3>
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
                    Belum ada data kontrak atau konten untuk dihitung.
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
    </div>
  );
};
