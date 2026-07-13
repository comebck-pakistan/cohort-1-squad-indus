import { useState, useEffect } from "react";
import { getBakerSession } from "@/lib/baker-session";

export function useBuyerSession() {
  const [buyerId, setBuyerId] = useState<number>(1);
  const [bakerId, setBakerId] = useState<number>(() => getBakerSession()?.bakerId ?? 0);

  useEffect(() => {
    const storedBuyerId = localStorage.getItem("buyerId");
    if (storedBuyerId) {
      setBuyerId(parseInt(storedBuyerId, 10));
    } else {
      localStorage.setItem("buyerId", "1");
    }

    setBakerId(getBakerSession()?.bakerId ?? 0);
  }, []);

  return { buyerId, bakerId };
}
