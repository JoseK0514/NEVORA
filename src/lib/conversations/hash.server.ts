import 'server-only';
import {createHash} from 'node:crypto';
import type {ConversationCommand} from './types';
export const hashCommand=(c:ConversationCommand)=>createHash('sha256').update(JSON.stringify(c)).digest('hex');
