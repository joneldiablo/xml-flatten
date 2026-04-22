# XML Flatten - Project Plan

## Overview
Admin UI to process XML strings → JSON → Flatten → SQLite → Tabulator.js display

## Tech Stack
| Component | Technology | Source |
|-----------|-----------|--------|
| Runtime | Bun (with sql.js for SQLite) | Testing showed better-sqlite3 not supported in Bun |
| Language | TypeScript 5+ | dbl-utils, adba |
| Server | Express.js | atlauhtli, video-chunk |
| DB | sql.js (SQLite in-memory/file) | Needed Bun compatibility |
| Flattening | dbl-utils (flat.ts) | dbl-utils |
| Frontend | Vue 3 + Bootstrap 5 (CDN) | video-chunk |
| Table | Tabulator.js (CDN) | (CDN) |
| CLI | yargs | video-chunk |

## Project Structure

```
xml-flatten/
├── cli.ts                    # Entry point (like video-chunk/cli.ts)
├── package.json
├── tsconfig.json
├── .env
├── backend/
│   ├── src/
│   │   ├── index.ts         # Express server setup (like atlauhtli)
│   │   ├── cli.ts          # CLI commands (like atlauhtli/backend/src/cli.ts)
│   │   ├── services/
│   │   │   └── XmlService.ts    # XML→JSON→Flatten logic
│   │   ├── db/
│   │   │   └── database.ts     # SQLite connection
│   │   └── routes/
│   │       └── api.ts          # Express routes
│   └── dist/
├── frontend/
│   ├── public/
│   │   └── index.html        # Single HTML admin UI
│   └── src/
│       └── app.ts             # Vue 3 app (CDN)
└── agents/
    └── tasks.md
```

## Workflow

1. **Input**: User enters XML string in textarea
2. **Parse XML→JSON**: Use fast-xml-parser or xml2js
3. **Flatten**: Use dbl-utils `flatten()` function with delimiter "."
4. **Store**: Insert into SQLite (path, value, type, uuid columns)
5. **Display**: Tabulator.js table fetching from API

## Database Schema

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flattened_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_uuid TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  type TEXT,
  FOREIGN KEY (document_uuid) REFERENCES documents(uuid)
);
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/process | Process XML → JSON → Flatten → Store |
| GET | /api/documents | List all documents |
| GET | /api/documents/:uuid | Get single document flattened |
| GET | /api/data | Get all flattened data (for Tabulator) |

## Flattening Algorithm (dbl-utils)

```typescript
import { flatten } from 'dbl-utils';

const flatJson = flatten(xmlAsJson, { delimiter: '.' });
// { "factura.impuestos.traslados.0.importe": 160.00 }
```

## Tasks

### Phase 1: Setup
- [ ] Create package.json with dependencies
- [ ] Setup TypeScript configuration
- [ ] Create cli.ts entry point
- [ ] Setup Express server

### Phase 2: Backend
- [ ] Implement XmlService (XML→JSON→Flatten)
- [ ] Setup SQLite with adba
- [ ] Create API routes
- [ ] Test full workflow

### Phase 3: Frontend
- [ ] Create single HTML with Vue 3 CDN
- [ ] Add Bootstrap 5 CDN
- [ ] Add Tabulator.js CDN
- [ ] Implement form for XML input
- [ ] Implement JSON preview
- [ ] Implement table display
- [ ] Connect to API

## Key Findings

### From video-chunk
- cli.ts pattern: yargs with commands 'process' and 'server'
- Frontend as Vue 3 with Vite build
- Express server serves frontend on / route

### From atlauhtli
- Backend structure: src/controllers, src/services, src/routes
- ADBA pattern for model generation
- Frontend controllers pattern with app-ctrl.ts

### From dbl-utils (CRITICAL)
- `flatten(object, { delimiter: '.' })` - flattens nested objects
- `unflatten(object, '.')` - reconstructs nested objects
- `serialize()` - converts to path/value/type entries with uuid
- `deserialize()` - reconstructs from entries

### From adba
- generateSQLiteModels() - generates Objection.js models from SQLite schema
- Express router integration
- Knex.js for queries

## Dependencies to Install

```json
{
  "dependencies": {
    "express": "^4.x",
    "better-sqlite3": "^11.x",
    "knex": "^3.x",
    "objection": "^3.x",
    "dbl-utils": "file:../dbl-utils",
    "adba": "file:../adba",
    "fast-xml-parser": "^4.x",
    "yargs": "^17.x",
    "vue": "^3.x",
    "bootstrap": "^5.x",
    "tabulator-tables": "^5.x"
  }
}
```

## CLI Commands

```bash
# Start server only
bun run cli.ts server --port 3000

# Process XML from file
bun run cli.ts process -i invoice.xml

# Start with frontend
bun run cli.ts server --port 3000 --frontend true
```

## Notes

- Use single HTML with CDN imports for Vue 3
- Tabulator.js can fetch data from /api/data endpoint
- Flattened data stored with uuid grouping for reconstruction
- dbl-utils handles flattening
- SQLite file stored in data/ directory using sql.js (Bun-compatible)
- Tested and working end-to-end

## Status: COMPLETE ✅

All phases completed successfully:
- XML input → JSON parsing (fast-xml-parser)
- JSON flattening (dbl-utils flatten)
- SQLite storage (sql.js)
- Admin UI with Tabulator.js