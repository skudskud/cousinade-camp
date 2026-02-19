import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PasswordGate from "./pages/PasswordGate";
import IdentitySelection from "./pages/IdentitySelection";
import AvatarBuilder from "./pages/AvatarBuilder";
import OverworldMap from "./pages/OverworldMap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const hasAuth = localStorage.getItem('cousinade_auth');
  const hasIdentity = localStorage.getItem('cousinade_person_id');

  if (!hasAuth) return <Navigate to="/" replace />;
  if (!hasIdentity) return <Navigate to="/who" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PasswordGate />} />
          <Route path="/who" element={<IdentitySelection />} />
          <Route path="/avatar" element={<AvatarBuilder />} />
          <Route path="/map" element={
            <AuthGuard>
              <OverworldMap />
            </AuthGuard>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
