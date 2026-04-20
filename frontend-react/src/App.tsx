import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Landing from "./pages/Landing";
import AppLayout from "./pages/AppLayout";
import Overview from "./pages/panels/Overview";
import Patient from "./pages/panels/Patient";
import Ecg from "./pages/panels/Ecg";
import Disclosure from "./pages/panels/Disclosure";
import Trends from "./pages/panels/Trends";
import Histograms from "./pages/panels/Histograms";
import Hrv from "./pages/panels/Hrv";
import Events from "./pages/panels/Events";
import Report from "./pages/panels/Report";
import Formats from "./pages/panels/Formats";
import Qt from "./pages/panels/Qt";
import Morphology from "./pages/panels/Morphology";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Overview />} />
            <Route path="patient" element={<Patient />} />
            <Route path="ecg" element={<Ecg />} />
            <Route path="disclosure" element={<Disclosure />} />
            <Route path="trends" element={<Trends />} />
            <Route path="histograms" element={<Histograms />} />
            <Route path="hrv" element={<Hrv />} />
            <Route path="qt" element={<Qt />} />
            <Route path="morphology" element={<Morphology />} />
            <Route path="events" element={<Events />} />
            <Route path="report" element={<Report />} />
            <Route path="formats" element={<Formats />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
