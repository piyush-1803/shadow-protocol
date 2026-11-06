import {fresh,coord,inside,metres,approximate} from './geo';
import type {Game,Fix,Player,Snapshot} from './types';
export const random=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296};
export function player(id:string,name:string):Player{return {id,name,ready:false,role:null,status:'active',ghostUntil:0,abilityAt:0,lastTag:0,exposure:0,outsideSince:null,flags:0}}
export function note(g:Game,now:number,text:string){g.events=[{at:now,text},...g.events].slice(0,30)}
export function zoneRadius(g:Pick<Game,'zone'>,now:number){const z=g.zone;return z.end<=z.start?z.to:z.from+(z.to-z.from)*Math.min(1,Math.max(0,(now-z.start)/(z.end-z.start)))}
export function finish(g:Game,winner:Game['winner'],now:number){g.winner=winner;g.phase='results';g.radar=[];g.tags.forEach(t=>{if(t.status==='pending')t.status='expired'});note(g,now,winner==='aborted'?'Match ended safely.':`${winner==='hunters'?'Hunters':'Shadows'} win.`)}
export function advance(g:Game,fixes:Record<string,Fix>,now:number){
 g.radar=g.radar.filter(s=>s.expiresAt>now);g.tags.forEach(t=>{if(t.status==='pending'&&now-t.createdAt>30000)t.status='expired'});
 if(['lobby','paused','results'].includes(g.phase))return;
 if(!g.players.some(p=>p.role==='shadow'&&p.status==='active'))return finish(g,'hunters',now);
 if(!g.players.some(p=>p.role==='hunter'&&p.status==='active'))return finish(g,'shadows',now);
 if(now>=g.endsAt)return finish(g,'shadows',now);
 const huntStart=g.startedAt+g.settings.headStart*1000;
 if(now<huntStart)return;
 const elapsed=now-huntStart;g.phase=now>=g.endsAt-120000?'final':elapsed>=g.settings.shrinkInterval*1000?'collapse':'hunt';
 if(now>=g.nextRadar){g.radar=g.players.filter(p=>p.status==='active'&&p.ghostUntil<=now&&fresh(fixes[p.id],now)).map(p=>({id:crypto.randomUUID(),...approximate(fixes[p.id],random),kind:'signal',expiresAt:now+12000}));g.nextRadar=now+(g.phase==='final'?Math.max(30,g.settings.radarInterval/2):g.settings.radarInterval)*1000;note(g,now,'Radar pulse • approximate signals available for 12 seconds.');}
 const due=Math.floor(elapsed/(g.settings.shrinkInterval*1000));
 if(due>g.zone.step&&g.zoneApproved&&now>=g.zone.end){const from=zoneRadius(g,now);g.zone={from,to:Math.max(40,from*.72),start:now,end:now+60000,step:due};g.zoneApproved=false;note(g,now,'Approved zone collapse started. Walk calmly; pause if a route is unsafe.');}
 const dt=Math.min(5,Math.max(0,(now-g.lastTick)/1000));
 g.players.forEach(p=>{const f=fixes[p.id];if(p.status!=='active'||!fresh(f,now)){p.outsideSince=null;return}if(metres(g.arena.center,coord(f))-f.accuracy>zoneRadius(g,now)){p.outsideSince??=now;p.exposure+=dt}else{p.outsideSince=null}});g.lastTick=now;
 // Exposure is informational: uncertain geography never automatically eliminates a player.
}
export function act(g:Game,id:string,action:string,input:any,fixes:Record<string,Fix>,now:number){
 const p=g.players.find(p=>p.id===id);if(!p||p.status==='left')throw Error('You are not an active room member.');
 const host=()=>{if(g.hostId!==id)throw Error('Only the host can do that.');};
 const active=()=>{if(!['hunt','collapse','final'].includes(g.phase)||p.status!=='active')throw Error('This action requires an active hunt.');};
 if(action==='ready'){if(typeof input.ready!=='boolean')throw Error('Ready must be true or false.');if(g.phase!=='lobby')throw Error('Match already started.');if(input.ready&&(!fresh(fixes[id],now)||!inside(g.arena,coord(fixes[id]))))throw Error('A fresh GPS fix within the approved arena is required.');p.ready=!!input.ready;}
 else if(action==='start'){host();if(g.phase!=='lobby')throw Error('Already started.');const ps=g.players.filter(p=>p.status==='active');if(ps.length<2||ps.length<=g.settings.hunters||ps.some(p=>!p.ready||!fresh(fixes[p.id],now)||!inside(g.arena,coord(fixes[p.id]))))throw Error('All players must be ready with reliable GPS inside the arena.');const shuffled=[...ps];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}shuffled.forEach((p,i)=>p.role=i<g.settings.hunters?'hunter':'shadow');g.startedAt=now;g.endsAt=now+(g.settings.duration+g.settings.headStart)*1000;g.nextRadar=now+(g.settings.headStart+g.settings.radarInterval)*1000;g.phase=g.settings.headStart?'headstart':'hunt';g.lastTick=now;note(g,now,'Roles assigned. Shadows deploy; hunters wait for the head start.');}
 else if(action==='pause'){if(['lobby','paused','results'].includes(g.phase))throw Error('No active match to pause.');g.previousPhase=g.phase;g.phase='paused';g.pausedAt=now;g.radar=[];g.tags.forEach(t=>{if(t.status==='pending')t.status='expired'});note(g,now,`${p.name} paused the match for safety.`);}
 else if(action==='resume'){host();if(g.phase!=='paused')throw Error('Match is not paused.');const d=now-g.pausedAt;g.startedAt+=d;g.endsAt+=d;g.nextRadar+=d;g.zone.start+=d;g.zone.end+=d;g.lastTick=now;g.phase=g.previousPhase||'hunt';note(g,now,'Host resumed the match.');}
 else if(action==='approveZone'){host();active();g.zoneApproved=true;note(g,now,'Host approved the next concentric zone and walking access.');}
 else if(action==='end'){host();finish(g,'aborted',now);}
 else if(action==='leave'){p.status='left';p.ready=false;g.radar=[];if(g.hostId===id)finish(g,'aborted',now);else advance(g,fixes,now);}
 else if(action==='ability'){active();if(!g.settings.abilities||now<p.abilityAt)throw Error('Ability unavailable or cooling down.');if(!fresh(fixes[id],now))throw Error('Fresh GPS required.');p.abilityAt=now+180000;if(p.role==='shadow'){p.ghostUntil=now+30000;note(g,now,'A Shadow activated Ghost mode.');}else{g.nextRadar=now;advance(g,fixes,now);note(g,now,'Hunter scan activated.');}}
 else if(action==='tag'){active();if(p.role!=='hunter')throw Error('Only Hunters request tags.');if(now-p.lastTag<10000)throw Error('Wait 10 seconds between tag requests.');const target=g.players.find(x=>x.id===input.target);if(!target||target.role!=='shadow'||target.status!=='active')throw Error('Invalid target.');const a=fixes[id],b=fixes[target.id];if(!fresh(a,now)||!fresh(b,now))throw Error('Both players need fresh GPS with reported accuracy ≤50 m.');if(metres(coord(a),coord(b))>g.settings.tagDistance+a.accuracy+b.accuracy)throw Error('No plausible proximity.');if(g.tags.some(t=>t.shadow===target.id&&t.status==='pending'))throw Error('Target already has a pending request.');p.lastTag=now;g.tags.unshift({id:crypto.randomUUID(),hunter:id,shadow:target.id,createdAt:now,status:'pending'});g.tags=g.tags.slice(0,100);}
 else if(action==='respondTag'){active();if(typeof input.confirm!=='boolean')throw Error('Confirmation must be true or false.');const t=g.tags.find(t=>t.id===input.tag);if(!t||t.shadow!==id||t.status!=='pending'||now-t.createdAt>30000)throw Error('Tag request expired or not yours.');if(input.confirm){t.status='confirmed';p.status='tagged';g.radar=[];note(g,now,`${p.name} confirmed a digital tag.`);advance(g,fixes,now);}else{t.status='disputed';note(g,now,'A tag was disputed. No elimination applied.');}}
 else if(action==='dismissTag'){host();const t=g.tags.find(t=>t.id===input.tag);if(!t||t.status!=='disputed')throw Error('No open dispute.');t.status='dismissed';note(g,now,'Host dismissed a disputed tag.');}
 else throw Error('Unknown action.');
}
export function publicSnapshot(g:Game,id:string,fixes:Record<string,Fix>,presence:Snapshot['presence'],now:number,revision:number):Snapshot{
 const {processed,...safe}=structuredClone(g);safe.tags=safe.tags.filter(t=>t.hunter===id||t.shadow===id||g.hostId===id);if(g.phase==='lobby')safe.players.forEach(p=>p.role=null);
 // This is the only serializer: never attach the location dictionary to a response.
 return {...safe,me:id,serverTime:now,revision,presence,ownFix:fixes[id]||null};
}
