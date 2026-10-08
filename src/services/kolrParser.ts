import { ContentItem } from '../types';

export interface KolrParsedItem {
  influencer?: string;
  campaign?: string;
  platform?: string;
  postLink?: string;
  contentType?: string;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

/**
 * Parser pintar untuk membaca data hasil salinan / export dari ekstensi:
 * 1. KOL.ID: Check Engagement Rate Instagram & Tiktok (ID: kcobgdhckaoekmalpmalpcpfmghmklid)
 * 2. Kolr: AI Influencer Analytics Tool (ID: amjaoklkeffceamacmpblhhhfajdoihl)
 * 
 * Mendukung format:
 * - JSON mentah / export dari KOL.ID & Kolr
 * - Format badge/overlay metrik KOL.ID (ER, Views, Likes, Comments, Saves, Shares)
 * - Format teks copy-paste tabel / popup ekstensi
 * - Format teks langsung dari reels / post Instagram & TikTok
 */
export function parseKolrData(input: string): KolrParsedItem[] {
  if (!input || !input.trim()) return [];

  const trimmed = input.trim();
  const results: KolrParsedItem[] = [];

  // 1. Coba parse sebagai JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const data = JSON.parse(trimmed);
      const items = Array.isArray(data) ? data : data.posts || data.items || data.data || [data];

      for (const it of items) {
        if (!it) continue;
        const postLink = it.url || it.link || it.post_url || it.permalink || it.postUrl || '';
        const reach = parseFlexibleNumber(it.views || it.play_count || it.reach || it.view_count || it.impressions);
        const likes = parseFlexibleNumber(it.likes || it.like_count || it.digg_count);
        const comments = parseFlexibleNumber(it.comments || it.comment_count);
        const shares = parseFlexibleNumber(it.shares || it.share_count);
        const saves = parseFlexibleNumber(it.saves || it.save_count || it.bookmarks || it.collect_count);
        const influencer = it.username || it.influencer || it.author || it.creator || 'Influencer Kolr';
        const platform = it.platform || (postLink.includes('tiktok') ? 'TikTok' : 'Instagram');
        const contentType = it.type || (postLink.includes('reel') ? 'Reels/Video' : 'Feed Post');

        results.push({
          influencer,
          campaign: it.campaign || 'Kolr Campaign',
          platform,
          postLink: postLink || '#',
          contentType,
          reach,
          likes,
          comments,
          shares,
          saves,
        });
      }

      if (results.length > 0) return results;
    } catch {
      // Bukan JSON valid, lanjut ke parser teks
    }
  }

  // 2. Parser CSV / TSV baris demi baris jika ada tab atau koma tabel
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentItem: Partial<KolrParsedItem> = {};

  for (const line of lines) {
    // Deteksi URL postingan
    const urlMatch = line.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      if (currentItem.postLink && (currentItem.reach || currentItem.likes)) {
        results.push(sanitizeKolrItem(currentItem));
        currentItem = {};
      }
      const url = urlMatch[0];
      currentItem.postLink = url;
      if (url.includes('tiktok.com')) currentItem.platform = 'TikTok';
      else if (url.includes('instagram.com')) currentItem.platform = 'Instagram';
      else if (url.includes('youtube.com')) currentItem.platform = 'YouTube';
      else if (url.includes('x.com')) currentItem.platform = 'X (Twitter)';
    }

    // Deteksi Username (@username atau Username: ...)
    const usernameMatch = line.match(/(?:@|username[:\s]+|creator[:\s]+|influencer[:\s]+)([a-zA-Z0-9_.]+)/i);
    if (usernameMatch && !currentItem.influencer) {
      currentItem.influencer = usernameMatch[1];
    }

    // Pola 1: "Reach: 12.5k" atau "Views: 50,000"
    const matchViews1 = line.match(/(?:views?|reach|tayangan|penayangan|plays?)[\s:=]+([0-9.,]+[kmKM]?)/i);
    if (matchViews1) {
      currentItem.reach = parseFlexibleNumber(matchViews1[1]);
    } else {
      // Pola 2: "12.5k views" atau "50,000 reach"
      const matchViews2 = line.match(/([0-9.,]+[kmKM]?)\s*(?:views?|reach|tayangan|penayangan|plays?)/i);
      if (matchViews2) currentItem.reach = parseFlexibleNumber(matchViews2[1]);
    }

    // Likes
    const matchLikes1 = line.match(/(?:likes?|suka|disukai)[\s:=]+([0-9.,]+[kmKM]?)/i);
    if (matchLikes1) {
      currentItem.likes = parseFlexibleNumber(matchLikes1[1]);
    } else {
      const matchLikes2 = line.match(/([0-9.,]+[kmKM]?)\s*(?:likes?|suka|disukai)/i);
      if (matchLikes2) currentItem.likes = parseFlexibleNumber(matchLikes2[1]);
    }

    // Comments
    const matchComments1 = line.match(/(?:comments?|komentar)[\s:=]+([0-9.,]+[kmKM]?)/i);
    if (matchComments1) {
      currentItem.comments = parseFlexibleNumber(matchComments1[1]);
    } else {
      const matchComments2 = line.match(/([0-9.,]+[kmKM]?)\s*(?:comments?|komentar)/i);
      if (matchComments2) currentItem.comments = parseFlexibleNumber(matchComments2[1]);
    }

    // Shares
    const matchShares1 = line.match(/(?:shares?|bagikan|dibagikan)[\s:=]+([0-9.,]+[kmKM]?)/i);
    if (matchShares1) {
      currentItem.shares = parseFlexibleNumber(matchShares1[1]);
    } else {
      const matchShares2 = line.match(/([0-9.,]+[kmKM]?)\s*(?:shares?|bagikan|dibagikan)/i);
      if (matchShares2) currentItem.shares = parseFlexibleNumber(matchShares2[1]);
    }

    // Saves
    const matchSaves1 = line.match(/(?:saves?|simpan|disimpan|bookmarks?)[\s:=]+([0-9.,]+[kmKM]?)/i);
    if (matchSaves1) {
      currentItem.saves = parseFlexibleNumber(matchSaves1[1]);
    } else {
      const matchSaves2 = line.match(/([0-9.,]+[kmKM]?)\s*(?:saves?|simpan|disimpan|bookmarks?)/i);
      if (matchSaves2) currentItem.saves = parseFlexibleNumber(matchSaves2[1]);
    }
  }

  if (
    currentItem.postLink ||
    currentItem.influencer ||
    (currentItem.likes && currentItem.likes > 0) ||
    (currentItem.reach && currentItem.reach > 0)
  ) {
    results.push(sanitizeKolrItem(currentItem));
  }

  // Jika masih kosong dan input hanya deretan angka (misal: "50000 1200 45 10 25")
  if (results.length === 0) {
    const rawNumbers = trimmed.match(/[0-9]+([.,][0-9]+)?([kmKM])?/g);
    if (rawNumbers && rawNumbers.length >= 2) {
      results.push(
        sanitizeKolrItem({
          reach: parseFlexibleNumber(rawNumbers[0]),
          likes: parseFlexibleNumber(rawNumbers[1]),
          comments: rawNumbers.length > 2 ? parseFlexibleNumber(rawNumbers[2]) : 0,
          shares: rawNumbers.length > 3 ? parseFlexibleNumber(rawNumbers[3]) : 0,
          saves: rawNumbers.length > 4 ? parseFlexibleNumber(rawNumbers[4]) : 0,
        })
      );
    }
  }

  return results;
}

export function parseFlexibleNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return Math.round(val);

  const clean = val.toString().trim().toLowerCase();
  if (!clean) return 0;

  if (clean.endsWith('k')) {
    const num = parseFloat(clean.replace('k', '').replace(/,/g, '.'));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  if (clean.endsWith('m')) {
    const num = parseFloat(clean.replace('m', '').replace(/,/g, '.'));
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }

  // Handle format 12.500 atau 12,500
  // Jika ada titik dan panjang digit setelah titik = 3, berarti ribuan Indonesia
  if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
    return parseInt(clean.replace(/\./g, ''), 10) || 0;
  }
  if (/^\d{1,3}(,\d{3})+$/.test(clean)) {
    return parseInt(clean.replace(/,/g, ''), 10) || 0;
  }

  // General float or int
  const parsed = parseFloat(clean.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

function sanitizeKolrItem(item: Partial<KolrParsedItem>): KolrParsedItem {
  return {
    influencer: item.influencer || 'Influencer Kolr',
    campaign: item.campaign || 'Kolr Sync Campaign',
    platform: item.platform || 'Instagram',
    postLink: item.postLink || '#',
    contentType: item.contentType || 'Reels/Video',
    reach: Number(item.reach) || 0,
    likes: Number(item.likes) || 0,
    comments: Number(item.comments) || 0,
    shares: Number(item.shares) || 0,
    saves: Number(item.saves) || 0,
  };
}
