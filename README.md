# Audit sursă client — monday.com (Comenzi vs Solicitări)

Aplicație **Node.js + TypeScript**, headless, care rulează **lunar** (sau la cerere), citește două board-uri din **monday.com** prin **GraphQL**, detectează **erori de atribuire a sursei clientului**, generează un **raport Excel** și îl trimite pe **email**.

## Ce face (logica business)

1. Se calculează **luna calendaristică anterioară** în fusul configurat (`APP_TIMEZONE`).
2. Din board-ul **Comenzi / Curse** se iau itemii cu **Data Ctr.** (`deal_creation_date`) în acel interval (nu se folosește `created_at` ca regulă principală).
3. Se păstrează comenzile unde **Sursa Client** ≠ **`Website`** (label exact).
4. Se extrag **emailuri valide** din comenzi (prioritate: Email Semnare Client → Email Companie (lookup) → Email Contabilitate), cu normalizare (split `,` / `;`, trim, lowercase, dedup).
5. Comenzile **fără email valid** sunt ignorate.
6. Din board-ul **Solicitari** se iau solicitările cu **Sursa Client** = **`Website`** și email valid (Email Client, apoi Email Companie).
7. Dacă **oricare** email al comenzii se potrivește cu **oricare** email al solicitării → **caz suspect**.
8. Dacă există mai multe solicitări potrivite: se alege **cea mai veche** după **Data Creare** (`deal_creation_date`); dacă lipsește, fallback la `created_at` al itemului. În raport: **`matches_count`** = număr total de potriviri.

## Board-uri (implicit din `.env`)

| Rol | Board ID default |
|-----|------------------|
| Comenzi / Curse | `2030349838` |
| Solicitari | `1905911565` |

Mapping-ul coloanelor este în `src/monday/mappers/orders.mapper.ts` și `requests.mapper.ts`.

## Cerințe

- **Node.js ≥ 20**
- Token **monday.com** cu acces la cele două board-uri
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
| `ORDERS_BOARD_ID` / `REQUESTS_BOARD_ID` | ID-uri board |
| `APP_TIMEZONE` | Fus pentru lună anterioară și cron (ex. `Europe/Bucharest`) |
| `CRON_SCHEDULE` | Expresie cron (ex. `0 8 1 * *` = ziua 1, ora 8) |
| `SEND_EMPTY_REPORT` | `true` = trimite email și când nu sunt erori |
| `ATTACH_REPORT_ON_EMPTY` | `true` = atașează Excel și la rulări fără erori (doar dacă `SEND_EMPTY_REPORT=true`) |
| `REPORT_OUTPUT_DIR` | Director pentru fișiere `.xlsx` |
| `SMTP_*`, `MAIL_*` | Nodemailer / destinatari (`MAIL_TO` poate fi listă separată prin `,` sau `;`) |
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

Acoperă: normalizare email, interval lună anterioară, logica de matching (inclusiv alegerea celei mai vechi solicitări).

## Structură proiect

```
src/
  config/env.ts
  core/
  monday/
  domain/
  report/
  mail/
  jobs/monthlySourceAuditJob.ts
  app.ts
  main.ts
tests/
```

## Exemple de log-uri

La pornire (mod programat):

- `Scheduler starting` — cu `cron` și `tz`
- La tick: `Cron tick: running monthly source audit`

La o rulare:

- `Starting monthly source audit job` — interval și board-uri
- `Fetched orders page` / `Fetched requests page` — `debug`
- `Order items missing Data Ctr...` — `warn` dacă există
- `Matching complete` — obiect `stats`
- `Excel report written` — cale fișier
- `No matches and SEND_EMPTY_REPORT=false; skipping email` sau `Email sent successfully`

Erori API monday: până la **3 încercări** cu backoff la `429` / `5xx`.

## Limitări V1 (acceptate)

- **Fără conversie valutară**: `Profit EUR` doar dacă moneda comenzii este exact **`EUR`** (din label-ul coloanei „Moneda Cursa” — best-effort pe textul returnat de API).
- **Formula / lookup / board_relation**: valorile afișate vin în principal din câmpul GraphQL **`text`** al `column_values` (comportament monday). Dacă monday nu populează `text` pentru o coloană, poți vedea valori goale sau ID-uri în raport — documentat aici ca **best-effort**.
- Fără DB, UI, webhooks, istoric deduplicat între rulări, upload cloud.

## Schimbarea destinatarilor / programării

- **Email**: `MAIL_TO`, `MAIL_CC`, `MAIL_BCC` în `.env` (liste separate prin virgulă sau punct și virgulă).
- **Cron**: `CRON_SCHEDULE` + `APP_TIMEZONE` (folosit de `node-cron`).

## Securitate

- Nu comite **`.env`** (este în `.gitignore`).
- Rotiți tokenul monday dacă este expus.

## Licență

Proiect privat — folosiți intern conform politicii organizației.
