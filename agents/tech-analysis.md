# Tecnologías Analizadas para el Proyecto XML Flatten

## Video-Chunk
- **Runtime**: Bun
- **Language**: TypeScript
- **CLI**: yargs
- **Server**: Express
- **Frontend**: Vue 3 + Bootstrap 5
- **Architecture**: Modular con cli.ts como entry point
- **Características**: CLI para procesar videos + Web server con panel admin opcional
- **Patrones**: 
  - Comando CLI para procesar archivos
  - Comando CLI para iniciar servidor
  - Flags para configurar puerto y habilitar frontend
  - Backend y frontend separados pero coordinados

## Atlauhtli
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **ORM**: Objection.js + Knex.js
- **Database**: MySQL/MariaDB (pero puede adaptarse a SQLite)
- **File Storage**: Cloudflare R2
- **Testing**: Jest (189 tests, 81.94% coverage)
- **Auto-Generation**: ADBA (models + routes)
- **Frontend**: React 18 + TypeScript 5 + Bootstrap 5 + SCSS
- **Arquitectura**: Monorepo con backend API REST y frontend React
- **Características**:
  - Sistema SEO dinámico con metadata automática
  - Sitemaps XML combinados
  - URLs amigables por slug
  - Sistema de caching de modelos
  - API REST completa con 8 controladores

## Prototype-Admin-Atlauhtli
- **Basado en**: Atlauhtli pero versión prototype
- **Tecnologías**: Similar a Atlauhtli pero con bun.lock indicando posible uso de Bun
- **Estructura**: Backend y frontend separados

## DBL-Utils (para flattening)
- Revisar si tiene utilidades para aplanar objetos JSON
- Buscar algoritmos de flattening que conviertan estructuras anidadas en pares clave-valor usando paths

## Conclusiones para el Nuevo Proyecto
Para el admin UI de XML flatten, deberíamos:
1. Usar Bun como runtime (como en video-chunk) para mejor performance
2. TypeScript para tipado fuerte
3. Express.js como servidor (probado y confiable)
4. SQLite como base de datos (ligera y adecuada para PoC)
5. Vue 3 + Bootstrap 5 para frontend (como en video-chunk, probado y funcional)
6. ADBA para generación automática de modelos y routes si es posible adaptarlo a SQLite
7. Algoritmo de flattening (probablemente de dbl-utils o implementación propia)
8. Tabulator.js para la tabla de datos (como solicitó el usuario)
9. Arquitectura modular con cli.ts como entry point para CLI y server modes
10. Frontend como single HTML con CDNs (como solicitó el usuario, aunque Vue 3 normalmente requiere build)

El enfoque será similar a video-chunk pero adaptado para:
- Procesar XML/JSON en lugar de videos
- Aplanar los datos usando algoritmo de flattening
- Almacenar en SQLite usando estructura de caminos dinámicos
- Mostrar resultados en tabla con Tabulator.js