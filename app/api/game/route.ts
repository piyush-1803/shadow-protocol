import {env} from 'cloudflare:workers';
import {createHandler} from '../../../lib/game/server';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>createHandler(env.DB!)(request);
export const POST=GET;
