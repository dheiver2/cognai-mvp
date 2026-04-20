import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  currentFile: string | null;
  channel: number;
  ecgStart: number;
  ecgDuration: number;
  setCurrentFile: (f: string | null) => void;
  setChannel: (c: number) => void;
  setEcgStart: (s: number) => void;
  setEcgDuration: (d: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentFile: null,
      channel: 1,
      ecgStart: 0,
      ecgDuration: 10,
      setCurrentFile: (currentFile) => set({ currentFile }),
      setChannel: (channel) => set({ channel }),
      setEcgStart: (ecgStart) => set({ ecgStart }),
      setEcgDuration: (ecgDuration) => set({ ecgDuration }),
    }),
    { name: "cognai-app" },
  ),
);
