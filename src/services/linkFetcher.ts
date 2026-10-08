export interface LinkInspectionResult {
  url: string;
  isValid: boolean;
  platform: string;
  postId: string;
  username?: string;
  contentType: string;
  status: 'connected' | 'login_required' | 'empty' | 'error';
  dataSource: 'live_api' | 'manual_verified' | 'unverified';
  statusMessage: string;
  lastFetchedAt: string;
  title?: string;
  metrics: {
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    totalEngagement: number;
  };
}

/**
 * Parser URL Media Sosial untuk mendeteksi platform, ID postingan, dan tipe konten
 */
export function parsePostUrl(url: string): {
  isValid: boolean;
  platform: string;
  postId: string;
  username?: string;
  contentType: string;
} {
  if (!url || !url.trim() || url === '#') {
    return {
      isValid: false,
      platform: 'Unknown',
      postId: '',
      contentType: 'Feed Post',
    };
  }

  const cleanUrl = url.trim();

  // 1. Instagram
  if (cleanUrl.includes('instagram.com') || cleanUrl.includes('instagr.am')) {
    let contentType = 'Feed Post';
    let postId = '';
    let username = '';

    if (cleanUrl.includes('/reel/') || cleanUrl.includes('/reels/')) {
      contentType = 'Reels/Video';
      const match = cleanUrl.match(/\/reel(?:s)?\/([a-zA-Z0-9_-]+)/);
      if (match) postId = match[1];
    } else if (cleanUrl.includes('/p/')) {
      contentType = cleanUrl.includes('carousel') ? 'Carousel' : 'Feed Post';
      const match = cleanUrl.match(/\/p\/([a-zA-Z0-9_-]+)/);
      if (match) postId = match[1];
    } else if (cleanUrl.includes('/stories/')) {
      contentType = 'Story';
      const match = cleanUrl.match(/\/stories\/([a-zA-Z0-9._-]+)\/([0-9]+)/);
      if (match) {
        username = match[1];
        postId = match[2];
      }
    }

    if (!postId) {
      const parts = cleanUrl.split('/').filter(Boolean);
      postId = parts[parts.length - 1] || 'ig-post';
    }

    return {
      isValid: true,
      platform: 'Instagram',
      postId,
      username,
      contentType,
    };
  }

  // 2. TikTok
  if (cleanUrl.includes('tiktok.com')) {
    let postId = '';
    let username = '';

    const matchUser = cleanUrl.match(/@([a-zA-Z0-9_.-]+)/);
    if (matchUser) username = matchUser[1];

    const matchVideo = cleanUrl.match(/\/video\/([0-9]+)/);
    if (matchVideo) postId = matchVideo[1];

    if (!postId) {
      const parts = cleanUrl.split('/').filter(Boolean);
      postId = parts[parts.length - 1] || 'tt-video';
    }

    return {
      isValid: true,
      platform: 'TikTok',
      postId,
      username,
      contentType: 'Reels/Video',
    };
  }

  // 3. YouTube
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    let postId = '';
    let contentType = 'Reels/Video';

    if (cleanUrl.includes('/shorts/')) {
      contentType = 'Reels/Video';
      const match = cleanUrl.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (match) postId = match[1];
    } else if (cleanUrl.includes('watch?v=')) {
      const match = cleanUrl.match(/v=([a-zA-Z0-9_-]+)/);
      if (match) postId = match[1];
    } else if (cleanUrl.includes('youtu.be/')) {
      const match = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (match) postId = match[1];
    }

    if (!postId) {
      const parts = cleanUrl.split('/').filter(Boolean);
      postId = parts[parts.length - 1] || 'yt-video';
    }

    return {
      isValid: true,
      platform: 'YouTube',
      postId,
      contentType,
    };
  }

  // 4. X (Twitter)
  if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) {
    let postId = '';
    let username = '';

    const matchStatus = cleanUrl.match(/\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/);
    if (matchStatus) {
      username = matchStatus[1];
      postId = matchStatus[2];
    }

    return {
      isValid: true,
      platform: 'X (Twitter)',
      postId: postId || 'x-post',
      username,
      contentType: 'Feed Post',
    };
  }

  // 5. Facebook
  if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
    return {
      isValid: true,
      platform: 'Facebook',
      postId: 'fb-post',
      contentType: 'Reels/Video',
    };
  }

  return {
    isValid: cleanUrl.startsWith('http'),
    platform: 'Other Platform',
    postId: 'link-post',
    contentType: 'Feed Post',
  };
}

/**
 * Fetch data metrik nyata dari TikTok menggunakan public endpoint TikWM (gratis tanpa key)
 */
async function fetchTikTokLive(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      if (json && json.code === 0 && json.data) {
        return json.data;
      }
    }
  } catch {
    // Timeout or CORS
  }
  return null;
}

/**
 * Fetch data YouTube via oEmbed dan Google Data API v3 (jika API Key tersedia)
 */
async function fetchYouTubeLive(videoId: string): Promise<any | null> {
  const result: any = {};

  // 1. YouTube oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      result.title = data.title;
      result.author_name = data.author_name;
    }
  } catch {
    // Ignore
  }

  // 2. Cek apakah ada YouTube API Key tersimpan di browser
  const ytKey = localStorage.getItem('youtube_api_key');
  if (ytKey && videoId) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${ytKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const stats = data.items[0].statistics;
          const snippet = data.items[0].snippet;
          result.viewCount = Number(stats.viewCount) || 0;
          result.likeCount = Number(stats.likeCount) || 0;
          result.commentCount = Number(stats.commentCount) || 0;
          if (snippet) {
            result.title = snippet.title;
            result.author_name = snippet.channelTitle;
          }
          result.isLiveApi = true;
          return result;
        }
      }
    } catch {
      // Ignore
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Fetch metrik real-time berbasis URL tautan postingan.
 * HANYA mengembalikan data NYATA dari API publik.
 * TIDAK MENGARANG atau membuat angka acak sintetis sama sekali.
 */
export async function fetchMetricsFromUrl(
  url: string,
  existingMetrics?: {
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }
): Promise<LinkInspectionResult> {
  const parsed = parsePostUrl(url);

  if (!parsed.isValid) {
    return {
      url,
      isValid: false,
      platform: 'Unknown',
      postId: '',
      contentType: 'Feed Post',
      status: 'empty',
      dataSource: 'unverified',
      statusMessage: 'URL tautan tidak valid atau belum diisi',
      lastFetchedAt: new Date().toLocaleTimeString('id-ID'),
      metrics: {
        reach: existingMetrics?.reach || 0,
        likes: existingMetrics?.likes || 0,
        comments: existingMetrics?.comments || 0,
        shares: existingMetrics?.shares || 0,
        saves: existingMetrics?.saves || 0,
        totalEngagement: (existingMetrics?.likes || 0) + (existingMetrics?.comments || 0) + (existingMetrics?.shares || 0) + (existingMetrics?.saves || 0),
      },
    };
  }

  // --- TARIK DATA ASLI LIVE DARI TIKTOK (TIKWM) ---
  if (parsed.platform === 'TikTok') {
    const liveData = await fetchTikTokLive(url);
    if (liveData) {
      const reach = Number(liveData.play_count) || (existingMetrics?.reach || 0);
      const likes = Number(liveData.digg_count) || (existingMetrics?.likes || 0);
      const comments = Number(liveData.comment_count) || (existingMetrics?.comments || 0);
      const shares = Number(liveData.share_count) || (existingMetrics?.shares || 0);
      const saves = Number(liveData.collect_count) || (existingMetrics?.saves || 0);
      const totalEngagement = likes + comments + shares + saves;

      return {
        url,
        isValid: true,
        platform: 'TikTok',
        postId: String(liveData.id || parsed.postId),
        username: liveData.author?.unique_id || liveData.author?.nickname || parsed.username,
        contentType: 'Reels/Video',
        status: 'connected',
        dataSource: 'live_api',
        statusMessage: 'Data Asli Live dari Server TikTok',
        title: liveData.title || '',
        lastFetchedAt: new Date().toLocaleTimeString('id-ID'),
        metrics: {
          reach,
          likes,
          comments,
          shares,
          saves,
          totalEngagement,
        },
      };
    }
  }

  // --- TARIK DATA ASLI LIVE DARI YOUTUBE ---
  if (parsed.platform === 'YouTube') {
    const ytData = await fetchYouTubeLive(parsed.postId);
    if (ytData && ytData.isLiveApi) {
      const reach = ytData.viewCount || (existingMetrics?.reach || 0);
      const likes = ytData.likeCount || (existingMetrics?.likes || 0);
      const comments = ytData.commentCount || (existingMetrics?.comments || 0);
      const shares = existingMetrics?.shares || 0;
      const saves = existingMetrics?.saves || 0;
      const totalEngagement = likes + comments + shares + saves;

      return {
        url,
        isValid: true,
        platform: 'YouTube',
        postId: parsed.postId,
        username: ytData.author_name || parsed.username,
        contentType: parsed.contentType,
        status: 'connected',
        dataSource: 'live_api',
        statusMessage: 'Data Asli Live dari YouTube Data API',
        title: ytData.title || '',
        lastFetchedAt: new Date().toLocaleTimeString('id-ID'),
        metrics: {
          reach,
          likes,
          comments,
          shares,
          saves,
          totalEngagement,
        },
      };
    }

    if (ytData && ytData.title) {
      return {
        url,
        isValid: true,
        platform: 'YouTube',
        postId: parsed.postId,
        username: ytData.author_name || parsed.username,
        contentType: parsed.contentType,
        status: 'connected',
        dataSource: 'unverified',
        statusMessage: 'Tautan YouTube Valid (Masukkan angka views/likes layar atau simpan API Key)',
        title: ytData.title,
        lastFetchedAt: new Date().toLocaleTimeString('id-ID'),
        metrics: {
          reach: existingMetrics?.reach || 0,
          likes: existingMetrics?.likes || 0,
          comments: existingMetrics?.comments || 0,
          shares: existingMetrics?.shares || 0,
          saves: existingMetrics?.saves || 0,
          totalEngagement: (existingMetrics?.likes || 0) + (existingMetrics?.comments || 0) + (existingMetrics?.shares || 0) + (existingMetrics?.saves || 0),
        },
      };
    }
  }

  // --- INSTAGRAM (TIDAK MENGARANG: MENYIMPAN NILAI AKTUAL TANPA DATA SINTETIS) ---
  if (parsed.platform === 'Instagram') {
    const hasExisting = Boolean(existingMetrics && (existingMetrics.reach > 0 || existingMetrics.likes > 0));

    return {
      url,
      isValid: true,
      platform: 'Instagram',
      postId: parsed.postId,
      username: parsed.username,
      contentType: parsed.contentType,
      status: 'login_required',
      dataSource: hasExisting ? 'manual_verified' : 'unverified',
      statusMessage: hasExisting
        ? 'Data Sesuai Layar Postingan (Terverifikasi)'
        : 'Instagram mengunci data di balik login (HTTP 302). Sistem tidak mengarang data.',
      lastFetchedAt: new Date().toLocaleTimeString('id-ID'),
      metrics: {
        reach: existingMetrics?.reach || 0,
        likes: existingMetrics?.likes || 0,
        comments: existingMetrics?.comments || 0,
        shares: existingMetrics?.shares || 0,
        saves: existingMetrics?.saves || 0,
        totalEngagement: (existingMetrics?.likes || 0) + (existingMetrics?.comments || 0) + (existingMetrics?.shares || 0) + (existingMetrics?.saves || 0),
      },
    };
  }

  // Fallback netral tanpa membuat angka fiktif
  return {
    url,
    isValid: true,
    platform: parsed.platform,
    postId: parsed.postId,
    username: parsed.username,
    contentType: parsed.contentType,
    status: 'connected',
    dataSource: 'unverified',
    statusMessage: 'Tautan terdaftar. Masukkan angka riil postingan.',
    lastFetchedAt: new Date().toLocaleTimeString('id-ID'),
    metrics: {
      reach: existingMetrics?.reach || 0,
      likes: existingMetrics?.likes || 0,
      comments: existingMetrics?.comments || 0,
      shares: existingMetrics?.shares || 0,
      saves: existingMetrics?.saves || 0,
      totalEngagement: (existingMetrics?.likes || 0) + (existingMetrics?.comments || 0) + (existingMetrics?.shares || 0) + (existingMetrics?.saves || 0),
    },
  };
}
