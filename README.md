# Audit sursă client — monday.com (Comenzi vs Solicitări)

Aplicație **Node.js + TypeScript**, headless, care rulează **lunar** (sau la cerere), citește board-ul de **comenzi** și **două board-uri de solicitări** din **monday.com** prin **GraphQL**, detectează **erori de atribuire a sursei clientului**, generează un **raport Excel** și îl trimite pe **email**.

## Ce face (logica business)

1. Se calculează **luna calendaristică anterioară** în fusul configurat (`APP_TIMEZONE`).
2. Din board-ul **Comenzi / Curse** se iau itemii cu **Data Ctr.** (`deal_creation_date`) în acel interval (nu se folosește `created_at` ca regulă principală).
3. Se păstrează comenzile unde **Sursa Client** ≠ **`Website`** (label exact).
4. Se extrag **emailuri valide** din comenzi (prioritate: Email Semnare Client → Email Companie (lookup) → Email Contabilitate), cu normalizare (split `,` / `;`, trim, lowercase, dedup).
5. Comenzile **fără email valid** sunt ignorate.
6. Din board-urile **Solicitari** și **Solicitari 2** se iau solicitările cu **Sursa Client** = **`Website`** și email valid. Listele sunt **combinate**; matching-ul rulează pe **reuniunea** candidaților din ambele board-uri.
7. Dacă **oricare** email al comenzii se potrivește cu **oricare** email al unei solicitări → **caz suspect**.
8. Dacă există mai multe solicitări potrivite (în unul sau în ambele board-uri): se alege **cea mai veche** după data de creare (coloana de dată configurată pe board); dacă lipsește, fallback la `created_at` al itemului. **`matches_count`** = numărul **total** de potriviri din **ambele** board-uri.
9. În Excel, fiecare rând indică clar **din ce board** provine solicitarea selectată (**Request Board Name** / **Request Board ID**) și, opțional agregat, **All Matched Request Boards** (nume distincte sortate, separate prin `; `).

## Board-uri (implicit din `.env`)

| Rol | Board ID default |
|-----|------------------|
| Comenzi / Curse | `2030349838` |
| Solicitari | `1905911565` |
| Solicitari 2 | `5092436128` |

Mapping coloane comenzi: `src/monday/mappers/orders.mapper.ts`.  
Mapping coloane solicitări: `src/monday/mappers/requestBoardDefinitions.ts` + `unifiedRequest.mapper.ts` (model unificat `UnifiedRequestRow`).

**Solicitari 2:** nu există coloană dedicată clară pentru „Nr solicitare”; în raport, **Nr Solicitare** folosește **ID-ul intern monday** al itemului dacă nu există alt identificator user-friendly.

## Cerințe

- **Node.js ≥ 20**
- Token **monday.com** cu acces la **toate** board-urile folosite
- Server **SMTP** pentru trimiterea emailurilor

## Setup

```bash
npm install
cp .env.example .env
# editează .env — în special MONDAY_API_TOKEN, SMTP_*, MAIL_*
```

## Variabile de mediu

| Variabilă | Rol |
|-----------|-----|
| `MONDAY_API_TOKEN` | Token API monday |
| `MONDAY_API_URL` | Default `https://api.monday.com/v2` |
| `MONDAY_API_VERSION` | Header `API-Version` (ex. `2025-01`) |
| `ORDERS_BOARD_ID` | Board comenzi |
| `REQUESTS_BOARD_ID` | Board **Solicitari** |
| `REQUESTS2_BOARD_ID` | Board **Solicitari 2** |
| `APP_TIMEZONE` | Fus pentru lună anterioară și cron (ex. `Europe/Bucharest`) |
| `CRON_SCHEDULE` | Expresie cron (ex. `0 8 1 * *` = ziua 1, ora 8) |
| `SEND_EMPTY_REPORT` | `true` = trimite email și când nu sunt erori |
| `ATTACH_REPORT_ON_EMPTY` | `true` = atașează Excel și la rulări fără erori (doar dacă `SEND_EMPTY_REPORT=true`) |
| `REPORT_OUTPUT_DIR` | Director pentru fișiere `.xlsx` |
| `MAIL_TO` | Unul sau **mai mulți** destinatari, separați prin **`,`** sau **`;`** (spațiile sunt ignorate la margini) |
| `SMTP_*`, `MAIL_CC`, `MAIL_BCC` | Nodemailer |
| `LOG_LEVEL` | `pino`: `info`, `debug`, etc. |

## Build

```bash
npm run build
```

Ieșire în `dist/`.

## Rulare

**Mod programat (cron + proces lung):**

```bash
npm run start
```

**Rulare manuală o singură dată:**

```bash
npm run audit:once
```

În development (fără build):

```bash
npm run dev
npm run audit:once   # echivalent: tsx src/main.ts --once
```

## Teste

```bash
npm test
```

Acoperă: normalizare email, destinatari `MAIL_TO`, interval lună anterioară, matching (inclusiv **cross-board** și statistici pe board-uri), agregare solicitări Website.

## Structură proiect

```
src/
  config/env.ts
  domain/requests/     # UnifiedRequestRow, statistici Website per board
  monday/mappers/      # requestBoardDefinitions, unifiedRequest.mapper
  monday/repositories/ # paginateBoardItems, RequestsBoardRepository
  report/
  mail/
  jobs/monthlySourceAuditJob.ts
  app.ts
  main.ts
tests/
```

## Raport Excel

- **Erori:** include **Request Board Name**, **Request Board ID**, **All Matched Request Boards**, plus coloanele anterioare (inclusiv **Nr Solicitare** — pentru Solicitari 2 de regulă **item id** monday).
- **Summary:** `total_website_requests_board_1`, `total_website_requests_board_2`, `total_website_requests_considered` (= suma candidaților Website cu email din ambele board-uri).

## Exemple de log-uri

La pornire (mod programat):

- `Scheduler starting` — cu `cron` și `tz`
- La tick: `Cron tick: running monthly source audit`

La o rulare:

- `Starting monthly source audit job` — interval, `requestsBoard1`, `requestsBoard2`
- `Fetched board page` — `debug` (comenzi + fiecare board de solicitări)
- `Order items missing Data Ctr...` — `warn` dacă există
- `Matching complete` — obiect `stats`
- `Excel report written` — cale fișier
- `No matches and SEND_EMPTY_REPORT=false; skipping email` sau `Email sent successfully` (cu lista de destinatari în log)

Erori API monday: până la **3 încercări** cu backoff la `429` / `5xx`.

## Limitări V1 (acceptate)

- **Fără conversie valutară**: `Profit EUR` doar dacă moneda comenzii este exact **`EUR`** (din label-ul coloanei „Moneda Cursa” — best-effort pe textul returnat de API).
- **Formula / lookup / board_relation**: valorile afișate vin în principal din câmpul GraphQL **`text`** al `column_values` (comportament monday). Dacă monday nu populează `text` pentru o coloană, poți vedea valori goale sau ID-uri în raport — documentat aici ca **best-effort**.
- Fără DB, UI, webhooks, istoric deduplicat între rulări, upload cloud.

## Schimbarea destinatarilor / programării

- **Email**: `MAIL_TO` poate fi de forma `a@x.com, b@y.com` sau cu `;`. La fel `MAIL_CC` / `MAIL_BCC`.
- **Cron**: `CRON_SCHEDULE` + `APP_TIMEZONE` (folosit de `node-cron`).

## Securitate

- Nu comite **`.env`** (este în `.gitignore`).
- Rotiți tokenul monday dacă este expus.

## Licență

Proiect privat — folosiți intern conform politicii organizației.
