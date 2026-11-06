/** DEVELOPMENT ONLY: synthetic GPS against an isolated, real in-memory SQLite database. Never production. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../lib/game/server';
import {testDatabase} from './sqlite-adapter';
const handler=createHandler(testDatabase());
const dispatch=(url:string,init:RequestInit)=>handler(new Request(url,init));
const origin=process.env.SHADOW_TEST_ORIGIN||'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Synthetic GPS tests may only use loopback development servers.');
class Actor{cookie='';id='';async request(op:string,data:Record<string,unknown>={},read=false){const res=await dispatch(read?`${origin}/api/game?${new URLSearchParams({op,...data as Record<string,string>})}`:`${origin}/api/game`,{method:read?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:this.cookie},body:read?undefined:JSON.stringify({op,...data})});const cookie=res.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];return {status:res.status,data:await res.json() as any}}async ok(op:string,data:Record<string,unknown>={},read=false){const r=await this.request(op,data,read);assert.equal(r.status,200,JSON.stringify(r.data));return r.data}async session(name:string){this.id=(await this.ok('session',{name})).id}async action(roomId:string,action:string,data={}){return this.ok('action',{roomId,action,requestId:crypto.randomUUID(),...data})}}
const arena={center:[75.9345,11.3215],radius:300,boundary:[],exclusions:[],approved:true};
const sample=()=>({lng:75.9345,lat:11.3215,accuracy:5,timestamp:Date.now(),speed:0,heading:null});
test('real SQLite request/response flow: guest identity, rooms, permissions, privacy, roles, tags, replay, results',async()=>{
 const host=new Actor(),guest=new Actor(),stranger=new Actor();await host.session('DEV TEST HOST');await guest.session('DEV TEST GUEST');await stranger.session('DEV TEST OUTSIDER');
 assert.equal((await new Actor().request('create',{})).status,401);
 const {roomId}=await host.ok('create',{name:'DEV TEST ONLY',arena,settings:{headStart:0}});
 const lobby=await host.ok('state',{roomId},true);assert.equal(lobby.players.length,1);assert.equal(lobby.phase,'lobby');
 assert.equal((await stranger.request('state',{roomId},true)).status,403);
 const badJoin=await stranger.request('join',{code:'ZZZZZZZZ'});assert.equal(badJoin.status,400);
 assert.equal((await guest.ok('join',{code:lobby.code})).roomId,roomId);
 const denied=await guest.request('action',{roomId,action:'start',requestId:crypto.randomUUID()});assert.equal(denied.status,400);assert.match(denied.data.error,/host/i);
 assert.equal((await host.request('location',{roomId,fix:sample()})).status,400,'must explicitly start sharing');
 for(const actor of [host,guest]){await actor.ok('share',{roomId});await actor.ok('location',{roomId,fix:sample()});await actor.action(roomId,'ready',{ready:true})}
 const ready=await host.ok('state',{roomId},true);assert.equal(ready.players.length,2);assert.ok(ready.players.every((p:any)=>p.ready));assert.ok(ready.ownFix);assert.equal(ready.presence[guest.id].accuracy,null);assert.equal(Object.keys(ready).filter(k=>/locations|fixes/i.test(k)).length,0);
 const start=await host.action(roomId,'start');assert.equal(start.players.filter((p:any)=>p.role==='hunter').length,1);assert.equal(start.phase,'hunt');
 const hunter=start.players.find((p:any)=>p.role==='hunter').id===host.id?host:guest;const shadow=hunter===host?guest:host;
 const key=crypto.randomUUID();const tagged=await hunter.ok('action',{roomId,action:'tag',target:shadow.id,requestId:key});assert.equal(tagged.tags[0].status,'pending');const replay=await hunter.ok('action',{roomId,action:'tag',target:shadow.id,requestId:key});assert.equal(replay.tags.length,1);
 const result=await shadow.action(roomId,'respondTag',{tag:tagged.tags[0].id,confirm:true});assert.equal(result.winner,'hunters');assert.equal(result.phase,'results');assert.equal(result.ownFix,null);
 const recover=await host.ok('state',{roomId},true);assert.equal(recover.winner,'hunters');assert.equal(recover.ownFix,null);assert.equal((await host.request('location',{roomId,fix:sample()})).status,400);
});
test('emergency stop revokes upload and clears own location; CSRF rejects foreign origins',async()=>{
 const a=new Actor();await a.session('DEV TEST STOP');const {roomId}=await a.ok('create',{name:'DEV STOP ONLY',arena});await a.ok('share',{roomId});await a.ok('location',{roomId,fix:sample()});await a.ok('stop',{roomId});const state=await a.ok('state',{roomId},true);assert.equal(state.ownFix,null);assert.equal(state.presence[a.id].sharing,false);assert.equal((await a.request('location',{roomId,fix:sample()})).status,400);const res=await dispatch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.invalid',Cookie:a.cookie},body:JSON.stringify({op:'share',roomId})});assert.equal(res.status,403);await a.action(roomId,'leave');
});
test('concurrent joins do not overfill room and concurrent ready changes survive',async()=>{
 const a=new Actor(),b=new Actor(),c=new Actor();await a.session('DEV RACE HOST');await b.session('DEV RACE B');await c.session('DEV RACE C');const {roomId}=await a.ok('create',{name:'DEV RACE ONLY',arena,settings:{maxPlayers:2}});const s=await a.ok('state',{roomId},true);const joined=await Promise.all([b.request('join',{code:s.code}),c.request('join',{code:s.code})]);assert.equal(joined.filter(r=>r.status===200).length,1);const member=joined[0].status===200?b:c;const group=[a,member];for(const actor of group){await actor.ok('share',{roomId});await actor.ok('location',{roomId,fix:sample()})}await Promise.all(group.map(actor=>actor.action(roomId,'ready',{ready:true})));const final=await a.ok('state',{roomId},true);assert.equal(final.players.length,2);assert.ok(final.players.every((p:any)=>p.ready));await a.action(roomId,'leave');
});
test('expiry cleanup removes sensitive samples and expired identities after relational rooms expire',async()=>{
 const {cleanup}=await import('../lib/game/cleanup');const db=testDatabase(),now=Date.now();await db.prepare('INSERT INTO sessions(id,token_hash,name,expires_at) VALUES(?,?,?,?)').bind('expired','hash','DEV EXPIRY',now-1).run();await db.prepare('INSERT INTO rooms(id,code,host_id,state,expires_at) VALUES(?,?,?,?,?)').bind('expired-room','EXPIRY22','expired','{}',now-1).run();await db.prepare('INSERT INTO room_members(room_id,player_id,joined_at) VALUES(?,?,?)').bind('expired-room','expired',now-1000).run();await db.prepare('INSERT INTO player_locations(room_id,player_id,data,expires_at) VALUES(?,?,?,?)').bind('expired-room','expired',JSON.stringify(sample()),now-1).run();await cleanup(db,now);assert.equal(await db.prepare('SELECT * FROM player_locations').first(),null);assert.equal(await db.prepare('SELECT * FROM rooms').first(),null);assert.equal(await db.prepare('SELECT * FROM sessions').first(),null);
});
