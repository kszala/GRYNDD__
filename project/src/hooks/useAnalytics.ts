import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

type Metrics = {
  focus_time: number | null;
  distraction_time: number | null;
  reflection_time: number | null;
  total_time: number | null;
  interruptions: number | null;
  sessions_completed: number | null;
};

type PeakHour = {
  hour: number;
  focus_time: number | null;
};

type DistractionProfile = {
  idle_count: number | null;
  away_count: number | null;
  interrupt_count: number | null;
};

export const useAnalytics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [distraction, setDistraction] = useState<DistractionProfile | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;

      if (!uid) return;

      const { data: metricsData } = await supabase.rpc("get_session_metrics", { uid });
      const { data: peakData } = await supabase.rpc("get_peak_hours", { uid });
      const { data: distractionData } = await supabase.rpc("get_distraction_profile", { uid });

      setMetrics(metricsData as Metrics);
      setPeakHours((peakData as PeakHour[]) || []);
      setDistraction(distractionData as DistractionProfile);
    };

    load();
  }, []);

  return { metrics, peakHours, distraction };
};
