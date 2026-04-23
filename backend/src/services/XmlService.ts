import { XMLParser } from 'fast-xml-parser';
import { flatten, serialize } from '../utils/flatten.js';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database.js';

const db = getDb();

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTagValue: true,
  trim: true,
};

const PATH_UUID = (process.env.PATH_UUID || '').replace(/:/g, '\\:');

export interface ProcessResult {
  uuid: string;
  document: Record<string, unknown>;
  flattened: Record<string, unknown>;
  serialized: Array<{ path: string; value: string; type: string }>;
}

function extractUuidFromDocument(flatJson: Record<string, unknown>): string | null {
  if (!PATH_UUID) return null;
  const value = flatJson[PATH_UUID];
  if (typeof value === 'string' && value) return value;
  return null;
}

export async function processXml(xmlString: string): Promise<ProcessResult> {
  const xmlParser = new XMLParser(parserOptions);
  const jsonObj = xmlParser.parse(xmlString);
  
  const flatJson = flatten(jsonObj, { delimiter: '.' });
  
  const docUuid = extractUuidFromDocument(flatJson) || uuidv4();
  
  await db('documents').insert({ uuid: docUuid });
  
  const serializedData = await serialize(flatJson, {
    groupKey: 'document_uuid',
  });
  
  for (const item of serializedData) {
    await db('flattened_data').insert({
      document_uuid: docUuid,
      path: item.path,
      value: String(item.value),
      type: item.type
    });
  }
  
  return {
    uuid: docUuid,
    document: jsonObj,
    flattened: flatJson,
    serialized: serializedData.map(s => ({ path: s.path, value: String(s.value), type: s.type })),
  };
}

export async function processXmlBatch(xmlStrings: string[]): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];
  for (const xml of xmlStrings) {
    const result = await processXml(xml);
    results.push(result);
  }
  return results;
}

export interface DataQuery {
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  orderBy?: Record<string, string>;
  q?: string;
}

export function getAllData(query: DataQuery = {}) {
  let q = db('flattened_data as fd')
    .join('documents as d', 'd.uuid', 'fd.document_uuid')
    .select(
      'fd.document_uuid as uuid',
      'fd.path',
      'fd.value',
      'fd.type',
      'd.created_at as created'
    );
  
  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (value === undefined || value === null || value === '') continue;
      
      let col = key;
      if (key === 'uuid') col = 'fd.document_uuid';
      else if (!key.includes('.')) col = `fd.${key}`;
      
      if (typeof value === 'object' && value !== null) {
        for (const [op, val] of Object.entries(value as Record<string, any>)) {
          switch (op) {
            case '$eq': q = q.where(col, val); break;
            case '$ne': q = q.where(col, '!=', val); break;
            case '$gt': q = q.where(col, '>', val); break;
            case '$gte': q = q.where(col, '>=', val); break;
            case '$lt': q = q.where(col, '<', val); break;
            case '$lte': q = q.where(col, '<=', val); break;
            case '$like': q = q.where(col, 'like', `%${val}%`); break;
            case '$in':
              if (Array.isArray(val)) q = q.whereIn(col, val);
              break;
          }
        }
      } else {
        const valStr = String(value);
        if (!isNaN(Number(valStr))) {
          q = q.where(col, Number(valStr));
        } else {
          q = q.where(col, 'like', `%${valStr}%`);
        }
      }
    }
  }
  
  if (query.q) {
    q = q.where(function() {
      this.where('fd.path', 'like', `%${query.q}%`)
        .orWhere('fd.value', 'like', `%${query.q}%`)
        .orWhere('fd.document_uuid', 'like', `%${query.q}%`)
        .orWhere('d.uuid', 'like', `%${query.q}%`);
    });
  }
  
  if (query.orderBy) {
    for (const [col, dir] of Object.entries(query.orderBy)) {
      let orderCol = col;
      if (col === 'uuid') orderCol = 'fd.document_uuid';
      else if (!col.includes('.')) orderCol = `fd.${col}`;
      q = q.orderBy(orderCol, dir);
    }
  } else {
    q = q.orderBy('d.created_at', 'desc').orderBy('fd.id');
  }
  
  const limit = query.limit || 50;
  const page = query.page || 0;
  q = q.limit(limit).offset(page * limit);
  
  return q;
}

export function getDocuments() {
  return db('documents').select('uuid', 'created_at as created').orderBy('created_at', 'desc');
}

export function getDocumentByUuid(uuid: string) {
  return db('flattened_data').where('document_uuid', uuid).select('path', 'value', 'type').orderBy('id');
}