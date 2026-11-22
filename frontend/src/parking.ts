import { useCallback, useEffect, useRef, useState } from "react";
import { getParkingMap, type ParkingMap } from "./api";

const REFRESH_INTERVAL = 15_000;

export function useParkingMap() {
  const [data, setData] = useState<ParkingMap>();
  const [error, setError] = useState<string>();
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;

    try {
      const map = await getParkingMap(controller.signal);
      if (controller.signal.aborted) return;
      setData(map);
      setError(undefined);
    } catch (error) {
      if (controller.signal.aborted) return;
      setError(error instanceof Error ? error.message : "Could not reach the parking API.");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!request.current) void refresh();
    }, REFRESH_INTERVAL);
    return () => {
      clearInterval(timer);
      request.current?.abort();
    };
  }, [refresh]);

  return { data, error, refresh };
}

export const floorLabel = (floor: number) => (floor === -1 ? "Basement" : "Level " + floor);
