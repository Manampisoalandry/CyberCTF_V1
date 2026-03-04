"use client";

import { io } from 'socket.io-client';
import { getApiUrl } from '@/lib/api';

export function createRealtimeClient(token) {
  if (!token) return null;

  return io(getApiUrl(), {
    transports: ['websocket'],
    auth: { token }
  });
}
