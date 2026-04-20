import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export function useAnalysis() {
  const { currentFile, channel } = useAppStore();
  return useQuery({
    enabled: !!currentFile,
    queryKey: ["analysis", currentFile, channel],
    queryFn: () => api.analyze(currentFile!, channel, false),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSignal(start: number, duration: number) {
  const { currentFile, channel } = useAppStore();
  return useQuery({
    enabled: !!currentFile,
    queryKey: ["signal", currentFile, channel, start, duration],
    queryFn: () => api.signal(currentFile!, start, duration, channel),
    staleTime: 5 * 60_000,
  });
}
