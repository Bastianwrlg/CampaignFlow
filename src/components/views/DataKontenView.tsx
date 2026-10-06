import React, { useState, useEffect, useRef } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { ContentItem } from '../../types';
import { formatDateShort, formatNumber } from '../../utils/formatters';
import {
  ExternalLink,
  Pencil,
  Trash2,
  X,
  FilterX,
  Plus,
  RefreshCw,
  Zap,
  Activity,
  Play,
  Pause,
  Clock,
} from 'lucide-react';

interface DataKontenViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
  onGoToInput: () => void;
}

export const DataKontenView: React.FC<DataKontenViewProps> = ({ onNotify, onGoToInput }) => {
  const [filterCampaign, setFilterCampaign] = useState<string>('');
  const [filterInfluencer, setFilterInfluencer] = useState<string>('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');

  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);

  // Auto-Update Realtime / Interval State
  const [isLiveAutoUpdate, setIsLiveAutoUpdate] = useState<boolean>(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(6);
  const [countdown, setCountdown] = useState<number>(6);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);

  // Set of recently updated item IDs to animate highlights
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  const options = campaignStore.getDistinctOptions();
  const contents = campaignStore.getContents({
    campaign: filterCampaign || undefined,
    influencer: filterInfluencer || undefined,
    platform: filterPlatform || undefined,
  });

  // Handler for manual / one-click sync all
  const handleSyncAllNow = () => {
    setIsSyncingAll(true);
    setTimeout(() => {
      const result = campaignStore.autoUpdateContentMetrics();
      const updatedSet = new Set(result.updatedIds);
      setRecentlyUpdatedIds(updatedSet);

      setTimeout(() => {
        setRecentlyUpdatedIds(new Set());
      }, 2500);

      setIsSyncingAll(false);
      onNotify(
        `Berhasil update otomatis ${result.updatedCount} konten! (+${formatNumber(
          result.stats.reachAdded
        )} Reach, +${formatNumber(result.stats.likesAdded)} Likes, +${formatNumber(
          result.stats.commentsAdded
        )} Comments, +${formatNumber(result.stats.sharesAdded)} Shares, +${formatNumber(
          result.stats.savesAdded
        )} Saves)`
      );
    }, 400);
  };

  // Handler for single row automatic sync
  const handleSyncSingleRow = (id: string, influencer: string) => {
    setSyncingRowId(id);
    setTimeout(() => {
      const result = campaignStore.autoUpdateContentMetrics(id);
      setRecentlyUpdatedIds(new Set([id]));

      setTimeout(() => {
        setRecentlyUpdatedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2500);

      setSyncingRowId(null);
      onNotify(
        `Metrik ${influencer} ter-update: +${formatNumber(
          result.stats.reachAdded
        )} Reach, +${formatNumber(result.stats.likesAdded)} Likes, +${formatNumber(
          result.stats.commentsAdded
        )} Comments, +${formatNumber(result.stats.sharesAdded)} Shares, +${formatNumber(
          result.stats.savesAdded
        )} Saves!`
      );
    }, 350);
  };

  // Live Auto-Update Interval Effect
  useEffect(() => {
    if (!isLiveAutoUpdate) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setCountdown(intervalSeconds);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Execute auto-update cycle
          const result = campaignStore.autoUpdateContentMetrics();
          setRecentlyUpdatedIds(new Set(result.updatedIds));
          setTimeout(() => {
            setRecentlyUpdatedIds(new Set());
          }, 2000);
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLiveAutoUpdate, intervalSeconds]);

  const handleDelete = (id: string, influencer: string) => {
    if (window.confirm(`Yakin ingin menghapus data postingan untuk ${influencer}?`)) {
      const res = campaignStore.deleteContent(id);
      if (res.status === 'ok') {
        onNotify('Data konten berhasil dihapus.');
      } else {
        onNotify(res.message || 'Gagal menghapus.', true);
      }
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const res = campaignStore.updateContent(editingItem.id, editingItem);
    if (res.status === 'ok') {
      onNotify('Data konten berhasil diperbarui!');
      setEditingItem(null);
    } else {
      onNotify(res.message || 'Gagal update data.', true);
    }
  };

  const resetFilters = () => {
    setFilterCampaign('');
    setFilterInfluencer('');
    setFilterPlatform('');
  };

  return (
    <div className="space-y-4">
      {/* AUTO-UPDATE CONTROL PANEL BANNER */}
      <div className="bg-gradient-to-r from-[#131c2e] via-[#16213a] to-[#131c2e] border border-[#253449] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isLiveAutoUpdate
                ? 'bg-emerald-500/20 text-[#06d6a0] border border-emerald-500/40 shadow-[0_0_15px_rgba(6,214,160,0.25)]'
                : 'bg-[#1e2a44] text-[#94a3b8]'
            }`}
          >
            <Activity className={`w-5 h-5 ${isLiveAutoUpdate ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">Auto-Update Metrik Konten</span>
              {isLiveAutoUpdate ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-[#06d6a0] border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06d6a0] animate-ping" />
                  LIVE AKTIF
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e2a44] text-[#94a3b8]">
                  STANDBY
                </span>
              )}
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {isLiveAutoUpdate
                ? `Sinkronisasi berkala aktif — memperbarui otomatis setiap ${intervalSeconds} detik (siklus berikutnya: ${countdown}s)`
                : 'Otomatisasikan penambahan Reach, Likes, Comments, Shares, & Saves secara berkala atau 1-klik.'}
            </p>
          </div>
        </div>

        {/* Buttons & Interval Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interval dropdown */}
          <div className="flex items-center gap-1 bg-[#0f1729] border border-[#253449] px-2.5 py-1.5 rounded-lg text-xs">
            <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="text-[#94a3b8] text-[11px]">Interval:</span>
            <select
              value={intervalSeconds}
              onChange={(e) => {
                const val = Number(e.target.value);
                setIntervalSeconds(val);
                setCountdown(val);
              }}
              className="bg-transparent text-[#06d6a0] font-bold focus:outline-none cursor-pointer"
            >
              <option value={3} className="bg-[#0f1729] text-white">
                3 Detik
              </option>
              <option value={6} className="bg-[#0f1729] text-white">
                6 Detik
              </option>
              <option value={10} className="bg-[#0f1729] text-white">
                10 Detik
              </option>
              <option value={20} className="bg-[#0f1729] text-white">
                20 Detik
              </option>
              <option value={30} className="bg-[#0f1729] text-white">
                30 Detik
              </option>
            </select>
          </div>

          {/* Toggle Live button */}
          <button
            onClick={() => {
              const nextState = !isLiveAutoUpdate;
              setIsLiveAutoUpdate(nextState);
              if (nextState) {
                onNotify(`Live Auto-Update diaktifkan! Metrik akan diperbarui setiap ${intervalSeconds} detik.`);
              } else {
                onNotify('Live Auto-Update dihentikan sementara.');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isLiveAutoUpdate
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] shadow-sm'
            }`}
          >
            {isLiveAutoUpdate ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Live Sync</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Mulai Auto-Update</span>
              </>
            )}
          </button>

          {/* One click Sync All button */}
          <button
            onClick={handleSyncAllNow}
            disabled={isSyncingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1e2a44] hover:bg-[#253449] text-white font-semibold rounded-lg text-xs border border-[#253449] transition-all cursor-pointer disabled:opacity-50"
            title="Update metrik semua konten saat ini juga"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#06d6a0] ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>Update Semua Sekarang</span>
          </button>
        </div>
      </div>

      {/* MAIN CARD: Filters & Table */}
      <div className="bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />

        {/* FILTER TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="bg-[#0f1729] border border-[#253449] text-xs font-medium rounded-lg px-3 py-2 text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="">Semua Campaign ({options.campaigns.length})</option>
              {options.campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterInfluencer}
              onChange={(e) => setFilterInfluencer(e.target.value)}
              className="bg-[#0f1729] border border-[#253449] text-xs font-medium rounded-lg px-3 py-2 text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="">Semua Influencer ({options.influencers.length})</option>
              {options.influencers.map((inf) => (
                <option key={inf} value={inf}>
                  {inf}
                </option>
              ))}
            </select>

            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="bg-[#0f1729] border border-[#253449] text-xs font-medium rounded-lg px-3 py-2 text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="">Semua Platform</option>
              {options.platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {(filterCampaign || filterInfluencer || filterPlatform) && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          <button
            onClick={onGoToInput}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Konten Baru</span>
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#253449] text-[#64748b] uppercase tracking-wider font-bold">
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Influencer</th>
                <th className="py-3 px-3">Platform</th>
                <th className="py-3 px-3">Tipe</th>
                <th className="py-3 px-3 text-right text-sky-400">Reach / Views</th>
                <th className="py-3 px-3 text-right text-pink-400">Likes</th>
                <th className="py-3 px-3 text-right text-indigo-400">Comments</th>
                <th className="py-3 px-3 text-right text-teal-400">Shares</th>
                <th className="py-3 px-3 text-right text-amber-400">Saves</th>
                <th className="py-3 px-3 text-right text-[#06d6a0]">Total Eng.</th>
                <th className="py-3 px-3 text-center">Post Link</th>
                <th className="py-3 px-3 text-center">Aksi & Auto-Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2a41]">
              {contents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-[#64748b]">
                    Belum ada data konten yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                contents.map((r) => {
                  const isHighlighted = recentlyUpdatedIds.has(r.id);
                  const isThisRowSyncing = syncingRowId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors duration-500 ${
                        isHighlighted
                          ? 'bg-emerald-950/40 text-emerald-100 ring-1 ring-inset ring-emerald-500/40'
                          : 'hover:bg-[#182337]'
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap text-[#94a3b8]">
                        {formatDateShort(r.tanggal)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                        {r.campaign}
                      </td>
                      <td className="py-3 px-3 font-bold text-sky-400 whitespace-nowrap">
                        {r.influencer}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e2a44] text-[#94a3b8]">
                          {r.platform}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#94a3b8] whitespace-nowrap">{r.contentType}</td>

                      {/* Reach */}
                      <td
                        className={`py-3 px-3 text-right font-semibold transition-colors ${
                          isHighlighted ? 'text-sky-300 font-extrabold' : 'text-white'
                        }`}
                      >
                        {formatNumber(r.reach)}
                      </td>

                      {/* Likes */}
                      <td
                        className={`py-3 px-3 text-right font-medium transition-colors ${
                          isHighlighted ? 'text-pink-300 font-bold' : 'text-[#cbd5e1]'
                        }`}
                      >
                        {formatNumber(r.likes)}
                      </td>

                      {/* Comments */}
                      <td
                        className={`py-3 px-3 text-right font-medium transition-colors ${
                          isHighlighted ? 'text-indigo-300 font-bold' : 'text-[#cbd5e1]'
                        }`}
                      >
                        {formatNumber(r.comments)}
                      </td>

                      {/* Shares */}
                      <td
                        className={`py-3 px-3 text-right font-medium transition-colors ${
                          isHighlighted ? 'text-teal-300 font-bold' : 'text-[#cbd5e1]'
                        }`}
                      >
                        {formatNumber(r.shares)}
                      </td>

                      {/* Saves */}
                      <td
                        className={`py-3 px-3 text-right font-medium transition-colors ${
                          isHighlighted ? 'text-amber-300 font-bold' : 'text-[#cbd5e1]'
                        }`}
                      >
                        {formatNumber(r.saves)}
                      </td>

                      {/* Total Engagement */}
                      <td className="py-3 px-3 text-right font-black text-[#06d6a0]">
                        {formatNumber(r.totalEngagement)}
                      </td>

                      {/* Post Link */}
                      <td className="py-3 px-3 text-center">
                        {r.postLink && r.postLink !== '#' ? (
                          <a
                            href={r.postLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#3b82f6] hover:text-[#60a5fa] hover:underline"
                            title={r.postLink}
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[#64748b]">-</span>
                        )}
                      </td>

                      {/* Actions with Sync Button */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Sync This Row Button */}
                          <button
                            onClick={() => handleSyncSingleRow(r.id, r.influencer)}
                            disabled={isThisRowSyncing}
                            className={`p-1.5 rounded transition-all cursor-pointer ${
                              isThisRowSyncing
                                ? 'bg-emerald-500/20 text-[#06d6a0]'
                                : 'text-[#06d6a0] hover:bg-emerald-500/20 hover:text-emerald-300'
                            }`}
                            title="Update otomatis metrik konten ini"
                          >
                            <Zap
                              className={`w-3.5 h-3.5 ${isThisRowSyncing ? 'animate-bounce' : ''}`}
                            />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingItem({ ...r })}
                            className="p-1.5 text-[#94a3b8] hover:text-white rounded hover:bg-[#1e2a44] transition-colors cursor-pointer"
                            title="Edit Konten Manual"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(r.id, r.influencer)}
                            className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Hapus Konten"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT KONTEN MANUAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <h3 className="text-base font-bold text-white">Edit Data Konten Manual</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-[#94a3b8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={editingItem.tanggal}
                  onChange={(e) => setEditingItem({ ...editingItem, tanggal: e.target.value })}
                  required
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Nama Campaign
                </label>
                <input
                  type="text"
                  value={editingItem.campaign}
                  onChange={(e) => setEditingItem({ ...editingItem, campaign: e.target.value })}
                  required
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Influencer / PIC
                </label>
                <input
                  type="text"
                  value={editingItem.influencer}
                  onChange={(e) => setEditingItem({ ...editingItem, influencer: e.target.value })}
                  required
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                    Platform
                  </label>
                  <input
                    type="text"
                    value={editingItem.platform}
                    onChange={(e) => setEditingItem({ ...editingItem, platform: e.target.value })}
                    required
                    className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                    Content Type
                  </label>
                  <input
                    type="text"
                    value={editingItem.contentType}
                    onChange={(e) => setEditingItem({ ...editingItem, contentType: e.target.value })}
                    required
                    className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Post Link (URL)
                </label>
                <input
                  type="url"
                  value={editingItem.postLink}
                  onChange={(e) => setEditingItem({ ...editingItem, postLink: e.target.value })}
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                    Reach / Views
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.reach}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, reach: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.likes}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, likes: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                    Comments
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.comments}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, comments: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                    Shares
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.shares}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, shares: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Saves
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingItem.saves}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, saves: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg transition-colors"
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
