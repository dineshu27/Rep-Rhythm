'use client';
import { useMemo,useSyncExternalStore } from 'react';
import { z } from 'zod';
import { chatDraftSchema,receiptSchema } from './chat-tracking';
export const chatMessageSchema=z.object({id:z.string().max(100),role:z.enum(['user','assistant']),text:z.string().max(2000),sourceText:z.string().max(2000).optional(),draft:chatDraftSchema.optional(),receipt:receiptSchema.optional(),undone:z.boolean().optional(),replaced:z.boolean().optional()});
export type JournalMessage=z.infer<typeof chatMessageSchema>;
const historySchema=z.array(chatMessageSchema).max(24);let raw:string|null=null;let loaded=false;const listeners=new Set<()=>void>();const key='fitai-journal-chat-v1';
function snapshot(){if(!loaded&&typeof window!=='undefined'){try{const saved=sessionStorage.getItem(key);if(saved){historySchema.parse(JSON.parse(saved));raw=saved;}}catch{}loaded=true;}return raw;}
function subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);}
export function setChatMessages(update:JournalMessage[]|((messages:JournalMessage[])=>JournalMessage[])) {const current=snapshot();let messages:JournalMessage[]=[];try{messages=current?historySchema.parse(JSON.parse(current)):[];}catch{}const next=historySchema.parse((typeof update==='function'?update(messages):update).slice(-24));raw=JSON.stringify(next);try{sessionStorage.setItem(key,raw);}catch{}listeners.forEach(listener=>listener());}
export function useChatMessages(){const value=useSyncExternalStore(subscribe,snapshot,()=>null);return useMemo(()=>{try{return value?historySchema.parse(JSON.parse(value)):[];}catch{return [];}},[value]);}
