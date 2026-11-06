// DEVELOPMENT ONLY. Offline simulation; never writes to a real game service.
import {act,advance,player} from '../lib/game/engine';
import {defaults,type Game,type Fix} from '../lib/game/types';
const now=Date.now();
const g:Game={id:'DEV-SIM',name:'OFFLINE SIMULATION',code:'DEV-ONLY',hostId:'h',arena:{center:[0,0],radius:300,boundary:[],exclusions:[],approved:true},settings:{...defaults,headStart:0},players:[player('h','Simulated Hunter'),player('s','Simulated Shadow')],phase:'hunt',startedAt:now,endsAt:now+600000,pausedAt:0,lastTick:now,nextRadar:now,radar:[],tags:[],zone:{from:300,to:300,start:now,end:now,step:0},zoneApproved:false,winner:null,events:[],processed:[]};g.players[0].role='hunter';g.players[1].role='shadow';
const f:Fix={lng:0,lat:0,accuracy:6,timestamp:now,receivedAt:now,speed:0,heading:null};const fixes={h:f,s:{...f,lng:.00002}};
console.log('DEVELOPMENT-ONLY OFFLINE GPS SIMULATION — no real players, no network.');
advance(g,fixes,now);console.log('Pulse uncertainty radii:',g.radar.map(s=>s.radius));
act(g,'h','tag',{target:'s'},fixes,now);console.log('Tag pending; shadow active:',g.players[1].status);
act(g,'s','respondTag',{tag:g.tags[0].id,confirm:true},fixes,now+1000);console.log('After explicit confirmation:',g.phase,g.winner);
