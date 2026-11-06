// Test adapter backed by REAL SQLite; not used or bundled in production.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function testDatabase(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
 const prepare=(sql:string)=>{let params:any[]=[];return {bind(...values:any[]){params=values;return this},async first(){return sqlite.prepare(sql).get(...params)||null},async all(){return {results:sqlite.prepare(sql).all(...params),success:true}},runSync(){const r=sqlite.prepare(sql).run(...params);return {success:true,meta:{changes:Number(r.changes)}}},async run(){return this.runSync()}}};
 const adapter={prepare,async batch(statements:any[]){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(statement.runSync());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 return adapter as unknown as D1Database;
}
