export interface RawFile {
  name: string;
  type: 'gs' | 'html' | 'json' | 'md';
  category: 'Backend Script' | 'HTML View' | 'Configuration' | 'Documentation';
  content: string;
}

export const rawSourceFiles: RawFile[] = [
  {
    name: 'Analytics.gs',
    type: 'gs',
    category: 'Backend Script',
    content: `/**
 * ============================================================
 * ANALYTICS: Summary Influencer & ROI Calculator
 * ============================================================
 */

function computeInfluencerSummaries() {
  const contracts = sheetToObjects_(getSheet_(SHEET_NAMES.CONTRACT));
  const results = [];

  contracts.forEach(contract => {
    try {
      const agg = computeAggregateForContract_(contract);
      if (agg) results.push(agg);
    } catch (err) {
      Logger.log('Gagal proses kontrak ID=' + contract['ID'] + ' influencer=' + contract['Influencer'] + ': ' + err.message);
    }
  });

  return results;
}

function computeInfluencerSummariesForClient() {
  return sanitizeForClient_(computeInfluencerSummaries());
}

function computeAggregateForContract_(contract) {
  const allContent = sheetToObjects_(getSheet_(SHEET_NAMES.CONTENT));
  const start = new Date(contract['Periode Mulai']);
  const end = new Date(contract['Periode Selesai']);

  const posts = allContent.filter(r => {
    if (r['Influencer/PIC'] !== contract['Influencer']) return false;
    const d = new Date(r['Tanggal']);
    return d >= start && d <= end;
  });

  const totalContent = posts.length;
  const totalReach = posts.reduce((s, r) => s + (Number(r['Reach/View']) || 0), 0);
  const totalEngagement = posts.reduce((s, r) => s + (Number(r['Total Engagement']) || 0), 0);
  const totalCost = Number(contract['Total Biaya Kontrak']) || 0;

  const erPercent = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
  const cpe = totalEngagement > 0 ? totalCost / totalEngagement : 0;
  const costPerContent = totalContent > 0 ? totalCost / totalContent : 0;
  const cpr = totalReach > 0 ? totalCost / totalReach : 0;

  const platformCounts = {};
  posts.forEach(p => {
    platformCounts[p['Platform']] = (platformCounts[p['Platform']] || 0) + 1;
  });
  const dominantPlatform = Object.keys(platformCounts).sort((a, b) => platformCounts[b] - platformCounts[a])[0] || 'Global';

  return {
    idKontrak: contract['ID'],
    influencer: contract['Influencer'],
    periodeMulai: contract['Periode Mulai'],
    periodeSelesai: contract['Periode Selesai'],
    platform: dominantPlatform,
    totalContent: totalContent,
    totalReach: totalReach,
    totalEngagement: totalEngagement,
    erPercent: erPercent,
    totalCost: totalCost,
    cpe: cpe,
    costPerContent: costPerContent,
    cpr: cpr
  };
}

function mapErScore_(diffPercent) {
  if (diffPercent >= 30) return 50;
  if (diffPercent >= 15) return 45;
  if (diffPercent >= 5) return 40;
  if (diffPercent >= -5) return 35;
  if (diffPercent >= -20) return 25;
  return 15;
}

function mapCpeScore_(diffPercent) {
  if (diffPercent >= 30) return 30;
  if (diffPercent >= 15) return 25;
  if (diffPercent >= 5) return 20;
  if (diffPercent >= -5) return 15;
  if (diffPercent >= -20) return 10;
  return 5;
}

function classifyRoi_(totalScore) {
  if (totalScore >= 80) {
    return {
      kategori: 'High ROI',
      color: '#22c55e',
      rekomendasi: 'Lanjutkan kontrak, pertimbangkan menaikkan volume konten atau memperpanjang durasi kerja sama.'
    };
  }
  if (totalScore >= 60) {
    return {
      kategori: 'Medium ROI',
      color: '#eab308',
      rekomendasi: 'Evaluasi konten & strategi, negosiasikan ulang biaya, monitor performa 1 periode lagi sebelum keputusan lanjut/stop.'
    };
  }
  return {
    kategori: 'Low ROI',
    color: '#ef4444',
    rekomendasi: 'Pertimbangkan untuk tidak melanjutkan kontrak, atau lakukan perubahan strategi konten secara signifikan.'
  };
}

function computeRoiScores() {
  const summaries = computeInfluencerSummaries();
  const results = [];

  summaries.forEach(s => {
    try {
      const bench = resolveBenchmark_(s.platform);
      const complianceScore = getComplianceForContract_(s.idKontrak);

      const erDiff = bench.er > 0 ? ((s.erPercent - bench.er) / bench.er) * 100 : 0;
      const cpeDiff = bench.cpe > 0 ? ((bench.cpe - s.cpe) / bench.cpe) * 100 : 0;

      const erScore = s.totalContent > 0 ? mapErScore_(erDiff) : 0;
      const cpeScore = s.totalContent > 0 ? mapCpeScore_(cpeDiff) : 0;

      const totalScore = erScore + cpeScore + complianceScore;
      const classification = classifyRoi_(totalScore);

      results.push(Object.assign({}, s, {
        erBenchmark: bench.er,
        cpeBenchmark: bench.cpe,
        erDiffPercent: erDiff,
        cpeDiffPercent: cpeDiff,
        erScore: erScore,
        cpeScore: cpeScore,
        complianceScore: complianceScore,
        totalScore: totalScore,
        kategori: classification.kategori,
        color: classification.color,
        rekomendasi: classification.rekomendasi
      }));
    } catch (err) {
      Logger.log('Gagal hitung ROI: ' + err.message);
    }
  });

  results.sort((a, b) => b.totalScore - a.totalScore);
  return sanitizeForClient_(results);
}`
  },
  {
    name: 'Code.gs',
    type: 'gs',
    category: 'Backend Script',
    content: `const SHEET_NAMES = {
  CONTENT: 'ContentData',
  CONTRACT: 'InfluencerContract',
  BENCHMARK: 'Benchmark',
  COMPLIANCE: 'ComplianceScore'
};

const DEFAULT_ER_BENCHMARK = 2.8;   // %
const DEFAULT_CPE_BENCHMARK = 1005; // Rp
const APP_VERSION = 'v1.0.7 - tambah CPR di Summary Influencer';

function getAppVersion() { return APP_VERSION; }

function doGet() {
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle('Campaign Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}`
  },
  {
    name: 'Benchmark.gs',
    type: 'gs',
    category: 'Backend Script',
    content: `function getBenchmarkList() {
  return sheetToObjects_(getSheet_(SHEET_NAMES.BENCHMARK));
}

function saveBenchmark(payload) {
  const sheet = getSheet_(SHEET_NAMES.BENCHMARK);
  const rows = sheetToObjects_(sheet);
  const target = rows.find(r => r['Platform'] === payload.platform);

  if (target) {
    sheet.getRange(target._row, 1, 1, 4).setValues([[
      payload.platform,
      Number(payload.erBenchmark) || 0,
      Number(payload.cpeBenchmark) || 0,
      payload.mode || 'Manual'
    ]]);
  } else {
    sheet.appendRow([
      payload.platform,
      Number(payload.erBenchmark) || 0,
      Number(payload.cpeBenchmark) || 0,
      payload.mode || 'Manual'
    ]);
  }
  return { status: 'ok', message: 'Benchmark berhasil disimpan.' };
}`
  },
  {
    name: 'Compliance.gs',
    type: 'gs',
    category: 'Backend Script',
    content: `function mapComplianceScore_(totalNilai) {
  if (totalNilai >= 18) return 20;
  if (totalNilai >= 14) return 15;
  if (totalNilai >= 10) return 10;
  if (totalNilai >= 5) return 5;
  return 0;
}

function saveCompliance(payload) {
  const brief = clamp05_(payload.brief);
  const messaging = clamp05_(payload.messaging);
  const regulasi = clamp05_(payload.regulasi);
  const teknis = clamp05_(payload.teknis);
  const totalNilai = brief + messaging + regulasi + teknis;
  const score = mapComplianceScore_(totalNilai);
  // ... simpan ke ComplianceScore sheet
  return { status: 'ok', score: score, totalNilai: totalNilai };
}`
  },
  {
    name: 'ContentData.gs',
    type: 'gs',
    category: 'Backend Script',
    content: `function addContent(payload) {
  const sheet = getSheet_(SHEET_NAMES.CONTENT);
  const reach = Number(payload.reach) || 0;
  const likes = Number(payload.likes) || 0;
  const comments = Number(payload.comments) || 0;
  const shares = Number(payload.shares) || 0;
  const saves = Number(payload.saves) || 0;
  const totalEngagement = likes + comments + shares + saves;
  const id = generateId_('CT');

  sheet.appendRow([
    id, payload.tanggal, payload.campaign, payload.influencer,
    payload.platform, payload.postLink, payload.contentType,
    reach, likes, comments, shares, saves, totalEngagement
  ]);
  return { status: 'ok', message: 'Konten berhasil ditambahkan.', id: id };
}`
  },
  {
    name: 'Contract.gs',
    type: 'gs',
    category: 'Backend Script',
    content: `function addContract(payload) {
  const sheet = getSheet_(SHEET_NAMES.CONTRACT);
  const id = generateId_('CTR');

  sheet.appendRow([
    id, payload.influencer, payload.periodeMulai,
    payload.periodeSelesai, Number(payload.totalBiaya) || 0
  ]);
  return { status: 'ok', message: 'Kontrak berhasil ditambahkan.', id: id };
}`
  },
  {
    name: 'Dashboard.html',
    type: 'html',
    category: 'HTML View',
    content: `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <?!= include('CSS'); ?>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
</head>
<body>
  <!-- App shell & sidebar -->
</body>
</html>`
  },
  {
    name: 'PANDUAN_INSTALASI.md',
    type: 'md',
    category: 'Documentation',
    content: `# Campaign Tracker — Panduan Instalasi Google Sheets & Apps Script

1. Buat Google Spreadsheet baru di Google Sheets.
2. Buka Extensions → Apps Script.
3. Buat file-file .gs dan .html sesuai nama.
4. Jalankan fungsi setupSpreadsheet() sekali untuk generate sheet & header.
5. Deploy sebagai Web App (Deploy → New deployment → Web app → Execute as: Me → Access: Anyone).
6. Copy link web app yang dihasilkan.`
  },
  {
    name: 'netlify.toml',
    type: 'json',
    category: 'Configuration',
    content: `[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"`
  },
  {
    name: 'NETLIFY_DEPLOY_GUIDE.md',
    type: 'md',
    category: 'Documentation',
    content: `# Panduan Deploy ke Netlify

1. Cara Paling Cepat (Drag & Drop):
   - Jalankan \`npm run build\` di komputer lokal.
   - Buka https://app.netlify.com/drop
   - Drag & drop folder \`dist\` ke halaman Netlify.
   - Selesai! Website langsung aktif.

2. Cara Otomatis via Git (GitHub):
   - Push repository ke GitHub.
   - Di Netlify: Add new site -> Import from Git -> Pilih Repo.
   - Build command: npm run build
   - Publish directory: dist
   - Netlify otomatis membaca netlify.toml.`
  }
];
