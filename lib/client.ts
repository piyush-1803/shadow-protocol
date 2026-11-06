'use client';
import {create} from 'zustand';
import type {Snapshot,Fix} from './game/types';
export const useGame=create<{room:Snapshot|null;fix:Fix|null;setRoom:(r:Snapshot|null)=>void;setFix:(f:Fix|null)=>void}>(set=>({room:null,fix:null,setRoom:room=>set(state=>room&&state.room?.id===room.id&&state.room.revision>room.revision?state:{room}),setFix:fix=>set({fix})}));
export async function api(op:string,data:Record<string,unknown>={},read=false){const response=await fetch(read?`/api/game?${new URLSearchParams({op,...data as Record<string,string>})}`:'/api/game',{method:read?'GET':'POST',headers:read?{}:{'Content-Type':'application/json'},body:read?undefined:JSON.stringify({op,...data}),cache:'no-store',signal:AbortSignal.timeout(15000)});const result:any=await response.json();if(!response.ok)throw Error(result.error||'Connection failed');return result;}
