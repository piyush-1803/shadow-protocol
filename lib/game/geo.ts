import {distance,point,polygon,booleanPointInPolygon,circle,booleanWithin,booleanIntersects,kinks,destination} from '@turf/turf';
import type {Arena,Coord,Fix} from './types';
export const metres=(a:Coord,b:Coord)=>distance(point(a),point(b),{units:'meters'});
export const coord=(f:Fix):Coord=>[f.lng,f.lat];
export function confidence(a:number){return a<=10?'High':a<=25?'Medium':a<=50?'Low':'Unreliable'}
export function validCoord(c:unknown):c is Coord{return Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&Math.abs(c[0])<=180&&Math.abs(c[1])<=85}
export function validRing(r:Coord[]){return Array.isArray(r)&&r.length>=4&&r.length<=100&&r.every(validCoord)&&r[0][0]===r.at(-1)![0]&&r[0][1]===r.at(-1)![1]&&kinks(polygon([r])).features.length===0}
export function validateArena(a:Arena){
 if(!a||!validCoord(a.center)||!Number.isFinite(a.radius)||a.radius<100||a.radius>1000||a.approved!==true)throw Error('Choose and approve a 100–1000 m permitted arena.');
 if(!Array.isArray(a.boundary)||!Array.isArray(a.exclusions)||a.exclusions.length>10)throw Error('Invalid arena geometry.');
 if(a.boundary.length&&!validRing(a.boundary))throw Error('The permitted boundary must be a closed, non-crossing polygon.');
 if(a.exclusions.some(r=>!validRing(r)))throw Error('Invalid exclusion polygon.');
 if(a.boundary.length&&!booleanWithin(circle(a.center,a.radius,{units:'meters',steps:64}),polygon([a.boundary])))throw Error('The entire arena circle must fit within your permitted boundary.');
 if(a.exclusions.some(r=>booleanIntersects(circle(a.center,a.radius,{units:'meters',steps:64}),polygon([r]))))throw Error('Arena intersects an exclusion. Move or reduce the arena; shrinking cannot route around hazards.');
}
export function inside(a:Arena,c:Coord){return metres(a.center,c)<=a.radius&&(!a.boundary.length||booleanPointInPolygon(point(c),polygon([a.boundary])))&&!a.exclusions.some(r=>booleanPointInPolygon(point(c),polygon([r])))}
export function validateFix(input:any,now:number,old?:Fix):Fix{
 if(!input||!validCoord([input.lng,input.lat])||!Number.isFinite(input.accuracy)||input.accuracy<0||input.accuracy>10000||!Number.isFinite(input.timestamp))throw Error('Invalid GPS reading.');
 if(now-input.timestamp>15000||input.timestamp>now+5000)throw Error('GPS reading is stale or your device clock is incorrect.');
 if(old&&input.timestamp<=old.timestamp)throw Error('GPS timestamps must advance.');
 const fix:Fix={lng:input.lng,lat:input.lat,accuracy:Math.max(1,input.accuracy),timestamp:input.timestamp,receivedAt:now,speed:Number.isFinite(input.speed)&&input.speed>=0?input.speed:null,heading:Number.isFinite(input.heading)&&input.heading>=0&&input.heading<360?input.heading:null};
 if(old){const dt=Math.max(.1,(now-old.receivedAt)/1000);const travel=Math.max(0,metres(coord(old),coord(fix))-old.accuracy-fix.accuracy);if(travel/dt>12)fix.flag='Implausible movement; GPS jump or spoofing possible';}
 return fix;
}
export const fresh=(f:Fix|undefined,now:number):f is Fix=>!!f&&now-f.receivedAt<=15000&&f.accuracy<=50&&!f.flag;
export function smooth(old:Fix|undefined,next:Fix):Fix{if(!old||next.flag||metres(coord(old),coord(next))>Math.min(15,next.accuracy)||next.receivedAt-old.receivedAt>10000)return next;const weight=Math.max(.5,Math.min(.9,old.accuracy/(old.accuracy+next.accuracy)));return {...next,lng:old.lng+(next.lng-old.lng)*weight,lat:old.lat+(next.lat-old.lat)*weight};}
export function approximate(f:Fix,random:()=>number){const offset=20+random()*30;const c=destination(coord(f),offset,random()*360,{units:'meters'}).geometry.coordinates as Coord;return {center:c,radius:Math.ceil(offset+Math.max(30,f.accuracy))};}
