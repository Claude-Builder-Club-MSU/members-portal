import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import Applications from "./pages/dashboard/Applications";
import Events from "./pages/dashboard/Events";
import Classes from "./pages/dashboard/Classes";
import Projects from "./pages/dashboard/Projects";
import Members from "./pages/dashboard/Members";
import Profile from "./pages/dashboard/Profile";
import Prospects from "./pages/dashboard/Prospects";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/dashboard/applications" element={<DashboardLayout><Applications /></DashboardLayout>} />
            <Route path="/dashboard/events" element={<DashboardLayout><Events /></DashboardLayout>} />
            <Route path="/dashboard/classes" element={<DashboardLayout><Classes /></DashboardLayout>} />
            <Route path="/dashboard/projects" element={<DashboardLayout><Projects /></DashboardLayout>} />
            <Route path="/dashboard/members" element={<DashboardLayout><Members /></DashboardLayout>} />
            <Route path="/dashboard/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
            <Route path="/dashboard/prospects" element={<DashboardLayout><Prospects /></DashboardLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
