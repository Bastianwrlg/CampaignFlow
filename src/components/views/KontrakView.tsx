import React, { useState } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { ContractItem } from '../../types';
import { formatDateShort, formatRupiah } from '../../utils/formatters';
import { Pencil, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

interface KontrakViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
}

export const KontrakView: React.FC<KontrakViewProps> = ({ onNotify }) => {
  const contracts = campaignStore.getContracts();
  const options = campaignStore.getDistinctOptions();

  const [editId, setEditId] = useState<string | null>(null);
  const [influencer, setInfluencer] = useState<string>('');
  const [periodeMulai, setPeriodeMulai] = useState<string>('');
  const [periodeSelesai, setPeriodeSelesai] = useState<string>('');
  const [totalBiaya, setTotalBiaya] = useState<number | string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!influencer.trim()) {
      onNotify('Nama influencer harus diisi.', true);
      return;
    }
    if (!periodeMulai || !periodeSelesai) {
      onNotify('Periode tanggal mulai dan selesai harus diisi.', true);
      return;
    }

    if (new Date(periodeSelesai) < new Date(periodeMulai)) {
      onNotify('Periode selesai tidak boleh mendahului periode mulai.', true);
      return;
    }

    if (editId) {
      const res = campaignStore.updateContract(editId, {
        influencer: influencer.trim(),
        periodeMulai,
        periodeSelesai,
        totalBiaya: Number(totalBiaya) || 0,
      });
      if (res.status === 'ok') {
        onNotify('Kontrak berhasil diperbarui!');
        resetForm();
      } else {
        onNotify(res.message || 'Gagal update kontrak.', true);
      }
    } else {
      const res = campaignStore.addContract({
        influencer: influencer.trim(),
        periodeMulai,
        periodeSelesai,
        totalBiaya: Number(totalBiaya) || 0,
      });
      if (res.status === 'ok') {
        onNotify('Kontrak influencer baru berhasil ditambahkan!');
        resetForm();
      }
    }
  };

  const handleEdit = (c: ContractItem) => {
    setEditId(c.id);
    setInfluencer(c.influencer);
    setPeriodeMulai(c.periodeMulai);
    setPeriodeSelesai(c.periodeSelesai);
    setTotalBiaya(c.totalBiaya);
  };

  const handleDelete = (id: string, name: string) => {
    if (
      window.confirm(
        `Yakin ingin menghapus kontrak untuk ${name}? Agregat performa & ROI terkait kontrak ini juga akan dihapus.`
      )
    ) {
      const res = campaignStore.deleteContract(id);
      if (res.status === 'ok') {
        onNotify('Kontrak berhasil dihapus.');
        if (editId === id) resetForm();
      }
    }
  };

  const resetForm = () => {
    setEditId(null);
    setInfluencer('');
    setPeriodeMulai('');
    setPeriodeSelesai('');
    setTotalBiaya('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* FORM KONTRAK */}
      <div className="lg:col-span-5 bg-[#16213a] border border-[#253449] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />

        <h2 className="text-base font-extrabold text-white mb-1">
          {editId ? 'Edit Kontrak Influencer' : 'Tambah Kontrak Influencer'}
        </h2>
        <p className="text-xs text-[#94a3b8] mb-5">
          Biaya per konten & CPE dihitung otomatis dari Total Biaya dibagi aktivitas dalam periode.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Nama Influencer
            </label>
            <input
              type="text"
              list="listContractInfluencers"
              value={influencer}
              onChange={(e) => setInfluencer(e.target.value)}
              placeholder="Contoh: Tasya Farasya"
              required
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
            <datalist id="listContractInfluencers">
              {options.influencers.map((inf) => (
                <option key={inf} value={inf} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Periode Mulai
              </label>
              <input
                type="date"
                value={periodeMulai}
                onChange={(e) => setPeriodeMulai(e.target.value)}
                required
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Periode Selesai
              </label>
              <input
                type="date"
                value={periodeSelesai}
                onChange={(e) => setPeriodeSelesai(e.target.value)}
                required
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Total Biaya Kontrak (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="100000"
              value={totalBiaya}
              onChange={(e) => setTotalBiaya(e.target.value)}
              placeholder="Contoh: 45000000"
              required
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-base font-bold text-[#06d6a0] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold py-2.5 px-4 rounded-lg text-xs shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editId ? 'Update Kontrak' : 'Simpan Kontrak'}</span>
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLE KONTRAK */}
      <div className="lg:col-span-7 bg-[#16213a] border border-[#253449] rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#8b5cf6] via-[#3b82f6] to-[#06d6a0] absolute top-0 left-0" />

        <h3 className="text-sm font-bold text-white mb-3">Daftar Konten Kontrak</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Influencer</th>
                <th className="py-2.5 px-3">Durasi Kontrak</th>
                <th className="py-2.5 px-3 text-right">Nilai Kontrak</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2a41]">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#64748b]">
                    Belum ada kontrak terdaftar.
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-[#182337] transition-colors">
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {c.influencer}
                    </td>
                    <td className="py-3 px-3 text-[#94a3b8] whitespace-nowrap">
                      {formatDateShort(c.periodeMulai)} – {formatDateShort(c.periodeSelesai)}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-[#06d6a0] whitespace-nowrap">
                      {formatRupiah(c.totalBiaya)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1 text-[#94a3b8] hover:text-white rounded hover:bg-[#1e2a44] transition-colors"
                          title="Edit Kontrak"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.influencer)}
                          className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition-colors"
                          title="Hapus Kontrak"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
