import React, { useState, useEffect, useRef } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { ContentItem, PeriodFilter } from '../../types';
import { formatDateShort, formatNumber, formatPercent } from '../../utils/formatters';
import { parsePostUrl, LinkInspectionResult, fetchMetricsFromUrl } from '../../services/linkFetcher';
import { parseKolrData, KolrParsedItem } from '../../services/kolrParser';
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
  Link2,
  CheckCircle2,
  Info,
  Sparkles,
  Settings2,
  Key,
  Sliders,
  Check,
  Puzzle,
  ClipboardPaste,
  Edit3,
  LayoutDashboard,
  CheckCheck,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';

interface DataKontenViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
  onGoToInput: () => void;
  onGoToDashboard?: () => void;
}

export const DataKontenView: React.FC<DataKontenViewProps> = ({ onNotify, onGoToInput, onGoToDashboard }) => {
  const [filterCampaign, setFilterCampaign] = useState<string>(() => campaignStore.getSelectedCampaign());
  const [filterInfluencer, setFilterInfluencer] = useState<string>('');
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all');
  const [sortField, setSortField] = useState<'tanggal' | 'campaign' | 'influencer' | 'reach' | 'engagement' | 'er'>('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Listen to store updates (including campaign changes from Dashboard)
  useEffect(() => {
    const unsubscribe = campaignStore.subscribe(() => {
      const curSelected = campaignStore.getSelectedCampaign();
      setFilterCampaign((prev) => (prev !== curSelected ? curSelected : prev));
    });
    return unsubscribe;
  }, []);

  // Mode Edit Langsung di Tabel (Spreadsheet Mode) - Aktif by default
  const [isInlineEditMode, setIsInlineEditMode] = useState<boolean>(true);
  const [activeEditingRowIds, setActiveEditingRowIds] = useState<Set<string>>(new Set());
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);

  const [selectedLinkDetail, setSelectedLinkDetail] = useState<{
    item: ContentItem;
    inspection?: LinkInspectionResult;
  } | null>(null);

  // Kolr Extension Modal State
  const [showKolrModal, setShowKolrModal] = useState<boolean>(false);
  const [kolrInputText, setKolrInputText] = useState<string>('');
  const [kolrParsedItems, setKolrParsedItems] = useState<KolrParsedItem[]>([]);

  // Calibration state inside selectedLinkDetail modal
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibReach, setCalibReach] = useState<number>(0);
  const [calibLikes, setCalibLikes] = useState<number>(0);
  const [calibComments, setCalibComments] = useState<number>(0);
  const [calibShares, setCalibShares] = useState<number>(0);
  const [calibSaves, setCalibSaves] = useState<number>(0);

  const [showApiSettingsModal, setShowApiSettingsModal] = useState<boolean>(false);
  const [ytApiKey, setYtApiKey] = useState<string>(() => localStorage.getItem('youtube_api_key') || '');
  const [metaToken, setMetaToken] = useState<string>(() => localStorage.getItem('meta_access_token') || '');

  // Auto-Update Realtime Link Sync State
  const [isLiveLinkSync, setIsLiveLinkSync] = useState<boolean>(false);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(6);
  const [countdown, setCountdown] = useState<number>(6);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);

  // Set of recently updated item IDs to animate highlights
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  const options = campaignStore.getDistinctOptions();
  const dashboardStats = campaignStore.getDashboardStats(
    filterPeriod,
    'all',
    'reach',
    'er',
    filterCampaign
  );
  const dateWindow = campaignStore.calculateDateWindow(filterPeriod);

  const rawContents = campaignStore.getContents({
    campaign: filterCampaign || undefined,
    influencer: filterInfluencer || undefined,
    platform: filterPlatform || undefined,
  });

  const periodFiltered = rawContents.filter((c) => {
    if (filterPeriod === 'all' || !dateWindow.startDate || !dateWindow.endDate) return true;
    if (!c.tanggal) return true;
    const cTime = new Date(c.tanggal + 'T12:00:00').getTime();
    return (
      !isNaN(cTime) &&
      cTime >= dateWindow.startDate.getTime() &&
      cTime <= dateWindow.endDate.getTime()
    );
  });

  const contents = [...periodFiltered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'tanggal') {
      diff = (b.tanggal || '').localeCompare(a.tanggal || '');
    } else if (sortField === 'campaign') {
      diff = (a.campaign || '').localeCompare(b.campaign || '');
    } else if (sortField === 'influencer') {
      diff = (a.influencer || '').localeCompare(b.influencer || '');
    } else if (sortField === 'reach') {
      diff = (b.reach || 0) - (a.reach || 0);
    } else if (sortField === 'engagement') {
      diff = (b.totalEngagement || 0) - (a.totalEngagement || 0);
    } else if (sortField === 'er') {
      const erA = a.reach > 0 ? (a.totalEngagement / a.reach) * 100 : 0;
      const erB = b.reach > 0 ? (b.totalEngagement / b.reach) * 100 : 0;
      diff = erB - erA;
    }
    return sortDirection === 'desc' ? diff : -diff;
  });

  // Handler for 1-click sync all strictly according to their URL links
  const handleSyncAllFromLinks = async () => {
    setIsSyncingAll(true);
    try {
      const result = await campaignStore.syncAllFromPostUrls();
      const updatedSet = new Set(result.updatedIds);
      setRecentlyUpdatedIds(updatedSet);

      setTimeout(() => {
        setRecentlyUpdatedIds(new Set());
      }, 2500);

      onNotify(
        `Sukses sinkronisasi real time ${result.syncedCount} tautan konten! (+${formatNumber(
          result.stats.reachAdded
        )} Reach, +${formatNumber(result.stats.likesAdded)} Likes, +${formatNumber(
          result.stats.commentsAdded
        )} Comments, +${formatNumber(result.stats.sharesAdded)} Shares, +${formatNumber(
          result.stats.savesAdded
        )} Saves)`
      );
    } catch (err: any) {
      onNotify('Gagal sinkronisasi link: ' + err.message, true);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Handler for single row sync strictly corresponding to its post link
  const handleSyncSingleLink = async (id: string, influencer: string) => {
    setSyncingRowId(id);
    try {
      const result = await campaignStore.syncFromPostUrl(id);
      if (result.status === 'ok' && result.item) {
        if (result.inspection?.dataSource === 'live_api') {
          setRecentlyUpdatedIds(new Set([id]));
          setTimeout(() => {
            setRecentlyUpdatedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 2500);

          onNotify(
            `[Data Live Asli] ${influencer} (${result.inspection.platform}): Reach ${formatNumber(
              result.item.reach
            )}, Likes ${formatNumber(result.item.likes)}, Comments ${formatNumber(
              result.item.comments
            )}, Shares ${formatNumber(result.item.shares)}, Saves ${formatNumber(result.item.saves)}!`
          );
        } else {
          // Instagram / login-walled
          await handleInspectLink(result.item);
          setIsCalibrating(true);
          onNotify(
            `${influencer}: Instagram mengunci data di balik login Meta (HTTP 302). Sistem TIDAK mengarang data — masukkan angka riil postingan Anda di dialog ini.`,
            false
          );
        }
      } else {
        onNotify(result.message || 'Gagal sinkronisasi link.', true);
      }
    } catch (e: any) {
      onNotify('Gagal sinkronisasi dari link: ' + e.message, true);
    } finally {
      setSyncingRowId(null);
    }
  };

  // Inspect link details in modal
  const handleInspectLink = async (item: ContentItem) => {
    const inspection = await fetchMetricsFromUrl(item.postLink, item);
    setSelectedLinkDetail({ item, inspection });
    setCalibReach(item.reach);
    setCalibLikes(item.likes);
    setCalibComments(item.comments);
    setCalibShares(item.shares);
    setCalibSaves(item.saves);
    setIsCalibrating(false);
  };

  // Save manual calibration from real post view
  const handleSaveCalibration = () => {
    if (!selectedLinkDetail) return;
    const item = selectedLinkDetail.item;
    const totalEngagement = calibLikes + calibComments + calibShares + calibSaves;

    campaignStore.updateContent(item.id, {
      reach: calibReach,
      likes: calibLikes,
      comments: calibComments,
      shares: calibShares,
      saves: calibSaves,
      totalEngagement,
      isVerified: true,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
    });

    onNotify(
      `Angka asli untuk ${item.influencer} berhasil dikalibrasi dan diverifikasi! (Reach: ${formatNumber(
        calibReach
      )}, Likes: ${formatNumber(calibLikes)}, Engagement: ${formatNumber(totalEngagement)})`
    );

    const updated = campaignStore.getContents().find((c) => c.id === item.id);
    if (updated) {
      setSelectedLinkDetail((prev) => (prev ? { ...prev, item: updated } : null));
    }
    setIsCalibrating(false);
  };

  // Live Auto-Update Interval Effect (Continuous URL Sync)
  useEffect(() => {
    if (!isLiveLinkSync) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setCountdown(intervalSeconds);

    timerRef.current = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Execute link sync cycle
          campaignStore.syncAllFromPostUrls().then((result) => {
            setRecentlyUpdatedIds(new Set(result.updatedIds));
            setTimeout(() => {
              setRecentlyUpdatedIds(new Set());
            }, 2000);
          });
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLiveLinkSync, intervalSeconds]);

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

  // Handler untuk mengedit sel langsung di tabel tanpa pop-up
  const handleInlineFieldChange = (id: string, field: keyof ContentItem, value: any) => {
    campaignStore.updateContent(id, { [field]: value });
    setRecentlyUpdatedIds((prev) => new Set(prev).add(id));
    setRecentlySavedId(id);
    setTimeout(() => {
      setRecentlySavedId((current) => (current === id ? null : current));
    }, 2000);
  };

  const toggleRowEdit = (id: string) => {
    setActiveEditingRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setFilterCampaign('');
    campaignStore.setSelectedCampaign('');
    setFilterInfluencer('');
    setFilterPlatform('');
    setFilterPeriod('all');
    setSortField('tanggal');
    setSortDirection('desc');
  };

  const saveApiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('youtube_api_key', ytApiKey.trim());
    localStorage.setItem('meta_access_token', metaToken.trim());
    onNotify('Pengaturan API Live berhasil disimpan!');
    setShowApiSettingsModal(false);
  };

  const handleKolrInputChange = (text: string) => {
    setKolrInputText(text);
    const parsed = parseKolrData(text);
    setKolrParsedItems(parsed);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleKolrInputChange(text);
      onNotify('Data berhasil dibaca dari clipboard!');
    } catch {
      onNotify('Izin membaca clipboard ditolak oleh browser, silakan tempel (Ctrl+V) manual.', true);
    }
  };

  const handleImportKolrItems = () => {
    if (kolrParsedItems.length === 0) return;
    let addedCount = 0;
    kolrParsedItems.forEach((p) => {
      const res = campaignStore.addContent({
        tanggal: new Date().toISOString().split('T')[0],
        campaign: p.campaign || 'Kolr Sync',
        influencer: p.influencer || 'Influencer Kolr',
        platform: p.platform || 'Instagram',
        postLink: p.postLink || '#',
        contentType: p.contentType || 'Reels/Video',
        reach: p.reach || 0,
        likes: p.likes || 0,
        comments: p.comments || 0,
        shares: p.shares || 0,
        saves: p.saves || 0,
      });
      if (res.status === 'ok') {
        campaignStore.updateContent(res.id, { isVerified: true });
        addedCount++;
      }
    });
    onNotify(`Berhasil mengimpor ${addedCount} postingan dari ekstensi Kolr dengan metrik asli!`);
    setShowKolrModal(false);
    setKolrInputText('');
    setKolrParsedItems([]);
  };

  return (
    <div className="space-y-4">
      {/* LIVE DASHBOARD SYNCHRONIZATION BAR */}
      <div className="bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm relative overflow-hidden transition-all">
        <div className="h-0.5 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#06d6a0] animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-white">Status Sinkronisasi Dashboard: </span>
                {filterCampaign ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    SINKRON: {filterCampaign.toUpperCase()}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    SINKRON: SEMUA CAMPAIGN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8] mt-0.5">
                {filterCampaign
                  ? `Dashboard & sinkronisasi live terhubung langsung ke "${filterCampaign}". Metrik di bawah ini merefleksikan kampanye terpilih.`
                  : 'Dashboard terhubung ke seluruh kampanye. Setiap angka yang diubah langsung mengupdate grafik di Dashboard tanpa jeda.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterCampaign && (
              <button
                type="button"
                onClick={() => {
                  setFilterCampaign('');
                  campaignStore.setSelectedCampaign('');
                }}
                className="px-2.5 py-1 text-[11px] font-semibold text-[#94a3b8] hover:text-white bg-[#0f1729] hover:bg-[#1e2a44] border border-[#253449] rounded-lg transition-colors cursor-pointer"
                title="Reset pilihan campaign ke Semua Campaign"
              >
                Reset ke Semua Campaign
              </button>
            )}
            {onGoToDashboard && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-500/20 to-blue-500/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-500/40 text-sky-300 font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-sm"
                title="Buka Dashboard untuk melihat grafik visual yang ter-update sesuai campaign ini"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
                <span>Buka Dashboard Lengkap →</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Mini KPI Cards in DataKontenView */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#0f1729]/80 border border-[#253449] rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
              {filterCampaign ? 'Campaign Aktif' : 'Dashboard Total Campaign'}
            </span>
            <span
              className="text-sm font-extrabold text-white truncate block"
              title={filterCampaign || `${formatNumber(dashboardStats.totalCampaign)} Campaign`}
            >
              {filterCampaign ? filterCampaign : `${formatNumber(dashboardStats.totalCampaign)} Campaign`}
            </span>
          </div>
          <div className="bg-[#0f1729]/80 border border-[#253449] rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
              {filterCampaign ? 'Konten Campaign Ini' : 'Dashboard Total Konten'}
            </span>
            <span className="text-sm font-extrabold text-purple-400">
              {formatNumber(dashboardStats.totalContent)} Post
            </span>
          </div>
          <div className="bg-[#0f1729]/80 border border-sky-500/30 rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
              {filterCampaign ? 'Reach Campaign Ini' : 'Dashboard Total Reach'}
            </span>
            <span className="text-sm font-extrabold text-sky-400">
              {formatNumber(dashboardStats.totalReach)}
            </span>
          </div>
          <div className="bg-[#0f1729]/80 border border-emerald-500/30 rounded-lg px-3 py-2">
            <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">
              {filterCampaign ? 'Engagement & ER' : 'Dashboard Total Engagement'}
            </span>
            <span className="text-sm font-extrabold text-[#06d6a0]">
              {formatNumber(dashboardStats.totalEngagement)}{' '}
              {dashboardStats.averageEr !== undefined && dashboardStats.averageEr > 0 ? (
                <span className="text-xs text-emerald-300 font-semibold">
                  ({formatPercent(dashboardStats.averageEr)})
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      {/* REAL-TIME LINK SYNC CONTROL BANNER */}
      <div className="bg-gradient-to-r from-[#131c2e] via-[#16213a] to-[#131c2e] border border-[#253449] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isLiveLinkSync
                ? 'bg-emerald-500/20 text-[#06d6a0] border border-emerald-500/40 shadow-[0_0_15px_rgba(6,214,160,0.25)]'
                : 'bg-[#1e2a44] text-[#94a3b8]'
            }`}
          >
            <Activity className={`w-5 h-5 ${isLiveLinkSync ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                Live URL Sync & Real-Time Link Tracker
              </span>
              {isLiveLinkSync ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-[#06d6a0] border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06d6a0] animate-ping" />
                  REAL-TIME LINK SYNC AKTIF
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e2a44] text-[#94a3b8]">
                  STANDBY LINK SYNC
                </span>
              )}
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {isLiveLinkSync
                ? `Sinkronisasi live per tautan berjalan — memperbarui metrik sesuai link postingan setiap ${intervalSeconds}s (siklus: ${countdown}s)`
                : 'Metrik (Reach, Likes, Comments, Shares, Saves) diperbarui secara real time dan presisi berdasarkan URL postingan.'}
            </p>
          </div>
        </div>

        {/* Buttons & Interval Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* API settings button */}
          <button
            onClick={() => setShowApiSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1729] hover:bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs border border-[#253449] transition-colors cursor-pointer"
            title="Pengaturan Layanan Live Data Gratis & Token Resmi"
          >
            <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Integrasi API / Kalibrasi</span>
          </button>

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

          {/* Toggle Live Link Sync button */}
          <button
            onClick={() => {
              const nextState = !isLiveLinkSync;
              setIsLiveLinkSync(nextState);
              if (nextState) {
                onNotify(
                  `Real-Time Link Sync diaktifkan! Metrik dari URL diperbarui otomatis setiap ${intervalSeconds} detik.`
                );
              } else {
                onNotify('Real-Time Link Sync dijeda.');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isLiveLinkSync
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] shadow-sm'
            }`}
          >
            {isLiveLinkSync ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Link Sync</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Mulai Real-Time Sync</span>
              </>
            )}
          </button>

          {/* One-click Sync All From Links */}
          <button
            onClick={handleSyncAllFromLinks}
            disabled={isSyncingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1e2a44] hover:bg-[#253449] text-white font-semibold rounded-lg text-xs border border-[#253449] transition-all cursor-pointer disabled:opacity-50"
            title="Tarik & sinkronkan metrik terkini dari semua link postingan"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#06d6a0] ${isSyncingAll ? 'animate-spin' : ''}`}
            />
            <span>Sync Semua Sesuai Link</span>
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
              onChange={(e) => {
                const val = e.target.value;
                setFilterCampaign(val);
                campaignStore.setSelectedCampaign(val);
              }}
              className={`bg-[#0f1729] border text-xs font-semibold rounded-lg px-3 py-2 text-[#f1f5f9] focus:outline-none transition-all ${
                filterCampaign
                  ? 'border-sky-500/80 ring-1 ring-sky-500/30 text-sky-200'
                  : 'border-[#253449] focus:border-[#3b82f6]'
              }`}
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

            {/* Periode 3 Bulan, 6 Bulan, 9 Bulan, 12 Bulan Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#0f1729] p-1 rounded-lg border border-[#253449]">
              <span className="text-[11px] font-bold text-[#64748b] px-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                Periode:
              </span>
              {(['all', '3m', '6m', '9m', '12m'] as PeriodFilter[]).map((p) => {
                const label =
                  p === 'all'
                    ? 'Semua'
                    : p === '3m'
                    ? '3 Bulan'
                    : p === '6m'
                    ? '6 Bulan'
                    : p === '9m'
                    ? '9 Bulan'
                    : '12 Bulan';
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilterPeriod(p)}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      filterPeriod === p
                        ? 'bg-sky-500 text-white shadow-sm ring-1 ring-sky-300/40'
                        : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2a44]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0f1729] px-2 py-1 rounded-lg border border-[#253449]">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-[#f1f5f9] focus:outline-none cursor-pointer"
              >
                <option value="tanggal" className="bg-[#0f1729]">Sort: Tanggal Terbaru</option>
                <option value="campaign" className="bg-[#0f1729]">Sort: Campaign (A-Z)</option>
                <option value="influencer" className="bg-[#0f1729]">Sort: Influencer (A-Z)</option>
                <option value="reach" className="bg-[#0f1729]">Sort: Reach Tertinggi</option>
                <option value="engagement" className="bg-[#0f1729]">Sort: Engagement Tertinggi</option>
                <option value="er" className="bg-[#0f1729]">Sort: ER (%) Tertinggi</option>
              </select>
            </div>

            {(filterCampaign || filterInfluencer || filterPlatform || filterPeriod !== 'all') && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Edit Langsung di Tabel (Spreadsheet) Toggle */}
            <button
              type="button"
              onClick={() => setIsInlineEditMode((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                isInlineEditMode
                  ? 'bg-emerald-500/20 text-[#06d6a0] border-emerald-500/40 shadow-sm'
                  : 'bg-[#1e2a44] text-[#94a3b8] hover:text-white border-[#253449]'
              }`}
              title="Aktifkan/nonaktifkan mode edit langsung di sel tabel tanpa pop-up"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mode Edit Tabel:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                  isInlineEditMode
                    ? 'bg-[#06d6a0] text-[#06121f]'
                    : 'bg-[#253449] text-[#94a3b8]'
                }`}
              >
                {isInlineEditMode ? 'Aktif' : 'Nonaktif'}
              </span>
            </button>

            {/* Direct Dashboard Link */}
            {onGoToDashboard && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[#1e2a44] hover:bg-[#253449] text-sky-400 hover:text-sky-300 border border-sky-500/30 rounded-lg transition-colors cursor-pointer"
                title="Buka Dashboard untuk melihat grafik & metrik yang otomatis ter-update"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
                <span>Lihat Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setShowKolrModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500/25 via-sky-500/25 to-purple-500/25 hover:from-emerald-500/35 hover:to-sky-500/35 text-emerald-300 border border-emerald-500/40 rounded-lg transition-all cursor-pointer shadow-sm"
              title="Ambil data dari ekstensi KOL.ID (kcobgdhckaoekmalpmalpcpfmghmklid) atau Kolr"
            >
              <Puzzle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import KOL.ID</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 font-mono text-emerald-200">
                kcobgdhc...
              </span>
            </button>

            <button
              onClick={onGoToInput}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Konten</span>
            </button>
          </div>
        </div>

        {/* NOTIFIKASI PETUNJUK EDIT LANGSUNG DI TABEL */}
        {isInlineEditMode && (
          <div className="mx-4 mb-3 p-2.5 bg-gradient-to-r from-emerald-950/40 via-[#111e33] to-[#0f1729] rounded-lg border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-[#94a3b8]">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#06d6a0] animate-pulse shrink-0" />
              <span>
                <strong className="text-emerald-300">Mode Edit Langsung Aktif:</strong> Anda dapat langsung mengetik di sel tabel tanpa pop-up. Setiap perubahan angka/teks otomatis tersimpan dan seketika memperbarui metrik & grafik di <strong className="text-white">Dashboard</strong>.
              </span>
            </div>
            {onGoToDashboard && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 whitespace-nowrap underline cursor-pointer"
              >
                Cek Dashboard →
              </button>
            )}
          </div>
        )}

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
                <th className="py-3 px-3 text-center">Status Link URL</th>
                <th className="py-3 px-3 text-center">Aksi & Real-Time Sync</th>
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
                  const isRowActive = activeEditingRowIds.has(r.id);
                  const isEditing = isInlineEditMode || isRowActive;
                  const isRecentlySaved = recentlySavedId === r.id;
                  const parsed = parsePostUrl(r.postLink);

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors duration-300 ${
                        isHighlighted
                          ? 'bg-emerald-950/40 text-emerald-100 ring-1 ring-inset ring-emerald-500/40'
                          : isRowActive
                          ? 'bg-[#1a263d]'
                          : 'hover:bg-[#182337]'
                      }`}
                    >
                      {/* Tanggal */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="date"
                            value={r.tanggal}
                            onChange={(e) => handleInlineFieldChange(r.id, 'tanggal', e.target.value)}
                            className="bg-[#0f1729] border border-[#253449] hover:border-sky-500/50 focus:border-sky-400 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400/40"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className="text-[#94a3b8] cursor-pointer hover:text-white"
                            title="Klik untuk edit langsung di tabel"
                          >
                            {formatDateShort(r.tanggal)}
                          </span>
                        )}
                      </td>

                      {/* Campaign */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-semibold">
                        {isEditing ? (
                          <input
                            type="text"
                            value={r.campaign}
                            onChange={(e) => handleInlineFieldChange(r.id, 'campaign', e.target.value)}
                            placeholder="Nama Campaign"
                            className="w-[125px] bg-[#0f1729] border border-[#253449] hover:border-sky-500/50 focus:border-sky-400 rounded px-2 py-1 text-xs text-white font-semibold focus:outline-none focus:ring-1 focus:ring-sky-400/40"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className="text-white cursor-pointer hover:underline"
                            title="Klik untuk edit langsung di tabel"
                          >
                            {r.campaign}
                          </span>
                        )}
                      </td>

                      {/* Influencer */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-bold">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={r.influencer}
                              onChange={(e) => handleInlineFieldChange(r.id, 'influencer', e.target.value)}
                              placeholder="Nama Influencer"
                              className="w-[125px] bg-[#0f1729] border border-[#253449] hover:border-sky-500/50 focus:border-sky-400 rounded px-2 py-1 text-xs text-sky-400 font-bold focus:outline-none focus:ring-1 focus:ring-sky-400/40"
                            />
                            {r.isVerified && (
                              <span
                                className="px-1 py-0.5 rounded text-[8px] font-black bg-emerald-500/20 text-[#06d6a0] border border-emerald-500/40"
                                title="Terverifikasi"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => toggleRowEdit(r.id)}
                            className="flex items-center gap-1.5 cursor-pointer text-sky-400 hover:text-sky-300"
                            title="Klik untuk edit langsung di tabel"
                          >
                            <span>{r.influencer}</span>
                            {r.isVerified && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-[#06d6a0] border border-emerald-500/40"
                                title="Data terkalibrasi sesuai postingan asli"
                              >
                                ✓ Terverifikasi
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Platform */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={r.platform}
                            onChange={(e) => handleInlineFieldChange(r.id, 'platform', e.target.value)}
                            className="bg-[#0f1729] border border-[#253449] hover:border-sky-500/50 focus:border-sky-400 rounded px-2 py-1 text-xs text-[#cbd5e1] font-semibold focus:outline-none"
                          >
                            <option value="TikTok">TikTok</option>
                            <option value="Instagram">Instagram</option>
                            <option value="YouTube">YouTube</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Twitter">Twitter / X</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e2a44] text-[#94a3b8] cursor-pointer hover:bg-[#253449]"
                            title="Klik untuk edit langsung di tabel"
                          >
                            {r.platform}
                          </span>
                        )}
                      </td>

                      {/* Tipe */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap text-[#94a3b8]">
                        {isEditing ? (
                          <select
                            value={r.contentType}
                            onChange={(e) => handleInlineFieldChange(r.id, 'contentType', e.target.value)}
                            className="bg-[#0f1729] border border-[#253449] hover:border-sky-500/50 focus:border-sky-400 rounded px-2 py-1 text-xs text-[#94a3b8] focus:outline-none"
                          >
                            <option value="Reels/Video">Reels/Video</option>
                            <option value="Feed Post">Feed Post</option>
                            <option value="Story Highlight">Story Highlight</option>
                            <option value="Shorts">Shorts</option>
                            <option value="Dedicated Video">Dedicated Video</option>
                            <option value="Carousel">Carousel</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className="cursor-pointer hover:text-white"
                            title="Klik untuk edit langsung di tabel"
                          >
                            {r.contentType}
                          </span>
                        )}
                      </td>

                      {/* Reach / Views */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={r.reach === 0 ? '' : r.reach}
                            placeholder="0"
                            onChange={(e) =>
                              handleInlineFieldChange(r.id, 'reach', Math.max(0, Number(e.target.value)))
                            }
                            className="w-[95px] bg-[#0f1729] border border-sky-500/40 hover:border-sky-400 focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 rounded px-2 py-1 text-xs text-sky-300 font-bold text-right outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className={`font-semibold cursor-pointer hover:underline ${
                              isHighlighted ? 'text-sky-300 font-extrabold' : 'text-white'
                            }`}
                            title="Klik untuk edit langsung di tabel"
                          >
                            {formatNumber(r.reach)}
                          </span>
                        )}
                      </td>

                      {/* Likes */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={r.likes === 0 ? '' : r.likes}
                            placeholder="0"
                            onChange={(e) =>
                              handleInlineFieldChange(r.id, 'likes', Math.max(0, Number(e.target.value)))
                            }
                            className="w-[75px] bg-[#0f1729] border border-pink-500/40 hover:border-pink-400 focus:border-pink-400 focus:ring-1 focus:ring-pink-400/50 rounded px-2 py-1 text-xs text-pink-300 font-semibold text-right outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className={`font-medium cursor-pointer hover:underline ${
                              isHighlighted ? 'text-pink-300 font-bold' : 'text-[#cbd5e1]'
                            }`}
                            title="Klik untuk edit langsung di tabel"
                          >
                            {formatNumber(r.likes)}
                          </span>
                        )}
                      </td>

                      {/* Comments */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={r.comments === 0 ? '' : r.comments}
                            placeholder="0"
                            onChange={(e) =>
                              handleInlineFieldChange(r.id, 'comments', Math.max(0, Number(e.target.value)))
                            }
                            className="w-[70px] bg-[#0f1729] border border-indigo-500/40 hover:border-indigo-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 rounded px-2 py-1 text-xs text-indigo-300 font-semibold text-right outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className={`font-medium cursor-pointer hover:underline ${
                              isHighlighted ? 'text-indigo-300 font-bold' : 'text-[#cbd5e1]'
                            }`}
                            title="Klik untuk edit langsung di tabel"
                          >
                            {formatNumber(r.comments)}
                          </span>
                        )}
                      </td>

                      {/* Shares */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={r.shares === 0 ? '' : r.shares}
                            placeholder="0"
                            onChange={(e) =>
                              handleInlineFieldChange(r.id, 'shares', Math.max(0, Number(e.target.value)))
                            }
                            className="w-[70px] bg-[#0f1729] border border-teal-500/40 hover:border-teal-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/50 rounded px-2 py-1 text-xs text-teal-300 font-semibold text-right outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className={`font-medium cursor-pointer hover:underline ${
                              isHighlighted ? 'text-teal-300 font-bold' : 'text-[#cbd5e1]'
                            }`}
                            title="Klik untuk edit langsung di tabel"
                          >
                            {formatNumber(r.shares)}
                          </span>
                        )}
                      </td>

                      {/* Saves */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={r.saves === 0 ? '' : r.saves}
                            placeholder="0"
                            onChange={(e) =>
                              handleInlineFieldChange(r.id, 'saves', Math.max(0, Number(e.target.value)))
                            }
                            className="w-[70px] bg-[#0f1729] border border-amber-500/40 hover:border-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded px-2 py-1 text-xs text-amber-300 font-semibold text-right outline-none"
                          />
                        ) : (
                          <span
                            onClick={() => toggleRowEdit(r.id)}
                            className={`font-medium cursor-pointer hover:underline ${
                              isHighlighted ? 'text-amber-300 font-bold' : 'text-[#cbd5e1]'
                            }`}
                            title="Klik untuk edit langsung di tabel"
                          >
                            {formatNumber(r.saves)}
                          </span>
                        )}
                      </td>

                      {/* Total Engagement */}
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-black text-[#06d6a0]">
                        <div className="inline-block py-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                          {formatNumber(r.totalEngagement)}
                        </div>
                      </td>

                      {/* Status Link URL */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {r.postLink && r.postLink !== '#' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleInspectLink(r)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                              title={`Tautan ${parsed.platform} (ID: ${parsed.postId}) - Klik untuk inspeksi live / kalibrasi`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#06d6a0] shrink-0" />
                              <span className="truncate max-w-[90px]">{parsed.platform}</span>
                            </button>
                            <a
                              href={r.postLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#94a3b8] hover:text-white p-1"
                              title={r.postLink}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[#64748b] text-[10px] italic">Tanpa Link</span>
                        )}
                      </td>

                      {/* Actions: Sync from Link, Toggle Inline Edit, Delete */}
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {isRecentlySaved && (
                            <span className="text-[10px] text-[#06d6a0] font-bold flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30 animate-pulse">
                              <Check className="w-3 h-3" />
                              <span>Tersimpan</span>
                            </span>
                          )}

                          {/* Sync from Link Button */}
                          <button
                            onClick={() => handleSyncSingleLink(r.id, r.influencer)}
                            disabled={isThisRowSyncing || !r.postLink || r.postLink === '#'}
                            className={`p-1.5 rounded transition-all cursor-pointer ${
                              isThisRowSyncing
                                ? 'bg-emerald-500/20 text-[#06d6a0]'
                                : 'text-[#06d6a0] hover:bg-emerald-500/20 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                            title="Tarik dan update metrik real-time sesuai link postingan ini"
                          >
                            <Zap
                              className={`w-3.5 h-3.5 ${isThisRowSyncing ? 'animate-bounce' : ''}`}
                            />
                          </button>

                          {/* Inspect Link Details & Calibration Button */}
                          <button
                            onClick={() => handleInspectLink(r)}
                            disabled={!r.postLink || r.postLink === '#'}
                            className="p-1.5 text-sky-400 hover:text-sky-300 rounded hover:bg-sky-950/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Detail Real-Time & Kalibrasi Layar"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {/* Inline Edit Toggle Button (No popup!) */}
                          <button
                            onClick={() => toggleRowEdit(r.id)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              isRowActive
                                ? 'bg-emerald-500/25 text-[#06d6a0] border border-emerald-500/40'
                                : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2a44]'
                            }`}
                            title={isRowActive ? 'Selesai edit baris ini' : 'Edit baris ini langsung di tabel (tanpa pop-up)'}
                          >
                            {isRowActive ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Pencil className="w-3.5 h-3.5" />}
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

      {/* MODAL PENGATURAN API LIVE GRATIS & PENJELASAN */}
      {showApiSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Integrasi API Real-Time & Kalibrasi
                  </h3>
                  <p className="text-xs text-cyan-400">
                    Solusi penarikan data asli dari Instagram, TikTok, dan YouTube
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApiSettingsModal(false)}
                className="text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Instagram Notice */}
              <div className="p-3 bg-[#0f1729] rounded-lg border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Mengapa Link Instagram Perlu Kalibrasi?</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    Login-Wall Meta
                  </span>
                </div>
                <p className="text-[#cbd5e1] text-[11px] leading-relaxed">
                  Instagram secara ketat memblokir bot dan browser umum untuk membaca angka postingan tanpa login. Selain itu, angka <strong>Reach (jangkauan akun)</strong> tidak pernah ditampilkan ke publik (hanya ada di Instagram Insights pemilik akun).
                </p>
                <p className="text-[#06d6a0] text-[11px] font-semibold">
                  💡 Solusi: Anda dapat menekan tombol <strong>ℹ️ Detail &rarr; Kalibrasi Layar</strong> pada baris postingan untuk menyelaraskan angka Reach & Likes reel Instagram Anda dalam 5 detik!
                </p>
              </div>

              {/* Status Service 1: TikTok */}
              <div className="p-3 bg-[#0f1729] rounded-lg border border-[#253449]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>TikTok Live Engine (TikWM API)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    100% Gratis & Aktif
                  </span>
                </div>
                <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                  Menarik langsung angka real-time Views, Likes, Comments, Shares, dan Saves dari link video TikTok tanpa butuh API key atau biaya apapun.
                </p>
              </div>

              {/* Status Service 2: YouTube */}
              <form onSubmit={saveApiSettings} className="p-3 bg-[#0f1729] rounded-lg border border-[#253449] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>YouTube Live API (Data API v3)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Kuota Gratis Google Cloud
                  </span>
                </div>
                <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                  Google menyediakan kuota gratis 10.000 request/hari. Masukkan API key YouTube Anda di sini untuk menarik data views & likes 100% akurat dari YouTube:
                </p>
                <div className="relative">
                  <input
                    type="password"
                    value={ytApiKey}
                    onChange={(e) => setYtApiKey(e.target.value)}
                    placeholder="Masukkan Google Cloud YouTube API Key (Opsional)"
                    className="w-full bg-[#0b1120] border border-[#253449] rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#06d6a0]"
                  />
                  <Key className="w-3.5 h-3.5 text-[#64748b] absolute left-2.5 top-2.5" />
                </div>

                <div className="pt-1">
                  <label className="text-[10px] text-[#94a3b8] block mb-1">
                    Meta Graph API Access Token (Opsional untuk Instagram Business):
                  </label>
                  <input
                    type="password"
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    placeholder="EAA..."
                    className="w-full bg-[#0b1120] border border-[#253449] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#06d6a0]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold rounded text-[11px] cursor-pointer transition-colors"
                >
                  Simpan Konfigurasi Token
                </button>
              </form>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowApiSettingsModal(false)}
                className="w-full py-2 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INTEGRASI EKSTENSI KOLR (amjaoklkeffceamacmpblhhhfajdoihl) */}
      {showKolrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-gradient-to-tr from-emerald-500/20 to-sky-500/20 text-emerald-400 border border-emerald-500/30">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Integrasi Ekstensi KOL.ID (ER &amp; Post Stats)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ID: kcobgdhc...
                    </span>
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Tarik metrik akurat (Views, Likes, Comments, Saves, Shares, ER) dari ekstensi <strong>KOL.ID</strong> di Chrome
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKolrModal(false)}
                className="text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Penjelasan & Langkah-langkah Copy Paste */}
              <div className="p-3.5 bg-[#0f1729] rounded-lg border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                    <Info className="w-4 h-4 text-emerald-400" />
                    <span>Panduan Copy &amp; Paste dari Ekstensi KOL.ID</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded font-bold">
                    100% Sesuai Data Asli
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded bg-[#16213a] border border-[#253449]">
                    <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-[#06121f] flex items-center justify-center text-[10px] font-black">1</span>
                      <span>Buka Reels / Postingan</span>
                    </div>
                    <p className="text-[#94a3b8] leading-relaxed">
                      Buka Reels Instagram / TikTok target di Chrome. Ekstensi <strong>KOL.ID</strong> akan otomatis menampilkan badge statistik (Views, Likes, Comments, Saves, Shares, ER).
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[#16213a] border border-[#253449]">
                    <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-[#06121f] flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Copy (Salin) Teks</span>
                    </div>
                    <p className="text-[#94a3b8] leading-relaxed">
                      Sorot (blok) angka statistik pada badge KOL.ID, lalu tekan <kbd className="px-1 py-0.5 bg-black/40 border border-[#334155] rounded text-emerald-300 font-mono">Ctrl+C</kbd> (atau klik kanan &gt; <em>Salin</em>).
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[#16213a] border border-[#253449]">
                    <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#06d6a0] text-[#06121f] flex items-center justify-center text-[10px] font-black">3</span>
                      <span>Paste (Tempel) di Sini</span>
                    </div>
                    <p className="text-[#94a3b8] leading-relaxed">
                      Klik tombol hijau <strong>"Tempel dari Clipboard (1-Klik)"</strong> di bawah, atau tekan <kbd className="px-1 py-0.5 bg-black/40 border border-[#334155] rounded text-emerald-300 font-mono">Ctrl+V</kbd>.
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-[#94a3b8] bg-black/30 p-2 rounded border border-[#1e293b]">
                  💡 <strong>Ekstensi Terdeteksi:</strong> <code>Check Engagement Rate Instagram &amp; Tiktok by KOL.ID</code> (ID: <code className="text-emerald-300 font-mono">kcobgdhckaoekmalpmalpcpfmghmklid</code>). Sistem kami secara cerdas mem-parsing seluruh metrik (Views/Reach, Likes, Comments, Saves, Shares) tanpa rekayasa data.
                </div>
              </div>

              {/* Action: Paste Clipboard Button & Manual Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Tempel Data / Teks Metrik dari KOL.ID:
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-[#06121f] font-extrabold rounded text-[11px] transition-colors cursor-pointer shadow-sm"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Tempel dari Clipboard (1-Klik)</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={kolrInputText}
                  onChange={(e) => handleKolrInputChange(e.target.value)}
                  placeholder={`Contoh teks dari KOL.ID / Instagram:\nhttps://www.instagram.com/reels/Dd3s98PJpW1/\nViews: 50.4K\nLikes: 1.2K\nComments: 45\nShares: 12\nSaves: 80\nER: 2.65%`}
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg p-3 text-xs text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#06d6a0] font-mono leading-relaxed"
                />
              </div>

              {/* Preview Deteksi */}
              {kolrParsedItems.length > 0 ? (
                <div className="bg-[#0f1729] p-3.5 rounded-lg border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{kolrParsedItems.length} Data Berhasil Dideteksi dari Kolr!</span>
                    </span>
                    <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                      Siap Diimpor
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {kolrParsedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#16213a] p-2.5 rounded-lg border border-[#253449] text-[11px] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1">
                            <span className="text-sky-400">@{item.influencer}</span>
                            <span className="text-[#64748b]">({item.platform})</span>
                          </span>
                          <span className="font-mono text-[#94a3b8] text-[10px] truncate max-w-[200px]">
                            {item.postLink}
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 text-center pt-1 border-t border-[#253449]">
                          <div className="bg-[#0f1729] p-1 rounded">
                            <div className="text-[9px] text-[#94a3b8]">Reach</div>
                            <div className="font-bold text-sky-400">{formatNumber(item.reach || 0)}</div>
                          </div>
                          <div className="bg-[#0f1729] p-1 rounded">
                            <div className="text-[9px] text-[#94a3b8]">Likes</div>
                            <div className="font-bold text-pink-400">{formatNumber(item.likes || 0)}</div>
                          </div>
                          <div className="bg-[#0f1729] p-1 rounded">
                            <div className="text-[9px] text-[#94a3b8]">Comments</div>
                            <div className="font-bold text-indigo-400">{formatNumber(item.comments || 0)}</div>
                          </div>
                          <div className="bg-[#0f1729] p-1 rounded">
                            <div className="text-[9px] text-[#94a3b8]">Shares</div>
                            <div className="font-bold text-teal-400">{formatNumber(item.shares || 0)}</div>
                          </div>
                          <div className="bg-[#0f1729] p-1 rounded">
                            <div className="text-[9px] text-[#94a3b8]">Saves</div>
                            <div className="font-bold text-amber-400">{formatNumber(item.saves || 0)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportKolrItems}
                    className="w-full py-2.5 bg-gradient-to-r from-[#06d6a0] to-[#10b981] hover:opacity-95 text-[#06121f] font-extrabold rounded-lg text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Masukkan {kolrParsedItems.length} Data ke Tabel Data Konten</span>
                  </button>
                </div>
              ) : kolrInputText.trim() ? (
                <div className="p-3 bg-[#0f1729] rounded-lg border border-amber-500/30 text-amber-300 text-[11px]">
                  Sedang memproses teks... Pastikan teks menyertakan angka likes, views/reach, atau link postingan.
                </div>
              ) : null}
            </div>

            <div className="mt-4 pt-3 border-t border-[#253449] flex justify-end">
              <button
                type="button"
                onClick={() => setShowKolrModal(false)}
                className="px-4 py-2 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL SINKRONISASI LINK REAL-TIME & KALIBRASI */}
      {selectedLinkDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-[#06d6a0]">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Inspeksi Link & Kalibrasi Metrik
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedLinkDetail.item.isVerified ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-[#06d6a0] border border-emerald-500/40">
                        ✓ Terverifikasi Sesuai Layar
                      </span>
                    ) : selectedLinkDetail.inspection?.dataSource === 'live_api' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        🟢 100% Data Asli Live ({selectedLinkDetail.inspection?.statusMessage})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        🔵 {selectedLinkDetail.inspection?.statusMessage || 'Live Real-Time'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLinkDetail(null)}
                className="text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-[#0f1729] p-3 rounded-lg border border-[#253449]">
                <div className="text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Target URL Postingan
                </div>
                <a
                  href={selectedLinkDetail.item.postLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-[#3b82f6] hover:underline break-all inline-flex items-center gap-1"
                >
                  <span>{selectedLinkDetail.item.postLink}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0f1729] p-3 rounded-lg border border-[#253449]">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Platform</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {selectedLinkDetail.inspection?.platform || selectedLinkDetail.item.platform}
                  </div>
                </div>
                <div className="bg-[#0f1729] p-3 rounded-lg border border-[#253449]">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Post ID / Shortcode</div>
                  <div className="text-sm font-mono font-bold text-sky-400 mt-0.5 truncate">
                    {selectedLinkDetail.inspection?.postId || 'ID Teridentifikasi'}
                  </div>
                </div>
              </div>

              {/* Real-time Metrics Card or Calibration Mode */}
              {!isCalibrating ? (
                <div className="bg-[#0f1729] p-4 rounded-xl border border-[#253449]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#06d6a0]" />
                      <span>Metrik Terkini Terdaftar</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCalibrating(true)}
                      className="text-[11px] px-2.5 py-1 rounded bg-[#1e2a44] hover:bg-[#253449] text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Kalibrasi Angka Asli</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-[#16213a] p-2 rounded-lg">
                      <div className="text-[10px] text-[#94a3b8]">Reach / Views</div>
                      <div className="text-sm font-black text-sky-400">
                        {formatNumber(selectedLinkDetail.item.reach)}
                      </div>
                    </div>
                    <div className="bg-[#16213a] p-2 rounded-lg">
                      <div className="text-[10px] text-[#94a3b8]">Likes</div>
                      <div className="text-sm font-black text-pink-400">
                        {formatNumber(selectedLinkDetail.item.likes)}
                      </div>
                    </div>
                    <div className="bg-[#16213a] p-2 rounded-lg">
                      <div className="text-[10px] text-[#94a3b8]">Comments</div>
                      <div className="text-sm font-black text-indigo-400">
                        {formatNumber(selectedLinkDetail.item.comments)}
                      </div>
                    </div>
                    <div className="bg-[#16213a] p-2 rounded-lg">
                      <div className="text-[10px] text-[#94a3b8]">Shares</div>
                      <div className="text-sm font-black text-teal-400">
                        {formatNumber(selectedLinkDetail.item.shares)}
                      </div>
                    </div>
                    <div className="bg-[#16213a] p-2 rounded-lg">
                      <div className="text-[10px] text-[#94a3b8]">Saves</div>
                      <div className="text-sm font-black text-amber-400">
                        {formatNumber(selectedLinkDetail.item.saves)}
                      </div>
                    </div>
                    <div className="bg-[#16213a] p-2 rounded-lg">
                      <div className="text-[10px] text-[#94a3b8]">Total Eng.</div>
                      <div className="text-sm font-black text-[#06d6a0]">
                        {formatNumber(selectedLinkDetail.item.totalEngagement)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#253449] flex justify-between items-center text-[11px]">
                    <span className="text-[#94a3b8]">Engagement Rate (ER):</span>
                    <span className="font-extrabold text-[#06d6a0]">
                      {formatPercent(
                        selectedLinkDetail.item.reach > 0
                          ? (selectedLinkDetail.item.totalEngagement / selectedLinkDetail.item.reach) * 100
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                /* INLINE CALIBRATION FORM */
                <div className="bg-[#0f1729] p-4 rounded-xl border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-amber-300 block">
                        🎯 Kalibrasi Angka Asli Layar Postingan
                      </span>
                      <span className="text-[10px] text-[#94a3b8]">
                        Masukkan angka nyata yang Anda lihat di reel Instagram tersebut
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCalibrating(false)}
                      className="text-xs text-[#94a3b8] hover:text-white"
                    >
                      Batal
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">
                        Reach / Views
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={calibReach || ''}
                        onChange={(e) => setCalibReach(Number(e.target.value))}
                        className="w-full bg-[#16213a] border border-[#253449] rounded p-2 text-xs text-sky-400 font-bold focus:outline-none focus:border-[#06d6a0]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Likes</label>
                      <input
                        type="number"
                        min="0"
                        value={calibLikes || ''}
                        onChange={(e) => setCalibLikes(Number(e.target.value))}
                        className="w-full bg-[#16213a] border border-[#253449] rounded p-2 text-xs text-pink-400 font-bold focus:outline-none focus:border-[#06d6a0]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">
                        Comments
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={calibComments || ''}
                        onChange={(e) => setCalibComments(Number(e.target.value))}
                        className="w-full bg-[#16213a] border border-[#253449] rounded p-2 text-xs text-indigo-400 font-bold focus:outline-none focus:border-[#06d6a0]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Shares</label>
                      <input
                        type="number"
                        min="0"
                        value={calibShares || ''}
                        onChange={(e) => setCalibShares(Number(e.target.value))}
                        className="w-full bg-[#16213a] border border-[#253449] rounded p-2 text-xs text-teal-400 font-bold focus:outline-none focus:border-[#06d6a0]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">Saves</label>
                      <input
                        type="number"
                        min="0"
                        value={calibSaves || ''}
                        onChange={(e) => setCalibSaves(Number(e.target.value))}
                        className="w-full bg-[#16213a] border border-[#253449] rounded p-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-[#06d6a0]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#94a3b8] block mb-1">
                        Total Eng. (Otomatis)
                      </label>
                      <div className="bg-[#16213a] border border-[#253449] rounded p-2 text-xs text-[#06d6a0] font-black">
                        {formatNumber(calibLikes + calibComments + calibShares + calibSaves)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCalibration}
                    className="w-full py-2 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan & Verifikasi Metrik Asli</span>
                  </button>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleSyncSingleLink(
                      selectedLinkDetail.item.id,
                      selectedLinkDetail.item.influencer
                    );
                    const updatedItem = campaignStore
                      .getContents()
                      .find((c) => c.id === selectedLinkDetail.item.id);
                    if (updatedItem) {
                      const freshInspection = await fetchMetricsFromUrl(
                        updatedItem.postLink,
                        updatedItem
                      );
                      setSelectedLinkDetail({ item: updatedItem, inspection: freshInspection });
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Fetch Real-Time Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLinkDetail(null)}
                  className="px-4 py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT KONTEN MANUAL DIHILANGKAN - Diganti Edit Langsung di Tabel */}
    </div>
  );
};
