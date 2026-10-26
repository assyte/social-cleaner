# Social Cleaner — Veri Modeli

Tüm kimlikler uygulama tarafında üretilen, önekli 128-bit rastgele değerlerdir (`usr_`, `prf_`,
`als_` …). Tahmin edilemez olmaları yetkilendirmenin bir katmanıdır; asıl kontrol `user_id`
filtresidir.

Zaman damgaları `INTEGER` (Unix ms) tutulur — SQLite/Postgres taşınabilirliği için.
JSON alanları `TEXT` içinde saklanır ve uygulama katmanında zod ile doğrulanır.

## Sınıflandırma

| Etiket | Anlam | Örnek |
| --- | --- | --- |
| `P0` | Herkese açık, kullanıcı beyanı | platform adı, URL |
| `P1` | Tanımlayıcı | kullanıcı adı (rumuz) |
| `P2` | Hassas kişisel veri → **şifreli** | ad-soyad, e-posta, telefon, notlar |
| `P3` | Gizli anahtar → **asla DB'ye yazılmaz** | parola, token, çerez |

**Şifreleme biçimi:** `v1:<iv_b64>:<tag_b64>:<ct_b64>` (AES-256-GCM, 12-byte IV, alan adı AAD
olarak kullanılır → alanlar arası kopyalama saldırısı tespit edilir).
**Kör indeks:** `bidx_v1:<hmac_sha256_b64url>` (HMAC anahtarı ana şifreleme anahtarından
HKDF ile türetilir). Aynı değer her zaman aynı indeksi verir; indeksten değer geri elde edilemez.

Rumuzlar (`identity_aliases.handle`) **P1** olarak düz metin saklanır: eşleştirme motorunun
tam eşleşme sorgusu buna dayanır ve rumuz zaten kamusal bir tanımlayıcıdır. Yine de erişim
kontrolü, log maskeleme ve raporlarda kısaltma uygulanır. Ad, e-posta, telefon ve serbest
metin notları P2'dir ve şifrelenir.

## Faz 1 tabloları (uygulandı — `migration 0001`)

### users
| Alan | Tip | Not |
| --- | --- | --- |
| id | TEXT PK | `usr_…` |
| email_enc | TEXT | P2, AAD `users.email` |
| email_bidx | TEXT UNIQUE | P2 türevi, giriş/tekillik için |
| password_hash | TEXT | `scrypt$N$r$p$salt$hash` (P3 türev) |
| display_name_enc | TEXT NULL | P2 |
| role | TEXT | `user` \| `admin` |
| status | TEXT | `active` \| `suspended` |
| plan | TEXT | `free` \| `pro` (migration 0002) |
| plan_renews_at | INTEGER NULL | abonelik dönem sonu (ödeme entegrasyonu bekliyor) |
| failed_login_count / locked_until | INTEGER | kaba kuvvet yavaşlatma |
| created_at / updated_at | INTEGER | |

### sessions
| Alan | Tip | Not |
| --- | --- | --- |
| id | TEXT PK | `ses_…` |
| user_id | TEXT FK → users ON DELETE CASCADE | |
| token_hash | TEXT UNIQUE | SHA-256(token); token yalnızca cookie'de |
| csrf_hash | TEXT | double-submit doğrulaması |
| ip_hash / user_agent_hash | TEXT NULL | SHA-256; IP düz metin saklanmaz |
| created_at / last_seen_at / expires_at / revoked_at | INTEGER | 7 gün mutlak ömür |

### identity_profiles
`id`, `user_id` (UNIQUE, FK), `version`, `owner_declared` (0/1), `owner_declared_at`,
`created_at`, `updated_at`.
`owner_declared = 0` iken arama başlatılamaz (`403 OWNERSHIP_NOT_DECLARED`).

### identity_names
`id`, `profile_id` (FK), `kind` (`legal` \| `former` \| `nickname` \| `transliteration`),
`value_enc`, `value_bidx`, `is_primary`, `verification`, `notes_enc`, `created_at`.
`UNIQUE(profile_id, value_bidx)` → aynı ad iki kez eklenemez.

### identity_aliases
`id`, `profile_id`, `handle` (P1), `handle_normalized`, `origin`
(`user_provided` \| `generated_variant`), `platforms_json`, `start_period`, `end_period`,
`verification` (`verified`\|`unverified`\|`rejected`), `notes_enc`, `created_at`, `updated_at`.
`UNIQUE(profile_id, handle_normalized, origin)`.
**Kural:** `generated_variant` kayıtları hiçbir zaman tek başına bulgu/eşleşme kanıtı sayılmaz.

### identity_contacts
`id`, `profile_id`, `kind` (`email`\|`phone`), `value_enc`, `value_bidx`,
`consent_search` (0/1), `is_public` (0/1), `verification`, `created_at`.
`UNIQUE(profile_id, kind, value_bidx)`.
**Kural:** `consent_search = 0` ise değer hiçbir arama sorgusuna eklenmez.
E-posta maskeli gösterilir (`a***@gmail.com`), tam değer yalnızca kullanıcı isteğiyle dışa aktarımda.

### identity_links
`id`, `profile_id`, `kind` (`profile`\|`website`\|`blog`\|`forum`\|`game`\|`other`),
`url`, `label`, `verification`, `created_at`. `UNIQUE(profile_id, url)`.
URL'ler `assertUrlAllowed` ile doğrulanır (Faz 1'de yalnızca biçim + özel IP reddi).

### research_scopes
`id`, `profile_id` (UNIQUE), `mode` (`read_only`\|`remediation_enabled`),
`depth` (`quick`\|`standard`\|`deep`), `platforms_json`, `search_name`, `search_aliases`,
`search_contacts`, `max_queries`, `max_cost_cents`, `max_depth`, `created_at`, `updated_at`.
Varsayılan: `read_only`, `standard`, 200 sorgu, 0 maliyet (ücretsiz sağlayıcı).

### consent_records
`id`, `user_id`, `scope` (`ownership_declaration` \| `contacts_search` \|
`automated_removal` \| `monitoring`), `granted`, `policy_version`, `created_at`, `revoked_at`.
Onay geri alınabilir; her geri alma yeni satırdır (tarihsel kayıt korunur).

### audit_events
`id`, `user_id` NULL, `actor_type` (`user`\|`system`\|`worker`), `action`, `entity_type`,
`entity_id`, `outcome` (`success`\|`denied`\|`failure`), `meta_json`, `ip_hash`, `created_at`.
`meta_json` beyaz listeli alanlardan oluşur: `field`, `count`, `provider`, `reason`.
Serbest metin, e-posta, ad, URL sorgu parametresi **yazılmaz**.

## Faz 2A tabloları (uygulandı — `migration 0002`)

### search_runs
| Alan | Tip | Not |
| --- | --- | --- |
| id | TEXT PK | `srch_…` |
| user_id | TEXT FK → users CASCADE | |
| field_type | TEXT | `username` \| `email` \| `name` \| `phone` |
| query_enc | TEXT | P2, AAD `search_runs.query` |
| query_masked | TEXT | kullanıcı adı için okunabilir; diğerleri maskeli |
| status | TEXT | `running` \| `completed` \| `failed` |
| platform_ids_json | TEXT | seçilen platform kimlikleri |
| checked_count / found_count / hidden_count | INTEGER | plan kırpma ve şeffaflık |
| blocked_count / error_count | INTEGER | "engellendi" ≠ "yok" |
| error_code | TEXT NULL | başarısız tarama nedeni |
| created_at / finished_at | INTEGER | |

### search_results
| Alan | Tip | Not |
| --- | --- | --- |
| id | TEXT PK | `srs_…` |
| run_id | TEXT FK → search_runs CASCADE | |
| platform_id / platform_name | TEXT | katalogdan |
| profile_url | TEXT | gerçek herkese açık URL |
| handle | TEXT | kullanıcı adı veya maskeli sorgu |
| confidence | INTEGER | 0–100, yöntem bazlı |
| verification | TEXT | `verified` \| `mention` |
| evidence_json | TEXT | HTTP durumu, işaret, başlık, zaman; **sayfa gövdesi yok** |
| created_at | INTEGER | |

`UNIQUE(run_id, platform_id)` → aynı platform bir taramada bir kez. Plan limiti üstü
sonuçlar veritabanında kalır (kullanıcı yükseltirse görünür) fakat ücretsiz API yanıtına
**konmaz**.

## Faz 2B–5 tabloları (tasarım — henüz oluşturulmadı)

| Tablo | Amaç | Öne çıkan alanlar | Saklama |
| --- | --- | --- | --- |
| `sources` | Platform kataloğu | `domain`, `category`, `search_method`, `profile_url_rule`, `access_status`, `last_checked_at`, `constraints`, `removal_url`, `automation_scope` | Kalıcı |
| `search_queries` | Üretilen her sorgu | `profile_id`, `job_id`, `query`, `query_hash`, `provider`, `rationale`, `derived_from_finding_id`, `status` | 1 yıl |
| `research_jobs` | İş kuyruğu | `type`, `payload_json`, `state`, `attempts`, `max_attempts`, `run_after`, `locked_at`, `lease_until`, `last_error`, `cost_cents` | 90 gün |
| `findings` | Bulgular | `canonical_url_hash`, `source_domain`, `url`, `kind`, `title`, `snippet`, `first_seen_at`, `last_verified_at`, `match_class`, `match_score`, `verification_status`, `removal_status` | Kullanıcı silene kadar |
| `evidence` | Kanıt | `finding_id`, `captured_at`, `method`, `content_hash`, `excerpt_enc`, `screenshot_path`, `provider` | 90 gün ham / kalıcı özet |
| `identity_relationships` | Grafik kenarları | `from_node`, `to_node`, `relation`, `score`, `signals_json`, `decided_by`, `created_at` | Kalıcı |
| `risk_assessments` | Risk | `finding_id`, `dimension`, `score`, `level`, `answers_json`, `rationale`, `model_version` | Kalıcı |
| `removal_requests` | Kaldırma | `finding_id`, `channel`, `draft_enc`, `state`, `consent_id`, `submitted_at`, `response_at`, `proof_enc` | 3 yıl |
| `verification_checks` | Son kontrol | `finding_id`/`removal_id`, `checked_at`, `result`, `http_status`, `indexed` | 2 yıl |
| `monitor_schedules` | İzleme | `profile_id`, `interval_days`, `next_run_at`, `enabled`, `last_result` | Kullanıcı silene kadar |
| `provider_usage` | Maliyet | `provider`, `day`, `calls`, `tokens`, `cost_cents` | 1 yıl |

**Tekilleştirme:** `findings.canonical_url_hash` (normalize edilmiş URL'nin SHA-256'sı) +
`evidence.content_hash`. Aynı URL tekildir; farklı domainlerdeki kopyalar ayrı bulgu kalır ve
`duplicate_of` ile gruplanır.

**Grafik modeli:** düğümler `identity_profiles`, `identity_aliases`, `findings`, `sources`,
`domains`; kenarlar `identity_relationships`. Başlangıçta ilişkisel; graph DB yalnızca
ölçümler gerektirirse (ADR-005).

## Saklama ve silme politikası

| Veri | Süre | Silme yöntemi |
| --- | --- | --- |
| Profil + hazne | Kullanıcı silene kadar | Kullanıcı talebi → tek transaction |
| Oturumlar | 7 gün | Süre dolumu + her girişte temizlik |
| Denetim kaydı | 365 gün | Zamanlanmış temizlik |
| Arama çalışmaları (`search_runs`) | Ücretsiz 7 gün / Pro 90 gün | Plan bazlı süpürücü (Faz 2B) |
| Arama sonuçları/kanıt | Tarama ile birlikte | `ON DELETE CASCADE` |
| Ham sağlayıcı yanıtı | 90 gün | Zamanlanmış temizlik |
| Kanıt ekran görüntüsü | 90 gün (özet kalıcı) | Dosya + kayıt silme |
| Kaldırma talepleri | 3 yıl veya kullanıcı silimi | Kullanıcı siliminde birlikte |
| Yedekler | 7 gün döngüsel | Otomatik |

**Kullanıcı silme:** `users` satırı silinir; FK `ON DELETE CASCADE` tüm profil, oturum ve
bulgu verisini götürür. Denetim kayıtlarındaki `user_id` bağı da silinir; kişisel veri
içermeyen toplam sayaçlar (varsa) anonim kalır. Yedeklerdeki kopya en fazla 7 gün içinde
döngüden çıkar — bu süre arayüzde açıkça yazılır.

## Şifreleme anahtarı yönetimi

- `SC_MASTER_KEY` (32 byte, base64) yalnızca sunucu ortamında; repoya, istemciye, loga yazılmaz.
- Alan şifreleme anahtarı: `HKDF(master, info="sc.field.v1")`; kör indeks anahtarı:
  `HKDF(master, info="sc.bidx.v1")` — aynı anahtar iki amaçta kullanılmaz.
- Zarf sürümü (`v1:`) sayesinde anahtar rotasyonu: yeni anahtarla yeniden şifreleme göçü,
  eski sürümü okuyabilen geçiş penceresi. v1'de rotasyon aracı yok — Faz 6.
- Anahtar kaybı = şifreli alanların kaybı. Bu, `docs/THREAT-MODEL.md` T4'te kabul edilen risktir.
