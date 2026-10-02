import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import XAuthCallback from "./pages/XAuthCallback";
import { WithdrawalApp } from "./components/withdrawal/services";
import NotFound from "./pages/NotFound";

import QueueIndex from "./pages/bankassist/QueueIndex";
import BigScreen from "./pages/bankassist/BigScreen";
import OfficeDashboard from "./pages/bankassist/OfficeDashboard";
import SupervisorDashboard from "./pages/bankassist/SupervisorDashboard";
import { ThemeProvider } from "./components/ThemeProvider";
import { useEffect } from "react";

const queryClient = new QueryClient();

const BankAssistWrapper = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Save previous theme state if needed, or just ensure we cleanup
    return () => {
      // When leaving BankAssist, remove dark/light classes from root
      document.documentElement.classList.remove('dark', 'light');
      // Also potentially clear the storage if it interferes
      // localStorage.removeItem('theme'); 
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/xauth/callback" element={<XAuthCallback />} />
          <Route path="/admin" element={<Admin />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/withdraw" element={<WithdrawalApp />} />
          
          {/* BankAssist Routes */}
          <Route path="/queue" element={<BankAssistWrapper><QueueIndex /></BankAssistWrapper>} />
          <Route path="/queue/screen" element={<BankAssistWrapper><BigScreen /></BankAssistWrapper>} />
          <Route path="/queue/office" element={<BankAssistWrapper><OfficeDashboard /></BankAssistWrapper>} />
          <Route path="/queue/supervisor" element={<BankAssistWrapper><SupervisorDashboard /></BankAssistWrapper>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
