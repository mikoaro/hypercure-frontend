import { useEffect, useState } from 'react';

export function useAutoclaveStream() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // 1. Connect to the WebSocket Gateway defined in Backend Step 3
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      console.log('Connected to HyperCure Stream');
    };

    // 2. Receive Data
    ws.onmessage = (event) => {
      // The payload comes from the Backend Consumer -> Connection Manager
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
    };

    return () => ws.close();
  }, []);

  return data;
}
