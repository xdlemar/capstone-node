import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { FullScreenPreloader } from "@/components/layout/Preloader";
import { AuthProvider } from "@/contexts/AuthContext";
import { router } from "@/routes";
import "./index.css";

const qc = new QueryClient();
const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <React.Suspense fallback={<FullScreenPreloader label="Initializing portal..." />}>
          <RouterProvider router={router} />
        </React.Suspense>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
