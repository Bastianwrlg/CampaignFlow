import React, { useState } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { formatPercent, formatRupiah } from '../../utils/formatters';
import { Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

interface BenchmarkViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
}

export const BenchmarkView: React.FC<BenchmarkViewProps> = ({ onNotify }) => {
  const benchmarks = campaignStore.getBenchmarks();

  const [platform, setPlatform] = useState<string>('');
  const [erBenchmark, setErBenchmark] = useState<number | string>('2.8');
  const [cpeBenchmark, setCpeBenchmark] = useState<number | string>('1005');
  const [mode, setMode] = useState<'Manual' | 'Auto'>('Manual');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!platform.trim()) {
      onNotify('Platform harus diisi (contoh: Global, Instagram, TikTok, dsb).', true);
      return;
    }

    const res = campaignStore.saveBenchmark({
      platform: platform.trim(),
      erBenchmark: Number(erBenchmark) || 0,
      cpeBenchmark: Number(cpeBenchmark) || 0,
      mode,
    });

    if (res.status === 'ok') {
      onNotify(res.message);
      setPlatform('');
      setErBenchmark('2.8');
      setCpeBenchmark('1005');
      setMode('Manual');
    }
  };

  const handleDelete = (targetPlatform: string) => {
    if (window.confirm(`Hapus benchmark khusus untuk platform "${targetPlatform}"?`)) {
      const res = campaignStore.deleteBenchmark(targetPlatform);
      if (res.status === 'ok') {
        onNotify(res.message);
      } else {
        onNotify(res.message, true);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* FORM BENCHMARK */}
      <div className="lg:col-span-5 bg-[#16213a] border border-[#253449] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#06d6a0] absolute top-0 left-0" />

        <h2 className="text-base font-extrabold text-white mb-1">Set Benchmark Platform</h2>
        <p className="text-xs text-[#94a3b8] mb-5">
          Gunakan <span className="text-cyan-400 font-semibold">&quot;Global&quot;</span> sebagai nilai default seluruh platform.
          Mode Auto akan menghitung rata-rata dari data konten aktual yang tercatat.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Platform
            </label>
            <input
              type="text"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Contoh: Global / Instagram / TikTok / YouTube"
              required
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                ER Benchmark (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={erBenchmark}
                onChange={(e) => setErBenchmark(e.target.value)}
                required
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#06d6a0] font-bold focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                CPE Benchmark (Rp)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={cpeBenchmark}
                onChange={(e) => setCpeBenchmark(e.target.value)}
                required
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-amber-400 font-bold focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Mode Penghitungan
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'Manual' | 'Auto')}
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="Manual">Manual (Angka inputan di atas)</option>
              <option value="Auto">Auto (Rata-rata dinamis dari data konten)</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold py-2.5 px-4 rounded-lg text-xs shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Benchmark</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlatform('');
                setErBenchmark('2.8');
                setCpeBenchmark('1005');
                setMode('Manual');
              }}
              className="px-3.5 py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>

      {/* TABLE BENCHMARK */}
      <div className="lg:col-span-7 bg-[#16213a] border border-[#253449] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />

        <h3 className="text-sm font-bold text-white mb-3">Daftar Benchmark Tersimpan</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3 text-right">ER Benchmark</th>
                <th className="py-2.5 px-3 text-right">CPE Benchmark</th>
                <th className="py-2.5 px-3 text-center">Mode</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2a41]">
              {benchmarks.map((b) => (
                <tr key={b.platform} className="hover:bg-[#182337] transition-colors">
                  <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                    {b.platform}
                    {b.platform === 'Global' && (
                      <span className="ml-1.5 text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#06d6a0] whitespace-nowrap">
                    {formatPercent(b.erBenchmark)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-amber-400 whitespace-nowrap">
                    {formatRupiah(b.cpeBenchmark)}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e2a44] text-[#94a3b8]">
                      {b.mode}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {b.platform !== 'Global' ? (
                      <button
                        onClick={() => handleDelete(b.platform)}
                        className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition-colors"
                        title="Hapus Benchmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[#64748b] text-[10px] italic">Terkunci</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
