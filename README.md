# XML Flatten Admin

API REST para procesar archivos XML CFDI (Comprobantes Fiscales Digitales por Internet), convertirlos a JSON, aplanarlos (flatten) y almacenarlos en SQLite con interfaz administrativa web.

Diseñado para extraer y consultar datos de facturas electrónicas SAT CFDI 3.3 y 4.0.

## Características

- **Procesa XML individuales** o en batch via ZIP (hasta 500 por batch)
- **Extrae datos** de CFDI y los aplanana en pares path/value
- **Almacena en SQLite** local usando Knex.js
- **Interfaz administrativa web** con Vue 3 + Tabulator
- **API REST completa** con filtros, búsqueda, paginación y ordenamiento
- **Genera facturas CFDI falsas** para pruebas

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
git clone <repo-url>
cd xml-flatten
npm install
```

## Inicio Rápido

```bash
# Iniciar servidor con interfaz web
npm run cli -- server --frontend

# Abrir en navegador
# http://localhost:3000
```

## Configuración

### Variables de Entorno y Parámetros CLI

Las variables de entorno funcionan tanto como environment variables como parámetros CLI (usando yargs). El CLI toma los valores de `process.env` por defecto, pero pueden sobrescribirse con flags.

| Variable | Parámetro CLI | Tipo | Default | Descripción |
|----------|--------------|------|---------|-------------|
| `PORT` | `-p, --port` | number | `3000` | Puerto del servidor HTTP |
| `ENABLE_FRONTEND` | `-f, --frontend` | boolean | `false` | Habilita la interfaz web en `/` |
| `DB_PATH` | `--db-path` | string | `./data/xml-flatten.db` | Ruta al archivo SQLite |
| `PATH_UUID` | `--path-uuid` | string | _(ninguno)_ | Ruta JSON para extraer UUID del XML |
| `BATCH_SIZE` | `--batch-size` | number | `500` | Tamaño del batch para procesamiento ZIP |

> **Nota:** Los parámetros CLI tienen precedencia sobre las variables de entorno. Si defines `PORT=8080` y `--port 3000`, se usará 3000.

### Ejemplo con variables de entorno

```bash
PORT=3022 \
PATH_UUID="cfdi.Comprobante.cfdi.Complemento.tfd.TimbreFiscalDigital.@_UUID" \
BATCH_SIZE=500 \
ENABLE_FRONTEND=true \
npm run cli -- server
```

### Ejemplo con parámetros CLI

```bash
npm run cli -- server -p 3022 --frontend --path-uuid "cfdi.Comprobante.cfdi.Complemento.tfd.TimbreFiscalDigital.@_UUID" --batch-size 500
```

### Ver ayuda del CLI

```bash
npm run cli -- server --help
```

### PATH_UUID para CFDI SAT

Para extraer el UUID de facturas CFDI SAT, usa:

```bash
PATH_UUID="cfdi.Comprobante.cfdi.Complemento.tfd.TimbreFiscalDigital.@_UUID" npm run cli -- server --frontend
```

## CLI

```bash
# Servidor básico
npm run cli -- server

# Servidor con frontend
npm run cli -- server --frontend

# Puerto custom
npm run cli -- server -p 8080

# Con variables de entorno
ENABLE_FRONTEND=true npm run cli -- server

# Generar facturas falsas para pruebas
npm run cli -- generate -n 100 -o ./data/test.zip

# Generar y subir directamente
npm run cli -- server --frontend && # luego subir ZIP desde la UI
```

## API REST

### Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/` | Lista de tablas disponibles |
| `GET` | `/api/flattened-data` | Consulta datos aplanados |
| `GET` | `/api/flattened-data/meta` | Estructura de la tabla |
| `POST` | `/api/process` | Procesa un XML individual |
| `POST` | `/api/upload-zip` | Sube ZIP con múltiples XML |
| `POST` | `/api/generate` | Genera facturas falsas |
| `POST` | `/api/truncate` | Vacía la base de datos |
| `GET` | `/api/documents` | Lista documentos |
| `GET` | `/api/documents/:uuid` | Detalle de documento |

### Parámetros de Consulta

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `limit` | int | Registros por página (default: 20) | `?limit=50` |
| `page` | int | Número de página (0-indexed) | `?page=2` |
| `q` | string | Búsqueda global en path y value | `?q=emisor` |
| `orderBy.columna` | string | Ordenar por columna y dirección | `?orderBy.path=asc` |
| `filters.columna` | string | Filtrar por columna (contains) | `?filters.path=receptor` |

### Ejemplos con curl

```bash
# Consultar datos aplanados
curl "http://localhost:3000/api/flattened-data"

# Con límite y paginación
curl "http://localhost:3000/api/flattened-data?limit=20&page=0"

# Filtrar por path que contenga "receptor"
curl "http://localhost:3000/api/flattened-data?filters.path=receptor"

# Ordenar por path descendente
curl "http://localhost:3000/api/flattened-data?orderBy.path=desc"

# Búsqueda global
curl "http://localhost:3000/api/flattened-data?q=ELEKTRA"

# Combinación de parámetros
curl "http://localhost:3000/api/flattened-data?limit=50&page=0&filters.path=Emisor&orderBy.value=desc"

# Ver estructura de la tabla
curl "http://localhost:3000/api/flattened-data/meta"
```

### Formato de Respuesta

```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 0,
  "description": "ok",
  "total": 4300,
  "data": [
    {
      "id": 537,
      "document_uuid": "FF3A28B7-533D-4716-8947-F9003783B356",
      "path": "cfdi:Comprobante.cfdi:Emisor.@_Nombre",
      "value": "ELEKTRA, S.A. DE C.V.",
      "type": "string"
    }
  ],
  "limit": "50",
  "offset": 0,
  "page": 0,
  "requestId": "uuid"
}
```

### Estructura de `/meta`

```json
{
  "success": true,
  "data": {
    "tableName": "flattened_data",
    "columns": {
      "id": { "name": "id", "type": "integer" },
      "document_uuid": { "name": "document_uuid", "type": "string", "required": true },
      "path": { "name": "path", "type": "string", "required": true },
      "value": { "name": "value", "type": "string" },
      "type": { "name": "type", "type": "string" }
    }
  }
}
```

## Uso desde JavaScript

```javascript
// Fetch API
const response = await fetch('http://localhost:3000/api/flattened-data?limit=50&page=0');
const result = await response.json();
console.log(result.data);
console.log(`Total: ${result.total} registros`);

// Filtrar y ordenar
const filtered = await fetch('http://localhost:3000/api/flattened-data?filters.path=Emisor&orderBy.value=desc&limit=100');
```

## Interfaz Web

Cuando `ENABLE_FRONTEND=true`, la interfaz está disponible en `/`:

### Funciones

- **Selector de tabla** y vista de datos
- **Filtros interactivos**: búsqueda global, paginación, ordenamiento, filtros por columna
- **Tabla de datos** con scroll, número de renglón y ordenamiento
- **Panel JSON** que muestra la respuesta cruda de la API
- **Subir ZIP** con múltiples XML
- **Generar facturas** falsas para pruebas
- **Vaciar base de datos** con confirmación

## Base de Datos

### Tablas

#### documents

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Auto-increment, primary key |
| uuid | TEXT | UUID único del documento XML |
| created_at | TIMESTAMP | Fecha de creación |

#### flattened_data

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | Auto-increment, primary key |
| document_uuid | TEXT | FK a documents.uuid |
| path | TEXT | Ruta aplanada del campo XML |
| value | TEXT | Valor del campo |
| type | TEXT | Tipo de dato (string, number, etc.) |

## Estructura del Proyecto

```
xml-flatten/
├── backend/
│   └── src/
│       ├── index.ts           # Entry point + Express app
│       ├── routes/
│       │   └── api.ts         # Endpoints REST custom
│       ├── services/
│       │   └── XmlService.ts  # Procesamiento de XML
│       ├── db/
│       │   └── database.ts    # Tablas SQLite
│       └── tools/
│           └── generate.ts    # Generador de CFDI falsas
├── frontend/
│   └── public/
│       └── index.html         # SPA admin (Vue 3 + Tabulator)
├── data/                      # Directorio para SQLite
├── cli.ts                     # CLI con yargs
└── package.json
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Iniciar en modo desarrollo
npm run dev

# Con frontend habilitado
ENABLE_FRONTEND=true npm run dev
```

## Docker

### Build

```bash
docker build -t xml-flatten .
```

### Run

```bash
# Básico
docker run -d -p 3022:3000 -v $(pwd)/data:/app/data xml-flatten

# Con configuración CFDI
docker run -d -p 3022:3000 \
  -e PORT=3000 \
  -e PATH_UUID="cfdi.Comprobante.cfdi.Complemento.tfd.TimbreFiscalDigital.@_UUID" \
  -e ENABLE_FRONTEND=true \
  -v $(pwd)/data:/app/data \
  xml-flatten
```

## Licencia

MIT