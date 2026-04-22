import { XMLParser } from 'fast-xml-parser';
import { flatten, serialize } from '../utils/flatten.js';
import { v4 as uuidv4 } from 'uuid';
import { getDb, run, queryAll, saveDb } from '../db/database.js';

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTagValue: true,
  trim: true,
};

export interface ProcessResult {
  uuid: string;
  document: Record<string, unknown>;
  flattened: Record<string, unknown>;
  serialized: Array<{ path: string; value: string; type: string }>;
}

export async function processXml(xmlString: string): Promise<ProcessResult> {
  const xmlParser = new XMLParser(parserOptions);
  const jsonObj = xmlParser.parse(xmlString);
  
  const flatJson = flatten(jsonObj, { delimiter: '.' });
  
  const serializedData = await serialize(flatJson, {
    groupKey: 'document_uuid',
  });
  
  const docUuid = uuidv4();
  
  run('INSERT INTO documents (uuid) VALUES (?)', [docUuid]);
  
  for (const item of serializedData) {
    run(
      'INSERT INTO flattened_data (document_uuid, path, value, type) VALUES (?, ?, ?, ?)',
      [docUuid, item.path, String(item.value), item.type]
    );
  }
  
  return {
    uuid: docUuid,
    document: jsonObj,
    flattened: flatJson,
    serialized: serializedData.map(s => ({ path: s.path, value: String(s.value), type: s.type })),
  };
}

export interface DataQuery {
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  orderBy?: Record<string, string>;
  q?: string;
}

export function getAllData(query: DataQuery = {}) {
  let sql = `
    SELECT 
      fd.document_uuid as uuid,
      fd.path,
      fd.value,
      fd.type,
      d.created_at as created
    FROM flattened_data fd
    JOIN documents d ON d.uuid = fd.document_uuid
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (value === undefined || value === null) continue;
      
      const col = key.includes('.') ? key : `fd.${key}`;
      
      if (typeof value === 'object' && value !== null) {
        for (const [op, val] of Object.entries(value as Record<string, any>)) {
          switch (op) {
            case '$eq':
              conditions.push(`${col} = ?`);
              params.push(val);
              break;
            case '$ne':
              conditions.push(`${col} != ?`);
              params.push(val);
              break;
            case '$gt':
              conditions.push(`${col} > ?`);
              params.push(val);
              break;
            case '$gte':
              conditions.push(`${col} >= ?`);
              params.push(val);
              break;
            case '$lt':
              conditions.push(`${col} < ?`);
              params.push(val);
              break;
            case '$lte':
              conditions.push(`${col} <= ?`);
              params.push(val);
              break;
            case '$like':
              conditions.push(`${col} LIKE ?`);
              params.push(`%${val}%`);
              break;
            case '$in':
              if (Array.isArray(val)) {
                conditions.push(`${col} IN (${val.map(() => '?').join(',')})`);
                params.push(...val);
              }
              break;
          }
        }
      } else {
        conditions.push(`${col} = ?`);
        params.push(value);
      }
    }
  }
  
  if (query.q) {
    conditions.push(`(fd.path LIKE ? OR fd.value LIKE ? OR fd.document_uuid LIKE ? OR d.uuid LIKE ?)`);
    params.push(`%${query.q}%`, `%${query.q}%`, `%${query.q}%`, `%${query.q}%`);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  const orderParts: string[] = [];
  if (query.orderBy) {
    for (const [col, dir] of Object.entries(query.orderBy)) {
      const orderCol = col.includes('.') || col === 'created' || col === 'uuid' ? col : `fd.${col}`;
      orderParts.push(`${orderCol} ${dir.toUpperCase()}`);
    }
  }
  if (orderParts.length > 0) {
    sql += ' ORDER BY ' + orderParts.join(', ');
  } else {
    sql += ' ORDER BY d.created_at DESC, fd.id';
  }
  
  const limit = query.limit || 50;
  const page = query.page || 0;
  sql += ` LIMIT ${limit} OFFSET ${page * limit}`;
  
  return queryAll(sql, params);
}

export function getDocuments() {
  return queryAll(`
    SELECT uuid, created_at as created FROM documents ORDER BY created_at DESC
  `);
}

export function getDocumentByUuid(uuid: string) {
  return queryAll(`
    SELECT path, value, type 
    FROM flattened_data 
    WHERE document_uuid = ?
    ORDER BY id
  `, [uuid]);
}