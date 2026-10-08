/**
 * Utility untuk mem-parsing data teks / clipboard yang disalin dari ekstensi Kolr (AI Influencer Analytics)
 * atau tampilan metrik Instagram / TikTok.
 */

export interface ParsedKolrData {
  influencer?: string;
  platform?: string;
  contentType?: string;
  postLink?: string;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  erPercent?: number;
  rawMatched?: Record<string, string | number>;
}

export function parseMetricNumber(val: string | number): number {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;

  const clean = val.toString().trim().replace(/,/g, '.').toLowerCase();
  
  // Handle K (ribu)
  if (clean.endsWith('k')) {
    const num = parseFloat(clean.replace('k', ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  // Handle M (juta)
  if (clean.endsWith('m')) {
    const num = parseFloat(clean.replace('m', ''));
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }

  // Handle standard number with thousand separators
  // contoh: 12.500 atau 12,500
  const normalized = val.toString().trim().replace(/[^0-9]/g, '');
  const parsed = parseInt(normalized, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseKolrText(rawText: string): ParsedKolrData {
  const result: ParsedKolrData = {
    rawMatched: {},
  };

  if (!rawText || !rawText.trim()) return result;

  const text = rawText.trim();

  // Coba parse jika formatnya JSON
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const obj = JSON.parse(text);
      if (obj.influencer || obj.username || obj.creator) {
        result.influencer = obj.influencer || obj.username || obj.creator;
      }
      if (obj.reach || obj.views || obj.impressions) {
        result.reach = parseMetricNumber(obj.reach || obj.views || obj.impressions);
      }
      if (obj.likes || obj.like) {
        result.likes = parseMetricNumber(obj.likes || obj.like);
      }
      if (obj.comments || obj.comment) {
        result.comments = parseMetricNumber(obj.comments || obj.comment);
      }
      if (obj.shares || obj.share) {
        result.shares = parseMetricNumber(obj.shares || obj.share);
      }
      if (obj.saves || obj.save || obj.bookmarks) {
        result.saves = parseMetricNumber(obj.saves || obj.save || obj.bookmarks);
      }
      if (obj.url || obj.link || obj.postLink) {
        result.postLink = obj.url || obj.link || obj.postLink;
      }
      return result;
    } catch {
      // lanjut ke text matching
    }
  }

  // URL matching
  const urlMatch = text.match(/https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com|x\.com)[^\s]+/i);
  if (urlMatch) {
    result.postLink = urlMatch[0];
    if (urlMatch[2].includes('instagram')) result.platform = 'Instagram';
    else if (urlMatch[2].includes('tiktok')) result.platform = 'TikTok';
    else if (urlMatch[2].includes('youtube')) result.platform = 'YouTube';
    else if (urlMatch[2].includes('x.com')) result.platform = 'X (Twitter)';
  }

  // Regex patterns untuk mendeteksi data dari Kolr / Instagram / TikTok UI
  const patterns: { key: keyof ParsedKolrData; regexes: RegExp[] }[] = [
    {
      key: 'reach',
      regexes: [
        /(?:reach|views?|tayangan|ditonton|penayangan|view count)[:\s=]+([0-9.,]+[kmKM]?)/i,
        /([0-9.,]+[kmKM]?)\s*(?:views?|reach|penayangan|tayangan)/i,
      ],
    },
    {
      key: 'likes',
      regexes: [
        /(?:likes?|suka|disukai)[:\s=]+([0-9.,]+[kmKM]?)/i,
        /([0-9.,]+[kmKM]?)\s*(?:likes?|suka)/i,
      ],
    },
    {
      key: 'comments',
      regexes: [
        /(?:comments?|komentar)[:\s=]+([0-9.,]+[kmKM]?)/i,
        /([0-9.,]+[kmKM]?)\s*(?:comments?|komentar)/i,
      ],
    },
    {
      key: 'shares',
      regexes: [
        /(?:shares?|dibagikan|bagikan)[:\s=]+([0-9.,]+[kmKM]?)/i,
        /([0-9.,]+[kmKM]?)\s*(?:shares?|dibagikan)/i,
      ],
    },
    {
      key: 'saves',
      regexes: [
        /(?:saves?|disimpan|simpan|bookmarks?)[:\s=]+([0-9.,]+[kmKM]?)/i,
        /([0-9.,]+[kmKM]?)\s*(?:saves?|disimpan|bookmarks?)/i,
      ],
    },
    {
      key: 'influencer',
      regexes: [
        /@([a-zA-Z0-9_.]+)/i,
        /(?:influencer|creator|username|account)[:\s=]+@?([a-zA-Z0-9_.]+)/i,
      ],
    },
  ];

  for (const item of patterns) {
    for (const rx of item.regexes) {
      const match = text.match(rx);
      if (match && match[1]) {
        if (item.key === 'influencer') {
          if (!result.influencer) result.influencer = match[1];
        } else {
          const num = parseMetricNumber(match[1]);
          if (num > 0) {
            (result as any)[item.key] = num;
            if (result.rawMatched) result.rawMatched[item.key] = match[1];
          }
        }
        break;
      }
    }
  }

  return result;
}
