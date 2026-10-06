import React, { useState } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { RoiScoreItem } from '../../types';
import {
  formatDateShort,
  formatNumber,
  formatPercent,
  formatRupiah,
} from '../../utils/formatters';
import { X, CheckCircle2, ShieldCheck, Info } from 'lucide-react';

interface RoiViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
}

export const RoiView: React.FC<RoiViewProps> = ({ onNotify }) => {
  const roiScores = campaignStore.computeRoiScores();

  const [detailItem, setDetailItem] = useState<RoiScoreItem | null>(null);

  // Compliance Modal state
  const [complianceItem, setComplianceItem] = useState<RoiScoreItem | null>(null);
  const [brief, setBrief] = useState<number>(3);
  const [messaging, setMessaging] = useState<number>(3);
  const [regulasi, setRegulasi] = useState<number>(3);
  const [teknis, setTeknis] = useState<number>(3);

  const totalNilai = brief + messaging + regulasi + teknis;
  let previewScore = 0;
  if (totalNilai >= 18) previewScore = 20;
  else if (totalNilai >= 14) previewScore = 15;
  else if (totalNilai >= 10) previewScore = 10;
  else if (totalNilai >= 5) previewScore = 5;

  const handleOpenCompliance = (r: RoiScoreItem) => {
    const record = campaignStore.getComplianceRecordForContract(r.idKontrak);
    if (record) {
      setBrief(record.brief);
      setMessaging(record.messaging);
      setRegulasi(record.regulasi);
      setTeknis(record.teknis);
    } else {
      setBrief(3);
      setMessaging(3);
      setRegulasi(3);
      setTeknis(3);
    }
    setComplianceItem(r);
  };

  const handleSaveCompliance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complianceItem) return;

    const res = campaignStore.saveCompliance({
      influencer: complianceItem.influencer,
      idKontrak: complianceItem.idKontrak,
      brief,
      messaging,
      regulasi,
      teknis,
    });

    if (res.status === 'ok') {
      onNotify(
        `Penilaian compliance ${complianceItem.influencer} disimpan (Skor: ${res.score}/20, Total Poin: ${res.totalNilai}/20).`
      );
      setComplianceItem(null);
    }
  };

  const getBadgeClass = (kategori: string) => {
    if (kategori === 'High ROI') {
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    }
    if (kategori === 'Medium ROI') {
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    }
    return 'bg-red-500/15 text-red-400 border border-red-500/30';
  };

  return (
    <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] via-[#eab308] to-[#3b82f6] absolute top-0 left-0" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-extrabold text-white">Evaluasi & Kalkulator ROI Influencer</h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Formula: ER Score (maks 50) + Cost Efficiency Score (maks 30) + Compliance Score (maks 20) = Skor Total (100).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            High ROI: ≥80
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
            Medium: 60-79
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
            Low: &lt;60
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
              <th className="py-3 px-3">Influencer</th>
              <th className="py-3 px-3">Periode Kontrak</th>
              <th className="py-3 px-3 text-center">
                ER Score
                <div className="text-[10px] text-[#64748b] font-normal lowercase">(maks 50)</div>
              </th>
              <th className="py-3 px-3 text-center">
                Cost Eff. Score
                <div className="text-[10px] text-[#64748b] font-normal lowercase">(maks 30)</div>
              </th>
              <th className="py-3 px-3 text-center">
                Compliance
                <div className="text-[10px] text-[#64748b] font-normal lowercase">(maks 20)</div>
              </th>
              <th className="py-3 px-3 text-center text-white">
                Total Score
                <div className="text-[10px] text-[#64748b] font-normal lowercase">(maks 100)</div>
              </th>
              <th className="py-3 px-3 text-center">Kategori</th>
              <th className="py-3 px-3 text-center">Aksi Evaluasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2a41]">
            {roiScores.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#64748b]">
                  Belum ada data kontrak atau aktivitas konten untuk dihitung ROI-nya.
                </td>
              </tr>
            ) : (
              roiScores.map((r) => (
                <tr key={r.idKontrak} className="hover:bg-[#182337] transition-colors">
                  <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                    {r.influencer}
                  </td>
                  <td className="py-3 px-3 text-[#94a3b8] whitespace-nowrap">
                    {formatDateShort(r.periodeMulai)} – {formatDateShort(r.periodeSelesai)}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#3b82f6]">
                    {r.erScore} <span className="text-[#64748b] font-normal">/ 50</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#06d6a0]">
                    {r.cpeScore} <span className="text-[#64748b] font-normal">/ 30</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#8b5cf6]">
                    {r.complianceScore} <span className="text-[#64748b] font-normal">/ 20</span>
                  </td>
                  <td className="py-3 px-3 text-center font-black text-sm text-white">
                    {r.totalScore} <span className="text-[#64748b] text-xs font-normal">/ 100</span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold ${getBadgeClass(
                        r.kategori
                      )}`}
                    >
                      {r.kategori}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setDetailItem(r)}
                        className="px-2.5 py-1.5 bg-[#1e2a44] hover:bg-[#253449] text-sky-300 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                      <button
                        onClick={() => handleOpenCompliance(r)}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Nilai Compliance</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DETAIL ROI */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white">{detailItem.influencer}</h3>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${getBadgeClass(
                    detailItem.kategori
                  )}`}
                >
                  {detailItem.kategori} ({detailItem.totalScore} / 100)
                </span>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="text-[#94a3b8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[11px] text-[#94a3b8] mb-1 font-semibold">
                <span>Komposisi Skor</span>
                <span>{detailItem.totalScore} / 100</span>
              </div>
              <div className="h-3 bg-[#0f1729] rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(detailItem.erScore / 100) * 100}%` }}
                  className="bg-[#3b82f6] h-full"
                  title={`ER Score: ${detailItem.erScore}`}
                />
                <div
                  style={{ width: `${(detailItem.cpeScore / 100) * 100}%` }}
                  className="bg-[#06d6a0] h-full"
                  title={`Cost Eff: ${detailItem.cpeScore}`}
                />
                <div
                  style={{ width: `${(detailItem.complianceScore / 100) * 100}%` }}
                  className="bg-[#8b5cf6] h-full"
                  title={`Compliance: ${detailItem.complianceScore}`}
                />
              </div>
              <div className="flex gap-3 text-[10px] mt-1.5 text-[#94a3b8]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> ER: {detailItem.erScore}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#06d6a0]"></span> Cost: {detailItem.cpeScore}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span> Compliance: {detailItem.complianceScore}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs border-t border-[#253449] pt-3">
              <div className="flex justify-between py-1 border-b border-[#1c2a41]">
                <span className="text-[#94a3b8]">Periode Kontrak</span>
                <span className="font-semibold text-white">
                  {formatDateShort(detailItem.periodeMulai)} – {formatDateShort(detailItem.periodeSelesai)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1c2a41]">
                <span className="text-[#94a3b8]">Platform Dominan</span>
                <span className="font-semibold text-white">{detailItem.platform}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1c2a41]">
                <span className="text-[#94a3b8]">Total Konten Dibuat</span>
                <span className="font-semibold text-white">{formatNumber(detailItem.totalContent)} post</span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1c2a41]">
                <span className="text-[#94a3b8]">ER Influencer vs Benchmark</span>
                <span className="font-semibold text-cyan-400">
                  {formatPercent(detailItem.erPercent)} / {formatPercent(detailItem.erBenchmark)}{' '}
                  <span className="text-xs font-normal text-[#94a3b8]">
                    ({detailItem.erDiffPercent >= 0 ? '+' : ''}
                    {detailItem.erDiffPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1c2a41]">
                <span className="text-[#94a3b8]">CPE Influencer vs Benchmark</span>
                <span className="font-semibold text-amber-400">
                  {formatRupiah(detailItem.cpe)} / {formatRupiah(detailItem.cpeBenchmark)}{' '}
                  <span className="text-xs font-normal text-[#94a3b8]">
                    ({detailItem.cpeDiffPercent >= 0 ? 'lebih hemat +' : ''}
                    {detailItem.cpeDiffPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-[#1c2a41]">
                <span className="text-[#94a3b8]">CPR (Cost per Reach)</span>
                <span className="font-semibold text-white">{formatRupiah(detailItem.cpr)}</span>
              </div>
            </div>

            {/* Rekomendasi Box */}
            <div className="mt-4 p-3.5 rounded-lg bg-[#0f1729] border border-[#253449]">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Rekomendasi Keputusan Kontrak:
              </span>
              <p className="text-xs text-[#f1f5f9] leading-relaxed">{detailItem.rekomendasi}</p>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="w-full py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NILAI COMPLIANCE */}
      {complianceItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Penilaian Compliance & Brand Fit</h3>
                <p className="text-xs text-[#06d6a0] font-semibold mt-0.5">
                  {complianceItem.influencer} ({formatDateShort(complianceItem.periodeMulai)} s/d{' '}
                  {formatDateShort(complianceItem.periodeSelesai)})
                </p>
              </div>
              <button
                onClick={() => setComplianceItem(null)}
                className="text-[#94a3b8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompliance} className="space-y-4 text-xs">
              {/* Slider 1 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-white font-medium">1. Konten sesuai brief campaign</label>
                  <span className="font-extrabold text-sm text-[#06d6a0] bg-[#0f1729] px-2 py-0.5 rounded border border-[#253449]">
                    {brief} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={brief}
                  onChange={(e) => setBrief(Number(e.target.value))}
                  className="w-full accent-[#06d6a0] cursor-pointer"
                />
              </div>

              {/* Slider 2 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-white font-medium">2. Messaging sesuai positioning brand</label>
                  <span className="font-extrabold text-sm text-[#06d6a0] bg-[#0f1729] px-2 py-0.5 rounded border border-[#253449]">
                    {messaging} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={messaging}
                  onChange={(e) => setMessaging(Number(e.target.value))}
                  className="w-full accent-[#06d6a0] cursor-pointer"
                />
              </div>

              {/* Slider 3 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-white font-medium">3. Tidak melanggar regulasi / isu sensitif</label>
                  <span className="font-extrabold text-sm text-[#06d6a0] bg-[#0f1729] px-2 py-0.5 rounded border border-[#253449]">
                    {regulasi} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={regulasi}
                  onChange={(e) => setRegulasi(Number(e.target.value))}
                  className="w-full accent-[#06d6a0] cursor-pointer"
                />
              </div>

              {/* Slider 4 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-white font-medium">4. Ketepatan waktu & teknis posting</label>
                  <span className="font-extrabold text-sm text-[#06d6a0] bg-[#0f1729] px-2 py-0.5 rounded border border-[#253449]">
                    {teknis} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={teknis}
                  onChange={(e) => setTeknis(Number(e.target.value))}
                  className="w-full accent-[#06d6a0] cursor-pointer"
                />
              </div>

              {/* Calculation Preview */}
              <div className="p-3 bg-[#0f1729] border border-[#253449] rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-[#94a3b8]">Total Nilai Kumulatif:</div>
                  <div className="text-sm font-extrabold text-white">{totalNilai} dari 20 poin</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#94a3b8]">Compliance Score (ROI):</div>
                  <div className="text-base font-black text-[#8b5cf6]">
                    {previewScore} <span className="text-xs font-normal text-[#94a3b8]">/ 20</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Penilaian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComplianceItem(null)}
                  className="px-4 py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
