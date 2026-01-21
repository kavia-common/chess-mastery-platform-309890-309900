import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { WsClient } from '../ws/client';
import { useAuth } from './AuthContext';

const WsContext = createContext(null);

// PUBLIC_INTERFACE
export function WsProvider({ children }) {
  /** Provides a singleton reconnecting WebSocket client + last events. */
  const { token } = useAuth();
  const [wsStatus, setWsStatus] = useState('disconnected'); // connected|disconnected
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    const client = new WsClient({
      apiBaseUrl: api.baseUrl.get(),
      getToken: () => api.token.get(),
      onEvent: (evt) => {
        if (evt.type === 'ws_connected') setWsStatus('connected');
        if (evt.type === 'ws_disconnected') setWsStatus('disconnected');
        if (evt.type === 'ws_message') setLastMessage(evt.message);
      },
    });

    wsRef.current = client;
    client.connect();

    const pingTimer = setInterval(() => client.ping(), 25000);

    return () => {
      clearInterval(pingTimer);
      client.disconnect();
      wsRef.current = null;
    };
  }, []);

  // When token changes (login/logout), the WS will re-auth automatically on reconnect,
  // but we also force a ping to encourage auth for already-open sockets.
  useEffect(() => {
    if (wsRef.current) wsRef.current.ping();
  }, [token]);

  const value = useMemo(
    () => ({
      wsStatus,
      lastMessage,
      client: wsRef.current,
    }),
    [wsStatus, lastMessage]
  );

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

// PUBLIC_INTERFACE
export function useWs() {
  /** Hook to access WS status/client. */
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWs must be used within WsProvider');
  return ctx;
}
