import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const defaultOptions = {
  autoConnect: true,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
};

const useSocket = (url, options = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const { enabled = true, ...socketOptions } = options;

    if (!url || !enabled) {
      return undefined;
    }

    const socket = io(url, {
      ...defaultOptions,
      ...socketOptions,
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    url,
    options.enabled,
    JSON.stringify({ ...options, enabled: undefined }),
  ]);

  return socketRef;
};

export default useSocket;
