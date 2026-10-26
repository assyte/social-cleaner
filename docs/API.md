# Social Cleaner — API Sözleşmesi

Taban: `/api`. Tüm istek ve yanıtlar `application/json; charset=utf-8`.
Kimlik doğrulama: `sc_session` cookie (HttpOnly). Mutasyonlar ayrıca `x-csrf-token`
başlığı ve `sc_csrf` cookie'sinin eşleşmesini gerektirir.

## Genel kurallar

| Konu | Kural |
| --- | --- |
| Hata gövdesi | `{ "error": { "code": "...", "message": "...", "details": [...]? } }` |
| Doğrulama | zod; hata → `400 VALIDATION_ERROR`, `details` alan yolları |
| Kimlik doğrulama | Yok/geçersiz oturum → `401 UNAUTHENTICATED` |
| CSRF | Eksik/uyumsuz → `403 CSRF_FAILED` |
| Yetki | Kaynak başka kullanıcıya ait → `404 NOT_FOUND` (varlık sızdırılmaz) |
| Rate limit | `429 RATE_LIMITED` + `Retry-After` |
| Gövde boyutu | 64 KB üstü → `413 PAYLOAD_TOO_LARGE` |
| Idempotency | `POST` + `Idempotency-Key` (Faz 2'de kuyruk işlemleri için) |
| Sürümleme | Kırıcı değişiklikte `/api/v2`; v1 içinde alan eklemek kırıcı sayılmaz |
| Log | İstek gövdesi loglanmaz; hata izleri kullanıcıya gösterilmez |

### Durum kodları

`200` ok, `201` oluşturuldu, `204` gövdesiz, `400` doğrulama, `401` oturum,
`403` CSRF/permission, `404` bulunamadı, `409` çakışma (ör. e-posta kayıtlı),
`413` gövde çok büyük, `422` iş kuralı ihlali, `429` limit, `500` beklenmeyen hata,
`503` sağlayıcı yapılandırılmadı/erişilemiyor.

### Hata kodları

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `CSRF_FAILED`, `FORBIDDEN`, `NOT_FOUND`,
`EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `RATE_LIMITED`,
`CONSENT_REQUIRED`, `OWNERSHIP_NOT_DECLARED`, `PLAN_REQUIRED`, `QUOTA_EXCEEDED`,
`PLATFORM_LIMIT`, `INVALID_HANDLE`, `PROVIDER_NOT_CONFIGURED`, `PROVIDER_UNAVAILABLE`,
`INTERNAL_ERROR`.

---

## Kimlik doğrulama

### `POST /api/auth/register`
```json
{ "email": "user@example.com", "password": "min-12-karakter", "displayName": "Ada" }
```
`201` → oturum cookie'leri set edilir, profil + varsayılan `research_scope` oluşturulur.
`409 EMAIL_TAKEN` (kör indeks karşılaştırması). Parola en az 12 karakter; en yaygın
parola listesine karşı temel kontrol (Faz 1: uzunluk + tekrar + e-posta içerme).

### `POST /api/auth/login`
`{ "email": "...", "password": "..." }` → `200` + cookie. Hatalı girişte kimin var olduğunu
sızdırmamak için tek mesaj: `INVALID_CREDENTIALS`. 5 başarısız denemeden sonra 15 dk kilit
(`ACCOUNT_LOCKED`), ayrıca IP bazlı limit.

### `POST /api/auth/logout`
`204`; oturum `revoked_at` ile iptal edilir, cookie silinir.

### `GET /api/auth/session`
`200` `{ user: { id, emailMasked, displayName, plan }, csrfToken }` veya `401`.

---

## Derin Arama (Faz 2A)

Tüm arama uç noktaları oturum ister; mutasyonlar CSRF ister. Arama başlatmak için Identity
Vault'ta sahiplik beyanı zorunludur (`403 OWNERSHIP_NOT_DECLARED`).

### `GET /api/search/platforms`
Katalog, plan limitleri, günlük kullanım ve sağlayıcı durumu.

```json
{
  "platforms": [{ "id": "github", "name": "GitHub", "domain": "github.com",
                  "icon": "/brand/platforms/github.svg", "checkable": true,
                  "recommended": true }],
  "plan": { "id": "free", "fields": ["username"], "maxPlatformsPerRun": 8,
            "runsPerDay": 3, "visibleResults": 5, "historyRuns": 10 },
  "usage": { "usedToday": 1, "runsPerDay": 3, "remainingToday": 2 },
  "provider": { "configured": false, "name": "mock", "label": "Sağlayıcı yapılandırılmadı" }
}
```

### `POST /api/search`
```json
{ "fieldType": "username", "query": "torvalds",
  "platforms": ["github", "codeberg", "steam"] }
```

- `username`: `platforms` en az 1, plan limitine kadar. 115 katalog kaydı seçilebilir;
  doğrudan adaptörü olmayanlar sağlayıcı “bahis” veya manuel bağlantı olarak döner.
- `email|name|phone`: Pro plan + sağlayıcı anahtarı gerekir; `platforms` boş olabilir.
- `201` → çalışma özeti + plana göre kırpılmış sonuçlar:

```json
{
  "id": "srch_...", "fieldType": "username", "queryMasked": "torvalds",
  "status": "completed", "checkedCount": 3, "foundCount": 1, "hiddenCount": 0,
  "blockedCount": 1, "errorCount": 0, "visibleResults": 5,
  "results": [{
    "platformId": "github", "platformName": "GitHub",
    "profileUrl": "https://github.com/torvalds", "handle": "torvalds",
    "confidence": 92, "verification": "verified",
    "evidence": { "httpStatus": 200, "marker": "http_ok", "title": null }
  }],
  "outcomes": [{
    "platformId": "github", "status": "found", "method": "direct",
    "verification": "verified", "confidence": 92,
    "profileUrl": "https://github.com/torvalds"
  }, {
    "platformId": "steam", "status": "not_found", "method": "direct",
    "verification": "none", "confidence": 0,
    "profileUrl": "https://steamcommunity.com/id/torvalds"
  }]
}
```

`outcomes` her seçili platform için bir satır içerir: `found`, `not_found`, `blocked`,
`unsupported` veya `error`. `blocked`/`unsupported` “hesap yok” kanıtı değildir.

- `403 PLAN_REQUIRED`: ücretsiz planda kullanıcı adı dışı.
- `400 PLATFORM_LIMIT` / `INVALID_HANDLE`.
- `429 QUOTA_EXCEEDED`: günlük plan kotası.
- `503 PROVIDER_NOT_CONFIGURED`: ad/e-posta/telefon için anahtar yok; **sahte sonuç yok**.

> Ücretsiz planda `foundCount > visibleResults` ise fazla sonuçlar yanıta **konmaz**;
> yalnızca `hiddenCount` döner. İstemci tarafında gizleme güvenlik sayılmaz.

### `GET /api/search`
`200` `{ runs: [...], plan, usage }` — plan `historyRuns` limitine göre, yeniden eskiye.

### `GET /api/search/{id}`
`200` çalışma + görünür sonuçlar. Başka kullanıcının kaydı → `404`.

### `DELETE /api/search/{id}`
`204`; `search_results` cascade silinir, denetim kaydı yazılır.

---

## Identity Vault

### `GET /api/vault`
Tüm hazneyi döndürür. P2 alanlar maskeli; tam değer yalnızca `GET /api/account/export`'ta.

```json
{
  "profile": { "id": "prf_...", "version": 3, "ownerDeclared": true },
  "names":     [{ "id": "nam_...", "kind": "legal", "value": "Ada Yılmaz", "isPrimary": true }],
  "aliases":   [{ "id": "als_...", "handle": "adayilmaz", "origin": "user_provided",
                  "verification": "unverified", "platforms": ["github"] }],
  "contacts":  [{ "id": "cnt_...", "kind": "email", "valueMasked": "a***@gmail.com",
                  "consentSearch": false, "isPublic": false, "verification": "unverified" }],
  "links":     [{ "id": "lnk_...", "kind": "website", "url": "https://...", "label": "Blog" }],
  "scope":     { "mode": "read_only", "depth": "standard", "searchName": true,
                 "searchAliases": true, "searchContacts": false,
                 "maxQueries": 200, "maxDepth": 2, "maxCostCents": 0, "platforms": [] },
  "variants":  { "names": ["..."], "aliases": ["..."] }
}
```

### `POST /api/vault/names`
`{ "kind": "legal|former|nickname|transliteration", "value": "Ada Yılmaz", "isPrimary": true, "notes": null }`
→ `201`. Aynı değer ikinci kez → `409`.

### `DELETE /api/vault/names/{id}` → `204`

### `POST /api/vault/aliases`
`{ "handle": "adayilmaz", "platforms": ["github","forum"], "startPeriod": "2008", "endPeriod": "2012", "origin": "user_provided" }`
→ `201`. `origin=generated_variant` yalnızca kullanıcı "varyantı sorgu listesine ekle" derse.

### `PATCH /api/vault/aliases/{id}`
`{ "verification": "verified|unverified|rejected", "notes": "..." }` → `200`.

### `DELETE /api/vault/aliases/{id}` → `204`

### `POST /api/vault/contacts`
`{ "kind": "email|phone", "value": "...", "consentSearch": true, "isPublic": false }`
→ `201`. `consentSearch=true` verilmezse değer aramalarda kullanılmaz.
Telefon E.164'e normalize edilir; e-posta küçük harfe çevrilir.

### `DELETE /api/vault/contacts/{id}` → `204`

### `POST /api/vault/links`
`{ "url": "https://...", "kind": "profile|website|blog|forum|game|other", "label": "..." }`
→ `201`, `422 URL_NOT_ALLOWED` (şema/özel IP).

### `DELETE /api/vault/links/{id}` → `204`

### `PUT /api/vault/scope`
```json
{ "mode": "read_only", "depth": "deep", "searchName": true, "searchAliases": true,
  "searchContacts": false, "maxQueries": 150, "maxDepth": 3, "maxCostCents": 0,
  "platforms": ["github", "reddit"] }
```
`422 CONSENT_REQUIRED` eğer `searchContacts=true` ve onay kaydı yoksa.
`searchContacts=true` + onay → `consent_records` satırı yazılır.

### `POST /api/vault/ownership`
`{ "declared": true, "confirmation": "Bu profilin bana ait olduğunu beyan ediyorum" }`
→ `200`; `identity_profiles.owner_declared = 1`. Faz 2 araştırmasının ön koşulu.

### `GET /api/vault/variants`
Kalıcı olmayan öneri listesi: Türkçe katlama, ayraç ve sıra varyantları.
Her öğe `{ "value": "...", "reason": "turkish_fold|separator|order|transliteration" }`.
**Bunlar kanıt değildir.**

---

## Hesap ve denetim

### `GET /api/account/export`
`Content-Disposition: attachment`; tüm hazne + bulgular + risk + kaldırma geçmişi, P2 alanlar
**açık** (kullanıcı kendi verisini indiriyor). `audit_events` kaydı: `account.export`.

### `DELETE /api/account`
`{ "confirmation": "HESABIMI SİL", "password": "..." }` → `204`.
Parola + CSRF zorunlu; tüm satırlar cascade silinir, oturumlar iptal edilir.

### `GET /api/audit?limit=50&cursor=...`
`{ "events": [{ "id", "action", "entityType", "outcome", "createdAt", "meta" }], "nextCursor": null }`
Son 365 gün, en fazla 100 satır/sayfa.

---

## Faz 2+ (planlanan, henüz yok)

| Endpoint | Amaç |
| --- | --- |
| `POST /api/research` | Araştırma başlat (kapsam + derinlik + platform seçimi) |
| `GET /api/research/{id}` | Durum, ilerleme, maliyet, iptal bağlantısı |
| `POST /api/research/{id}/cancel` | İptal |
| `GET /api/findings` | Filtre: platform, risk, tür, tarih, güven, kaldırma durumu |
| `POST /api/findings/{id}/decision` | `confirm` \| `reject` \| `review` (kullanıcı kararı) |
| `GET /api/findings/{id}/evidence` | Kanıt listesi |
| `GET /api/graph` | Düğüm/kenar; `minScore` filtresi |
| `POST /api/remediation/drafts` | Taslak üret (kanal, gerekçe, ekler) |
| `POST /api/remediation/{id}/approve` | Açık onay + onay kaydı |
| `POST /api/remediation/{id}/submit` | Yalnızca resmî API destekliyorsa |
| `POST /api/remediation/{id}/verify` | Son kontrolü tetikle |
| `GET /api/reports/{id}.pdf` | Rapor dışa aktarımı |
| `GET /api/providers/health` | Sağlayıcı durumu (admin) |

## Örnek hata yanıtları

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Girdi doğrulanamadı",
  "details": [{ "path": "password", "message": "En az 12 karakter olmalı" }] } }
```
```json
{ "error": { "code": "CONSENT_REQUIRED",
  "message": "İletişim bilgileriyle arama için açık onay gerekir" } }
```

## Güvenlik notları

1. `GET /api/auth/session` dışında hiçbir uç nokta oturumsuz veri döndürmez.
2. Tüm mutasyonlar `assertSameOrigin` + CSRF doğrulamasından geçer; `GET` asla durum değiştirmez.
3. Hata yanıtları veritabanı, dosya yolu veya sağlayıcı anahtarı içermez.
4. `POST /api/auth/*` uç noktaları IP bazlı sıkı limite tabidir (10/dk, 30/saat kayıt).
5. Dışa aktarım ve hesap silme denetim kaydına yazılır; ikisi de parola ile doğrulanır
   (silme) veya oturum + CSRF ile sınırlandırılır (dışa aktarım).
