# Görsel Tarama ve Yapay Zeka ile Eşleştirme Planı

> Durum: 24 Ekim 2026 · Planlama aşaması<br>
> İlke: **Görsel eşleşme ≠ kimlik kanıtı.** Yüz/kişi benzerliği, hesap sahipliğini kanıtlamaz.

## 1. Amaç

Kullanıcının **kendi referans fotoğrafı** ile, username taramasında bulunan herkese açık
profil fotoğraflarını karşılaştırmak ve “muhtemel aynı kişi” olabilecek hesapları
**kanıtlı bir skor + açıklama** ile göstermek.

Bu özellik:

- Toplu “kişi bulma” aracı değildir.
- Başkalarını hedefleme, takip etme veya gözetleme amacıyla kullanılamaz.
- Yalnızca kullanıcının **kendi kimliği** için, açık rıza ile çalışır.

## 2. Hukuki ve etik sınırlar

- Yüz/kişi görüntüsü **özel nitelikli kişisel veri** kabul edilir.
- İşlem için **açık rıza** zorunludur; rıza geri alınabilmelidir.
- Referans fotoğraf ve karşılaştırma sonuçları **şifreli** saklanır.
- Karşılaştırma sonrası kaynak fotoğraflar kalıcı olarak saklanmaz; yalnızca skor,
  platform, profil URL ve zaman damgası saklanır.
- Kullanıcı tek tıkla tüm görsel tarama verisini silebilmelidir.
- AI sağlayıcısına gönderilen veri minimum olmalıdır; mümkünse yerel/on-premise
  model tercih edilir.
- “Aynı kişi” iddiası üretilmez; yalnızca “görsel benzerlik skoru” gösterilir.

## 3. Kullanıcı akışı

1. Kullanıcı username taraması yapar.
2. “Görsel tarama” adımında referans fotoğraf yükler (tek fotoğraf).
3. Açık rıza onayı verir.
4. Sistem bulunan profillerin **herkese açık profil fotoğraflarını** geçici olarak
   okur.
5. AI modeli yüz/kişi benzerliği hesaplar.
6. Sonuçlar platform bazlı skor ve açıklama ile gösterilir.
7. Fotoğraflar silinir; yalnızca skor kaydı saklanır.

## 4. Veri modeli (tasarım)

### `visual_references`
- `id`
- `user_id`
- `image_enc` (AES-256-GCM ile şifreli görüntü)
- `consent_at`
- `created_at`
- `deleted_at`

### `visual_matches`
- `id`
- `run_id`
- `platform_id`
- `profile_url`
- `similarity_score` (0–100)
- `confidence` (0–100)
- `model_name`, `model_version`
- `evidence_json` (skor, açıklama, zaman)
- `created_at`

### `visual_consents`
- `id`
- `user_id`
- `scope` (`visual_scan`)
- `granted_at`
- `revoked_at`

## 5. Teknik mimari

```
Username taraması → bulunan profiller
        │
        ▼
Görsel toplayıcı (geçici, bellekte)
  - herkese açık profil fotoğrafı URL'si
  - çerez yok, oturum yok, redirect takibi yok
        │
        ▼
AI adaptörü
  - yerel model veya onaylı hosted provider
  - yüz tespiti + embedding + benzerlik
        │
        ▼
Skorlayıcı
  - 0–100 benzerlik
  - güven aralığı
  - açıklama
        │
        ▼
Kayıt
  - yalnızca skor + kanıt
  - fotoğraf kalıcı saklanmaz
```

### AI sağlayıcı seçenekleri

| Seçenek | Avantaj | Risk |
|---|---|---|
| Yerel model (InsightFace / FaceNet) | Veri dışarı çıkmaz | Sunucu kaynak maliyeti |
| Hosted vision API | Kolay entegrasyon | Veri işleme sözleşmesi gerekir |
| Hibrit | Yerel ön filtre + hosted doğrulama | Karmaşıklık |

İlk sürümde **yerel model** tercih edilmelidir; hosted sağlayıcı yalnızca
açık rıza ve veri işleme sözleşmesi ile etkinleştirilmelidir.

## 6. Güvenlik ve gizlilik

- Referans fotoğraf yüklenmeden tarama başlamaz.
- Açık rıza olmadan hiçbir görüntü işlenmez.
- Referans fotoğraf ve geçici profil fotoğrafları **diskte saklanmaz**.
- Tüm kalıcı veri AES-256-GCM ile şifrelenir.
- Loglarda görüntü veya embedding saklanmaz.
- Kullanıcı veriyi silebilir; silme cascade uygulanır.
- Rate limit ve kota uygulanır.
- SSRF koruması profil fotoğrafı URL'leri için de geçerlidir.

## 7. UI/UX

- `/visual` sayfası: rıza, fotoğraf yükleme, tarama başlatma.
- Sonuç kartlarında:
  - platform logosu
  - profil bağlantısı
  - benzerlik skoru
  - güven aralığı
  - “görsel benzerlik, sahiplik kanıtı değildir” uyarısı
- Kullanıcı tek tıkla tüm görsel veriyi silebilir.

## 8. Uygulama aşamaları

### Faz V1 — Tasarım ve rıza
- [ ] Rıza metni ve hukuk incelemesi
- [ ] Veri modeli migrasyonu
- [ ] `/visual` sayfası iskeleti
- [ ] AI sağlayıcı arayüzü (mock)

### Faz V2 — Yerel model entegrasyonu
- [ ] Worker süreci
- [ ] Yüz tespiti + embedding
- [ ] Benzerlik skoru
- [ ] Geçici görüntü temizliği

### Faz V3 — Sonuç ve denetim
- [ ] Skor + kanıt kaydı
- [ ] UI sonuç kartları
- [ ] Silme ve denetim kaydı
- [ ] Kota ve maliyet koruması

### Faz V4 — Hosted sağlayıcı (opsiyonel)
- [ ] Veri işleme sözleşmesi
- [ ] Hosted model adaptörü
- [ ] Maliyet sayacı

## 9. Riskler

- **Yanlış pozitif:** Benzer yüzler yanlış eşleşebilir.
- **Yanlış negatif:** Düşük kaliteli fotoğraflar eşleşmeyebilir.
- **Gizlilik:** Biyometrik veri sızıntısı yüksek risklidir.
- **Maliyet:** Görüntü işleme pahalı olabilir.
- **Hukuki risk:** Rıza ve veri minimizasyonu zorunludur.

## 10. Kabul kriterleri

1. Kullanıcı rıza vermeden hiçbir görüntü işlenmez.
2. Referans fotoğraf şifreli saklanır.
3. Geçici profil fotoğrafları kalıcı saklanmaz.
4. Sonuçlar yalnızca skor + kanıt olarak döner.
5. Kullanıcı tek tıkla tüm görsel veriyi silebilir.
6. Tüm işlemler denetim kaydına yazılır.
7. `npm run typecheck`, `npm test`, `npm run build` temiz geçer.