import React, { useState } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { formatNumber } from '../../utils/formatters';
import { CheckCircle2, RotateCcw } from 'lucide-react';

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

  const [contentType, setContentType] = useState<string>('Reels/Video');
  const [isCustomContentType, setIsCustomContentType] = useState<boolean>(false);
  const [customContentType, setCustomContentType] = useState<string>('');

  const [reach, setReach] = useState<number>(0);
  const [likes, setLikes] = useState<number>(0);
  const [comments, setComments] = useState<number>(0);
  const [shares, setShares] = useState<number>(0);
  const [saves, setSaves] = useState<number>(0);

  const totalEngagement = (Number(likes) || 0) + (Number(comments) || 0) + (Number(shares) || 0) + (Number(saves) || 0);

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
      <p className="text-xs text-[#94a3b8] mt-1 mb-6">
        Masukkan detail performa konten/post influencer untuk kampanye berjalan.
      </p>

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

        {/* Row 3: Post Link & Content Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">
              Post Link (URL)
            </label>
            <input
              type="url"
              value={postLink}
              onChange={(e) => setPostLink(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full bg-[#0f1729] border border-[#253449] rounded-lg px-3.5 py-2.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6]"
            />
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
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#06d6a0] mb-3">
            Metrik Interaksi & Performa
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
    </div>
  );
};
