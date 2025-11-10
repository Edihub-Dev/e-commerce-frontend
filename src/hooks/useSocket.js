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
    if (!url) return undefined;

    const socket = io(url, {
      ...defaultOptions,
      ...options,
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, JSON.stringify(options)]);

  return socketRef;
};

export default useSocket;
