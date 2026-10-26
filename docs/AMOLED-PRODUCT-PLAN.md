# Social Cleaner — AMOLED Black Ürün ve Tasarım Planı

> Durum: 25 Ekim 2026 · AMOLED Black tema<br>
> Hedef: Full siyah arka plan, iki gri tonu panel/buton, 3D görünüm, yeşil aksan.

## 1. Görsel dil

- **Arka plan:** `#000000` (full AMOLED black).
- **Panel 1 (yüzey):** `#0a0a0a` — ana kartlar.
- **Panel 2 (yükseltilmiş):** `#121212` — iç bloklar, hover.
- **Çizgi:** `#1f1f1f` / `#2a2a2a`.
- **Metin:** `#f5f5f5` (ana), `#a1a1aa` (ikincil).
- **Aksan:** `#22c55e` (temizlik yeşili) + `#0284c7` (ikincil mavi).
- **Gölge:** koyu zeminde hafif glow + derinlik.

## 2. 3D görünüm kuralları

- Kartlar: `border` + `shadow-soft` + hover `translate-y-0.5`.
- Butonlar: `border` + `bg-surface-2` + hover `shadow-soft`.
- Rozetler: ince border + düşük opacity arka plan.
- Paneller: `backdrop-blur` + `bg-surface/80`.
- Animasyonlar: `animate-rise`, `animate-fade`, `animate-pop`, `transition-all duration-300`.

## 3. Tipografi

- **UI:** Manrope (yerel, Türkçe glifler).
- **Mono:** JetBrains Mono (kanıt satırları, rumuzlar).
- Başlıklar: `-0.028em` letter-spacing.
- Gövde: `optimizeLegibility`, `antialiased`.

## 4. Ürün özellikleri (Ücretsiz / Pro)

### Ücretsiz
- Kullanıcı adı taraması (8 platform/tarama, 3/gün)
- İlk 5 sonuç + platform kapsamı
- Manuel profil bağlantısı
- Temel kanıt kartları

### Pro
- 40 platform/tarama, 100 tarama/gün
- Ad/e-posta/telefon araması (Brave/Tavily ile)
- Tüm sonuçlar (80)
- Dışa aktarma (JSON/CSV)
- Kaldırma taslakları
- İzleme ve yeniden tarama
- Görsel benzerlik (AI kredi gerekli)

## 5. Arama ve kapsam

- **Kullanıcı adı:** 56 platformda doğrudan kontrol.
- **E-posta/Ad/Telefon:** sağlayıcı ile kapsamlı; anahtar yoksa 503.
- **Platform kapsamı:** found / not_found / blocked / unsupported / error.
- **Profil inceleme paneli:** siteye gitmeden modal iframe.

## 6. Türkiye odaklı platformlar

- Sosyal: Instagram, TikTok, Facebook, X, Telegram, YouTube
- Oyun: CraftRise, Steam, Epic Games
- Blog/Forum: Blogger, Substack, Medium, Reddit
- Geliştirici: GitHub, GitLab, Codeberg
- Diğer: LinkedIn, Pinterest, Spotify, Discord

## 7. Domain ve deployment

- Domain: `socialcleaner.com` (öneri) veya `temiz.app`.
- Hosting: Vercel / self-hosted Node.
- CDN: statik varlıklar (font, logo) yerel.
- SSL: zorunlu.
- CSP: yalnızca `self`, `data:`, `blob:`.

## 8. Güvenlik ve gizlilik

- AES-256-GCM alan şifreleme.
- HMAC kör indeks.
- CSRF, Origin, rate limit.
- KVKK/GDPR: veri minimizasyonu, 7/90 gün saklama, silme hakkı.
- Biyometrik veri: açık rıza, geçici saklama.

## 9. Yol haritası

### Faz 1 — Temel (✅)
- Kimlik doğrulama, Identity Vault, şifreleme, denetim.

### Faz 2 — Kullanıcı adı taraması (✅)
- 56 platform, kapsam raporu, plan limitleri.

### Faz 3 — E-posta/Ad/Telefon (⏳)
- Brave/Tavily entegrasyonu, OSINT genişletme.

### Faz 4 — Kaldırma ve izleme (⏳)
- Kaldırma merkezi, izleme, raporlar.

### Faz 5 — Görsel tarama (⏳)
- AI entegrasyonu, rıza akışı.

### Faz 6 — Ödeme ve kurumsal (⏳)
- iyzico/Stripe, kurumsal sayfalar.

## 10. Başarı metrikleri

- Ücretsiz → Pro dönüşüm: %3–5
- Pro churn: <%5/ay
- Tarama başına maliyet: <0,01 ₺
- NPS: >40