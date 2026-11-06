// Standalone Cloudflare deployment only. IDs are not credentials; Wrangler manages login.
import {readFileSync,writeFileSync} from 'node:fs';
const flag=process.argv.indexOf('--database-id');const id=flag>=0?process.argv[flag+1]:'';
if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(id))throw Error('Pass --database-id followed by your real Cloudflare D1 UUID.');
const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
config.name='shadow-protocol';config.d1_databases=[{binding:'DB',database_name:'shadow-protocol',database_id:id}];config.triggers={crons:['* * * * *']};
writeFileSync('dist/server/wrangler.deploy.json',JSON.stringify(config,null,2)+'\n');
console.log('Standalone config written; minute-based expiry cleanup enabled. Review before deployment.');
