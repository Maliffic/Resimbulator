// src/lib/ui/url-state.ts
import { deflateRaw, inflateRaw } from 'pako';
import type { Item } from '$lib/recombinator/index.js';

export type UrlState = {
  item1: Item | null;
  item2: Item | null;
};

export function encodeStateToUrl(state: UrlState): string {
  const json = JSON.stringify(state);
  const deflated = deflateRaw(json);
  return base64UrlEncode(deflated);
}

export function decodeStateFromUrl(encoded: string): UrlState {
  const bytes = base64UrlDecode(encoded);
  const inflated = inflateRaw(bytes, { to: 'string' });
  const parsed = JSON.parse(inflated) as UrlState;
  return { item1: parsed.item1 ?? null, item2: parsed.item2 ?? null };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = (typeof btoa !== 'undefined' ? btoa : nodeBtoa)(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = (typeof atob !== 'undefined' ? atob : nodeAtob)(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function nodeBtoa(s: string): string {
  return Buffer.from(s, 'binary').toString('base64');
}

function nodeAtob(s: string): string {
  return Buffer.from(s, 'base64').toString('binary');
}
