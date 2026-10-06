# Panduan Deploy CampaignFlow Pro ke Netlify 🚀

Proyek ini sudah dikonfigurasi penuh dan siap dideploy langsung ke **Netlify** menggunakan file `netlify.toml` dan `public/_redirects`.

---

## Opsi 1: Deploy Otomatis via GitHub / GitLab (Paling Direkomendasikan)

1. **Push kode ke repository GitHub Anda**:
   ```bash
   git init
   git add .
   git commit -m "feat: CampaignFlow Pro ready for Netlify"
   git remote add origin https://github.com/USERNAME/campaignflow-pro.git
   git push -u origin main
   ```

2. **Buka Netlify**:
   - Masuk ke [app.netlify.com](https://app.netlify.com).
   - Klik tombol **"Add new site"** &rarr; **"Import an existing project"**.
   - Pilih **GitHub** dan pilih repository Anda.

3. **Konfigurasi Build (Otomatis Terdeteksi)**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   *(Pengaturan ini otomatis dibaca dari `netlify.toml`)*

4. **Klik "Deploy site"**:
   - Dalam ~1 menit, aplikasi web Anda langsung online dengan domain gratis seperti `https://campaignflow-pro.netlify.app`.

---

## Opsi 2: Deploy Cepat via Netlify Drop (Tanpa Git, 1 Menit Jadi)

1. Jalankan build di komputer lokal Anda:
   ```bash
   npm run build
   ```
2. Buka browser ke: [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag & drop folder `dist` ke halaman Netlify.
4. Selesai! Website langsung live seketika.

---

## Opsi 3: Deploy via Netlify CLI

Jika Anda memiliki Netlify CLI:
```bash
# 1. Install CLI jika belum
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Build & Deploy
npm run build
netlify deploy --prod --dir=dist
```

---

## Catatan Konfigurasi yang Sudah Disediakan

- `netlify.toml`: Mengatur build command `npm run build`, output direktori `dist`, Node 20 environment, dan routing SPA 200 rewrite.
- `public/_redirects`: Memastikan Single Page Application (SPA) tidak mengalami error 404 ketika halaman di-refresh.
- `@tailwindcss/vite` & `Vite 8`: Build bundle telah dioptimasi dengan minifikasi CSS & JS production.
