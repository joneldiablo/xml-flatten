import knex from 'knex';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'xml-flatten.db');

let db = knex({
  client: 'better-sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true
});

export function getDb() {
  return db;
}

export async function initializeTables() {
  const hasDocuments = await db.schema.hasTable('documents');
  if (!hasDocuments) {
    await db.schema.createTable('documents', (t) => {
      t.increments('id').primary();
      t.string('uuid').notNullable().unique();
      t.timestamp('created_at').defaultTo(db.fn.now());
    });
  }
  
  const hasFlattened = await db.schema.hasTable('flattened_data');
  if (!hasFlattened) {
    await db.schema.createTable('flattened_data', (t) => {
      t.increments('id').primary();
      t.string('document_uuid').notNullable().references('uuid').inTable('documents');
      t.string('path').notNullable();
      t.string('value');
      t.string('type');
    });
    
    await db.schema.alterTable('flattened_data', (t) => {
      t.index('document_uuid');
      t.index('path');
    });
  }
}

export async function resetDatabase() {
  await db('flattened_data').del();
  await db('documents').del();
}

export default db;