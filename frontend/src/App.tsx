// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalAiFloatingButton } from "@/components/ai/GlobalAiFloatingButton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout
import Layout from "./components/Layout";
import { FeatureGuard } from "@/components/FeatureGuard";

// Page Imports
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import TasksPage from "./pages/Tasks";
import AllLeads from "./pages/Leads/AllLeads";
import Pipeline from "./pages/Leads/Pipeline";
import ClientGroupPage from "./pages/ClientGroups";
import LeadSources from "./pages/Leads/LeadSources";
import CalendarPage from "./pages/Calendar";
import CRMPage from "./pages/CRMPage";
import ClientDetailPage from "./pages/ClientDetail";
import InvoiceList from "./components/invoices/InvoiceList";
import CreateInvoice from "./components/invoices/CreateInvoice";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProjectsPage from "./pages/Projects";
import ClientListPage from "./pages/ClientList";
import ClientContactListPage from "./pages/ClientContactList";
import AddProjectPage from "./pages/AddProject";
import KanbanPage from "./pages/Kanban";
import AddClientPage from "./pages/AddClient";
import LetterBoxPage from "./pages/LetterBoxPage";
import FileManagerPage from "./pages/FileManager";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import BookingPagesPage from "@/pages/BookingPages";
import BookingsPage from "@/pages/Bookings";
import UsersPage from "@/pages/Users";
import InvoicePage from "./pages/Invoice";
import ExpensesPage from "./pages/Expenses";

import EcommercePage from "./pages/Ecommerce";
import ServicesPage from "./pages/ServicesPage";
import Applications from "./pages/Applications";

// ✅ Chat Page Import
import ChatPage from "./pages/Chat";

// ✅ Time Tracking Page Import
import TimeTrackingPage from "./pages/TimeTracking";

// ✅ NEW: Employee Management Pages
import AllEmployeesPage from "./pages/employees/AllEmployees";
import DepartmentsPage from "./pages/employees/Departments";
import AttendancePage from "./pages/employees/Attendance";
import LeaveRequestsPage from "./pages/employees/LeaveRequests";

// AI Modules
import RoofEstimator from "./pages/RoofEstimator";

// Help Center
import HelpCenterPage from "./pages/HelpCenter";

// Integrations
import IntegrationsPage from "./pages/integrations/IntegrationsPage";

// Settings
import SettingsPage from "./pages/settings/SettingsPage";

// Analytics
import AnalyticsPage from "./pages/analytics/AnalyticsPage";

// Reports
import ReportsPage from "./pages/reports/ReportsPage";

// Quotes
import QuotesPage from "./pages/Quotes";

// Notifications
import NotificationsPage from "./pages/Notifications";

// Support
import SupportPage from "./pages/Support";

// Documents
import DocumentsPage from "./pages/Documents";

// Roles
import RolesPage from "./pages/roles/RolesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ========== PUBLIC ROUTES ========== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ========== DASHBOARD ========== */}
          <Route path="/dashboard" element={<Index />} />
          <Route
            path="/tasks"
            element={
              <FeatureGuard featureId="tasks">
                <TasksPage />
              </FeatureGuard>
            }
          />

          {/* ========== LEAD ROUTES ========== */}
          <Route
            path="/leads"
            element={
              <FeatureGuard featureId="leads">
                <AllLeads />
              </FeatureGuard>
            }
          />
          <Route
            path="/leads/pipeline"
            element={
              <FeatureGuard featureId="pipeline">
                <Pipeline />
              </FeatureGuard>
            }
          />
          <Route
            path="/leads/sources"
            element={
              <FeatureGuard featureId="leads">
                <LeadSources />
              </FeatureGuard>
            }
          />

          {/* ========== CLIENT ROUTES ========== */}
          <Route
            path="/client-list"
            element={
              <FeatureGuard featureId="companies">
                <ClientListPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/client-list/add"
            element={
              <FeatureGuard featureId="companies">
                <AddClientPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/client-list/:id"
            element={
              <FeatureGuard featureId="companies">
                <ClientDetailPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/client-contact-list"
            element={
              <FeatureGuard featureId="contacts">
                <ClientContactListPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/contacts"
            element={
              <FeatureGuard featureId="contacts">
                <ClientContactListPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/client-list/:id/edit"
            element={
              <FeatureGuard featureId="companies">
                <AddClientPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/clients/groups"
            element={
              <FeatureGuard featureId="companies">
                <ClientGroupPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/crm"
            element={
              <FeatureGuard featureId={["leads", "contacts", "companies"]}>
                <CRMPage />
              </FeatureGuard>
            }
          />

          {/* ========== PROJECT ROUTES ========== */}
          <Route
            path="/projects"
            element={
              <FeatureGuard featureId="tasks">
                <ProjectsPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/projects/add"
            element={
              <FeatureGuard featureId="tasks">
                <AddProjectPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/kanban"
            element={
              <FeatureGuard featureId="tasks">
                <KanbanPage />
              </FeatureGuard>
            }
          />

          {/* ✅ Time Tracking Route */}
          <Route
            path="/time-tracking"
            element={
              <FeatureGuard featureId="tasks">
                <TimeTrackingPage />
              </FeatureGuard>
            }
          />

          {/* ========== FINANCE ROUTES ========== */}
          <Route
            path="/invoice"
            element={
              <FeatureGuard featureId="invoices">
                <InvoicePage />
              </FeatureGuard>
            }
          />
          <Route
            path="/expenses"
            element={
              <FeatureGuard featureId="invoices">
                <ExpensesPage />
              </FeatureGuard>
            }
          />

          {/* ========== QUOTES ROUTE ========== */}
          <Route
            path="/quotes"
            element={
              <FeatureGuard featureId="invoices">
                <QuotesPage />
              </FeatureGuard>
            }
          />

          {/* ========== NOTIFICATIONS ROUTE ========== */}
          <Route
            path="/notifications"
            element={
              <FeatureGuard featureId="email">
                <NotificationsPage />
              </FeatureGuard>
            }
          />

          {/* ========== SUPPORT ROUTES ========== */}
          <Route
            path="/support/tickets"
            element={
              <FeatureGuard featureId="email">
                <SupportPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/support/knowledge-base"
            element={
              <FeatureGuard featureId="email">
                <SupportPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/support/faq"
            element={
              <FeatureGuard featureId="email">
                <SupportPage />
              </FeatureGuard>
            }
          />

          {/* ========== DOCUMENTS ROUTE ========== */}
          <Route
            path="/documents"
            element={
              <FeatureGuard featureId="email">
                <DocumentsPage />
              </FeatureGuard>
            }
          />

          {/* Invoice routes using Layout wrapper */}
          <Route element={<Layout />}>
            <Route
              path="/invoice/list"
              element={
                <FeatureGuard featureId="invoices">
                  <InvoiceList />
                </FeatureGuard>
              }
            />
            <Route
              path="/invoice/create"
              element={
                <FeatureGuard featureId="invoices">
                  <CreateInvoice />
                </FeatureGuard>
              }
            />
            {/* ✅ NEW: Employee Management Routes */}
            <Route
              path="/employees"
              element={
                <FeatureGuard featureId="api">
                  <AllEmployeesPage />
                </FeatureGuard>
              }
            />
            <Route
              path="/employees/all"
              element={
                <FeatureGuard featureId="api">
                  <AllEmployeesPage />
                </FeatureGuard>
              }
            />
            <Route
              path="/employees/departments"
              element={
                <FeatureGuard featureId="api">
                  <DepartmentsPage />
                </FeatureGuard>
              }
            />
            <Route
              path="/employees/attendance"
              element={
                <FeatureGuard featureId="api">
                  <AttendancePage />
                </FeatureGuard>
              }
            />
            <Route
              path="/employees/leave-requests"
              element={
                <FeatureGuard featureId="api">
                  <LeaveRequestsPage />
                </FeatureGuard>
              }
            />
          </Route>

          {/* ========== BUSINESS ROUTES ========== */}
          <Route path="/services" element={<ServicesPage />} />
          <Route
            path="/bookings"
            element={
              <FeatureGuard featureId="calendar">
                <BookingsPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/booking-pages"
            element={
              <FeatureGuard featureId="calendar">
                <BookingPagesPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/ecommerce"
            element={
              <FeatureGuard featureId="api">
                <EcommercePage />
              </FeatureGuard>
            }
          />

          {/* ========== TEAM / EMPLOYEE ROUTES ========== */}
          {/* Legacy employee page */}




          {/* Other Team Routes */}
          <Route
            path="/users"
            element={
              <FeatureGuard featureId="api">
                <UsersPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/applications"
            element={
              <FeatureGuard featureId="leads">
                <Applications />
              </FeatureGuard>
            }
          />

          {/* ========== COMMUNICATION ROUTES ========== */}
          <Route
            path="/letterbox"
            element={
              <FeatureGuard featureId="email">
                <LetterBoxPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/filemanager"
            element={
              <FeatureGuard featureId="documents">
                <FileManagerPage />
              </FeatureGuard>
            }
          />
          <Route
            path="/calendar"
            element={
              <FeatureGuard featureId="calendar">
                <CalendarPage />
              </FeatureGuard>
            }
          />

          {/* ✅ Chat Route */}
          <Route
            path="/chats"
            element={
              <FeatureGuard featureId="email">
                <ChatPage />
              </FeatureGuard>
            }
          />

          {/* ========== SETTINGS ROUTES ========== */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/general" element={<SettingsPage />} />
          <Route path="/settings/company" element={<SettingsPage />} />
          <Route path="/settings/billing" element={<SettingsPage />} />
          <Route path="/settings/email" element={<SettingsPage />} />
          <Route path="/settings/security" element={<SettingsPage />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* ========== AI MODULES ========== */}
          <Route path="/roof-estimator" element={<RoofEstimator />} />

          {/* ========== HELP CENTER ========== */}
          <Route path="/help" element={<HelpCenterPage />} />

          {/* ========== INTEGRATIONS ========== */}
          <Route path="/integrations" element={<IntegrationsPage />} />

          {/* ========== ANALYTICS ========== */}
          <Route path="/analytics" element={<AnalyticsPage />} />

          {/* ========== REPORTS ========== */}
          <Route path="/reports/sales" element={<ReportsPage />} />
          <Route path="/reports/revenue" element={<ReportsPage />} />
          <Route path="/reports/expenses" element={<ReportsPage />} />
          <Route path="/reports/custom" element={<ReportsPage />} />

          {/* ========== ROLES ========== */}
          <Route path="/roles" element={<RolesPage />} />

          {/* ========== 404 CATCH-ALL ========== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <GlobalAiFloatingButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
