import React, { useState } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { formatNumber } from '../../utils/formatters';
import { CheckCircle2, RotateCcw, Link2, Sparkles, Loader2, Puzzle, ClipboardPaste, X, Info } from 'lucide-react';
import { fetchMetricsFromUrl } from '../../services/linkFetcher';
import { parseKolrData } from '../../services/kolrParser';

interface InputDataViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
  onSuccess: () => void;
}

export const InputDataView: React.FC<InputDataViewProps> = ({ onNotify, onSuccess }) => {
  const options = campaignStore.getDistinctOptions();

  const todayStr = new Date().toISOString().split('T')[0];

  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [campaign, setCampaign] = useState<string>('');
  const [influencer, setInfluencer] = useState<string>('');

  const [platform, setPlatform] = useState<string>('Instagram');
  const [isCustomPlatform, setIsCustomPlatform] = useState<boolean>(false);
  const [customPlatform, setCustomPlatform] = useState<string>('');

  const [postLink, setPostLink] = useState<string>('');
  const [isFetchingLink, setIsFetchingLink] = useState<boolean>(false);

  const [contentType, setContentType] = useState<string>('Reels/Video');
  const [isCustomContentType, setIsCustomContentType] = useState<boolean>(false);
  const [customContentType, setCustomContentType] = useState<string>('');

  const [reach, setReach] = useState<number>(0);
  const [likes, setLikes] = useState<number>(0);
  const [comments, setComments] = useState<number>(0);
  const [shares, setShares] = useState<number>(0);
  const [saves, setSaves] = useState<number>(0);

  // Kolr Extension Modal state
  const [isKolrModalOpen, setIsKolrModalOpen] = useState<boolean>(false);
  const [kolrRawText, setKolrRawText] = useState<string>('');

  const totalEngagement = (Number(likes) || 0) + (Number(comments) || 0) + (Number(shares) || 0) + (Number(saves) || 0);

  const applyKolrText = (text: string) => {
    setKolrRawText(text);
    const parsedList = parseKolrData(text);
    if (parsedList.length > 0) {
      const item = parsedList[0];
      if (item.reach) setReach(item.reach);
      if (item.likes) setLikes(item.likes);
      if (item.comments) setComments(item.comments);
      if (item.shares) setShares(item.shares);
      if (item.saves) setSaves(item.saves);
      if (item.influencer && item.influencer !== 'Influencer Kolr' && !influencer) {
        setInfluencer(item.influencer);
      }
      if (item.postLink && item.postLink !== '#' && !postLink) {
        setPostLink(item.postLink);
      }
      if (item.platform) {
        setPlatform(item.platform);
        setIsCustomPlatform(false);
      }
      onNotify(
        `Sukses membaca metrik Kolr: Reach ${formatNumber(item.reach || 0)}, Likes ${formatNumber(
          item.likes || 0
        )}, Comments ${formatNumber(item.comments || 0)}!`
      );
      setIsKolrModalOpen(false);
      setKolrRawText('');
    } else {
      onNotify('Belum ada angka metrik yang terdeteksi dalam teks.', true);
    }
  };

  const handlePasteClipboardKolr = async () => {
    try {
      const text = await navigator.clipboard.readText();
      applyKolrText(text);
    } catch {
      onNotify('Izin membaca clipboard ditolak oleh browser. Silakan tempel manual di kotak teks.', true);
    }
  };

  // Auto-fetch data from Link
  const handleAutoFetchFromLink = async () => {
    if (!postLink || !postLink.trim() || !postLink.startsWith('http')) {
      onNotify('Silakan masukkan Post Link (URL) yang valid terlebih dahulu.', true);
      return;
    }

    setIsFetchingLink(true);
    try {
      const res = await fetchMetricsFromUrl(postLink);
      if (res.isValid) {
        if (res.platform && res.platform !== 'Unknown') {
          setPlatform(res.platform);
          setIsCustomPlatform(false);
        }
        if (res.contentType) {
          setContentType(res.contentType);
          setIsCustomContentType(false);
        }
        if (res.username && !influencer) {
          setInfluencer(res.username);
        }

        if (res.dataSource === 'live_api') {
          setReach(res.metrics.reach);
          setLikes(res.metrics.likes);
          setComments(res.metrics.comments);
          setShares(res.metrics.shares);
          setSaves(res.metrics.saves);

          onNotify(
            `Data ASLI live ditarik dari ${res.platform}: Reach ${formatNumber(
              res.metrics.reach
            )}, Likes ${formatNumber(res.metrics.likes)}, Comments ${formatNumber(res.metrics.comments)}!`
          );
        } else {
          // Instagram atau platform dengan login-wall
          onNotify(
            `Tautan ${res.platform} terdeteksi (${res.postId}). Instagram memblokir data publik tanpa login akun Meta. Sistem TIDAK mengarang data — silakan masukkan angka riil yang tampil di postingan Anda.`,
            false
          );
        }
      } else {
        onNotify('Format tautan tidak dikenali, gunakan link Instagram, TikTok, YouTube, atau X.', true);
      }
    } catch (e: any) {
      onNotify('Gagal memeriksa tautan: ' + e.message, true);
    } finally {
      setIsFetchingLink(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedPlatform = isCustomPlatform ? customPlatform.trim() : platform;
    const resolvedContentType = isCustomContentType ? customContentType.trim() : contentType;

    if (!resolvedPlatform) {
      onNotify('Platform belum dipilih/diisi.', true);
      return;
    }
    if (!resolvedContentType) {
      onNotify('Content Type belum dipilih/diisi.', true);
      return;
    }
    if (!campaign.trim()) {
      onNotify('Nama campaign harus diisi.', true);
      return;
    }
    if (!influencer.trim()) {
      onNotify('Nama influencer harus diisi.', true);
      return;
    }

    try {
      const res = campaignStore.addContent({
        tanggal,
        campaign: campaign.trim(),
        influencer: influencer.trim(),
        platform: resolvedPlatform,
        postLink: postLink.trim() || '#',
        contentType: resolvedContentType,
        reach: Number(reach) || 0,
        likes: Number(likes) || 0,
        comments: Number(comments) || 0,
        shares: Number(shares) || 0,
        saves: Number(saves) || 0,
      });

      if (res.status === 'ok') {
        onNotify('Data konten berhasil disimpan ke database!');
        // Reset form
        setCampaign('');
        setInfluencer('');
        setPostLink('');
        setReach(0);
        setLikes(0);
        setComments(0);
        setShares(0);
        setSaves(0);
        setIsCustomPlatform(false);
        setIsCustomContentType(false);
        onSuccess();
      }
    } catch (err: any) {
      onNotify('Gagal menyimpan: ' + err.message, true);
    }
  };

  const handleReset = () => {
    setTanggal(todayStr);
    setCampaign('');
    setInfluencer('');
    setPlatform('Instagram');
    setIsCustomPlatform(false);
    setCustomPlatform('');
    setContentType('Reels/Video');
    setIsCustomContentType(false);
    setCustomContentType('');
    setPostLink('');
    setReach(0);
    setLikes(0);
    setComments(0);
    setShares(0);
    setSaves(0);
  };

  return (
    <div className="max-w-[680px] mx-auto bg-[#16213a] border border-[#253449] rounded-xl p-6 sm:p-8 shadow-md relative overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />

      <h2 className="text-xl font-extrabold text-white">Input Data Konten</h2>
      <p className="text-xs text-[#94a3b8] mt-1 mb-4">
        Masukkan detail performa konten/post influencer untuk kampanye berjalan. Dukungan auto-fetch real time dari link.
      </p>

      {/* KOL.ID EXTENSION SHORTCUT BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-[#1e2a44] to-[#131c2e] border border-emerald-500/30 rounded-xl mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xs text-[#06121f] shadow">
            <Puzzle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Ambil Metrik dari Ekstensi KOL.ID</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                ID: kcobgdhc...
              </span>
            </div>
            <p className="text-[11px] text-[#94a3b8]">
              Isi otomatis Views, Likes, Comments, Saves dari overlay ekstensi KOL.ID di Instagram / TikTok
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsKolrModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors cursor-pointer"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>Paste / Ambil dari KOL.ID</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Tanggal & Campaign */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Tanggal Posting
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Nama Campaign
            </label>
            <input
              type="text"
              list="listCampaigns"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="Contoh: Ramadhan Glowing 2026"
              required
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
            <datalist id="listCampaigns">
              {options.campaigns.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Row 2: Influencer & Platform */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Influencer / PIC
            </label>
            <input
              type="text"
              list="listInfluencers"
              value={influencer}
              onChange={(e) => setInfluencer(e.target.value)}
              placeholder="Contoh: Tasya Farasya"
              required
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
            <datalist id="listInfluencers">
              {options.influencers.map((inf) => (
                <option key={inf} value={inf} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Platform
            </label>
            {!isCustomPlatform ? (
              <select
                value={platform}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCustomPlatform(true);
                  } else {
                    setPlatform(e.target.value);
                  }
                }}
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              >
                {options.platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="__new__">+ Tambah Platform Baru...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="Ketik platform baru..."
                  autoFocus
                  className="flex-1 bg-[#0f1729] border border-[#3b82f6] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomPlatform(false)}
                  className="px-3 py-2 bg-[#1e2a44] text-xs font-semibold rounded-lg hover:text-white"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Post Link with Auto-Fetch Button & Content Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                Post Link (URL)
              </label>
              {postLink.startsWith('http') && (
                <button
                  type="button"
                  onClick={handleAutoFetchFromLink}
                  disabled={isFetchingLink}
                  className="text-[10px] font-extrabold text-[#06d6a0] hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  title="Ambil data real-time langsung dari tautan ini"
                >
                  {isFetchingLink ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{isFetchingLink ? 'Mengambil...' : 'Fetch dari Link'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                value={postLink}
                onChange={(e) => setPostLink(e.target.value)}
                placeholder="https://instagram.com/p/... atau tiktok..."
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
              />
              <Link2 className="w-4 h-4 text-[#64748b] absolute left-2.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Content Type
            </label>
            {!isCustomContentType ? (
              <select
                value={contentType}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsCustomContentType(true);
                  } else {
                    setContentType(e.target.value);
                  }
                }}
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              >
                {options.contentTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__new__">+ Tambah Content Type Baru...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customContentType}
                  onChange={(e) => setCustomContentType(e.target.value)}
                  placeholder="Ketik tipe baru..."
                  autoFocus
                  className="flex-1 bg-[#0f1729] border border-[#3b82f6] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomContentType(false)}
                  className="px-3 py-2 bg-[#1e2a44] text-xs font-semibold rounded-lg hover:text-white"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Metrik Performa */}
        <div className="pt-4 border-t border-[#253449]/70">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#06d6a0]">
              Metrik Interaksi & Performa
            </div>
            {postLink.startsWith('http') && (
              <button
                type="button"
                onClick={handleAutoFetchFromLink}
                disabled={isFetchingLink}
                className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-[#06d6a0] border border-emerald-500/30 flex items-center gap-1 font-semibold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Isi Metrik dari Link URL</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Reach / Views
              </label>
              <input
                type="number"
                min="0"
                value={reach || ''}
                onChange={(e) => setReach(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                required
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Likes
              </label>
              <input
                type="number"
                min="0"
                value={likes || ''}
                onChange={(e) => setLikes(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Comments
              </label>
              <input
                type="number"
                min="0"
                value={comments || ''}
                onChange={(e) => setComments(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Shares
              </label>
              <input
                type="number"
                min="0"
                value={shares || ''}
                onChange={(e) => setShares(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Saves
              </label>
              <input
                type="number"
                min="0"
                value={saves || ''}
                onChange={(e) => setSaves(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                Total Engagement (Otomatis)
              </label>
              <div className="w-full bg-[#0b1120] border border-[#253449] rounded-lg px-3.5 py-2.5 text-base font-extrabold text-[#06d6a0]">
                {formatNumber(totalEngagement)}
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 flex items-center gap-3">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#06d6a0] to-[#10b981] hover:opacity-95 text-[#06121f] font-bold py-3 px-5 rounded-lg text-sm shadow-md transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Data Konten</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-3 bg-[#1e2a44] hover:bg-[#253449] text-[#94a3b8] hover:text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </form>

      {/* MODAL PASTE / AMBIL DARI EKSTENSI KOL.ID */}
      {isKolrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#16213a] border border-[#253449] rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Ambil Data dari Ekstensi KOL.ID</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      kcobgdhc...
                    </span>
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Isi otomatis form dengan metrik asli dari ekstensi KOL.ID Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKolrModalOpen(false)}
                className="text-[#94a3b8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#0f1729] rounded-lg border border-emerald-500/30 text-[#cbd5e1] text-[11px] space-y-2">
                <div className="font-bold text-emerald-300">Cara Copy &amp; Paste dari Ekstensi KOL.ID:</div>
                <ol className="list-decimal list-inside space-y-1 text-[#94a3b8]">
                  <li>Buka postingan Reels/TikTok di tab browser Anda (di mana ekstensi KOL.ID aktif).</li>
                  <li>Sorot / blok angka metrik (Views, Likes, Comments, Saves, Shares, ER) pada overlay KOL.ID, lalu tekan <kbd className="px-1 py-0.5 bg-black/40 border border-[#334155] rounded text-emerald-300 font-mono">Ctrl+C</kbd>.</li>
                  <li>Kembali ke sini, lalu klik tombol hijau <strong>"Tempel Otomatis dari Clipboard"</strong> atau tekan <kbd className="px-1 py-0.5 bg-black/40 border border-[#334155] rounded text-emerald-300 font-mono">Ctrl+V</kbd> di kotak bawah.</li>
                </ol>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handlePasteClipboardKolr}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-[#06121f] font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Tempel Otomatis dari Clipboard (1-Klik)</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1.5">
                  Atau Tempel (Ctrl+V) Teks Manual di Sini:
                </label>
                <textarea
                  rows={4}
                  value={kolrRawText}
                  onChange={(e) => setKolrRawText(e.target.value)}
                  placeholder={`Contoh teks dari KOL.ID:\nViews: 50.4K\nLikes: 1.2K\nComments: 45\nShares: 12\nSaves: 80\nER: 2.65%`}
                  className="w-full bg-[#0f1729] border border-[#253449] rounded-lg p-3 text-xs text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#06d6a0] font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => applyKolrText(kolrRawText)}
                  className="flex-1 py-2.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Terapkan ke Form Input
                </button>
                <button
                  type="button"
                  onClick={() => setIsKolrModalOpen(false)}
                  className="px-4 py-2.5 bg-[#1e2a44] text-[#94a3b8] hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
