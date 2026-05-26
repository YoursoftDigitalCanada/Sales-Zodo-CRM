// src/App.tsx

import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalAiFloatingButton } from "@/components/ai/GlobalAiFloatingButton";
import { GlobalCommandPalette } from "@/components/GlobalCommandPalette";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { SessionTakeoverGuard } from "@/components/SessionTakeoverGuard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { CopilotContextProvider } from "@/contexts/CopilotContext";
import { Sidebar, SidebarSuppressionContext } from "@/components/Sidebar";
import { getAccessToken, getStoredTenant, updateStoredAccessContext } from "@/features/auth/lib/auth-storage";
import { getCurrentAccessContext } from "@/features/auth/services/access-context-service";
import { WorkspaceBrandingProvider, useWorkspaceBranding } from "@/features/settings/context/workspace-branding";
import { getGeneralSettings } from "@/features/settings/services/settings-service";
import { canPerformAction } from "@/lib/access-control";
import { isOnboardingRequired } from "@/lib/enabled-features";
import { isRoofingPublicMarketingEnabled } from "@/lib/public-product-config";
import { toast } from "@/hooks/use-toast";
import useIsMobile from "@/hooks/useIsMobile";
import {
  closeAiShortcutPanel,
  openAiShortcutPanel,
  triggerCreateUiAction,
  triggerExportUiAction,
  triggerImportUiAction,
  triggerSaveUiAction,
} from "@/lib/app-shortcuts";
import {
  normalizeWorkspaceTheme,
  readStoredWorkspaceTheme,
  syncLegacyThemeStorage,
  WORKSPACE_THEME_STORAGE_KEY,
} from "@/lib/workspace-theme";

// Layout
import Layout from "./components/Layout";
import { FeatureGuard } from "@/components/FeatureGuard";
import { AccessGuard } from "@/components/AccessGuard";

// Page Imports
import LandingPage from "./pages/LandingPage";
import ProductPage from "./pages/ProductPage";
import ProductAiRoofEstimatorPage from "./pages/ProductAiRoofEstimatorPage";
import ProductJobManagementPage from "./pages/ProductJobManagementPage";
import ProductCustomerCrmPage from "./pages/ProductCustomerCrmPage";
import ProductProposalsPage from "./pages/ProductProposalsPage";
import ProductInvoicingPage from "./pages/ProductInvoicingPage";
import ProductMobileAppPage from "./pages/ProductMobileAppPage";
import SolutionsPage from "./pages/SolutionsPage";
import SolutionResidentialRoofersPage from "./pages/SolutionResidentialRoofersPage";
import SolutionCommercialRoofingPage from "./pages/SolutionCommercialRoofingPage";
import SolutionStormRestorationPage from "./pages/SolutionStormRestorationPage";
import SolutionMultiLocationPage from "./pages/SolutionMultiLocationPage";
import AIEstimatorPage from "./pages/AIEstimatorPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SecurityInfoPage from "./pages/SecurityInfoPage";
import CompareJobNimbusPage from "./pages/CompareJobNimbusPage";
import CompareAccuLynxPage from "./pages/CompareAccuLynxPage";
import CompareRoofrPage from "./pages/CompareRoofrPage";
import CompareJobProgressPage from "./pages/CompareJobProgressPage";
import CompareLeapPage from "./pages/CompareLeapPage";
import PublicQuoteView from "./pages/PublicQuoteView";
import Onboarding from "./pages/Onboarding";
import TasksPage from "./pages/Tasks";
import AllLeads from "./pages/Leads/AllLeads";
import Pipeline from "./pages/Leads/Pipeline";
import LeadDetailPage from "./pages/Leads/LeadDetailPage";
import ClientGroupPage from "./pages/ClientGroups";
import LeadSources from "./pages/LeadSources/LeadSources";
import LeadSourceDetail from "./pages/LeadSources/LeadSourceDetail";
import CalendarPage from "./pages/Calendar";
import CRMPage from "./pages/CRMPage";
import ClientDetailPage from "./pages/ClientDetail";
import InvoiceList from "./components/invoices/InvoiceList";
import CreateInvoice from "./components/invoices/CreateInvoice";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DealsPage from "./pages/Deals";
import ClientListPage from "./pages/ClientList";
import OrganizationsPage from "./pages/Organizations";
import ClientContactListPage from "./pages/ClientContactList";
import KanbanPage from "./pages/Kanban";
import AddClientPage from "./pages/AddClient";
import LetterBoxPage from "./pages/LetterBoxPage";
import FileManagerPage from "./pages/FileManager";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
// DRAFT — re-enable next year
// import BookingPagesPage from "@/pages/BookingPages";
// import BookingsPage from "@/pages/Bookings";
import UsersPage from "@/pages/Users";
import InvoicePage from "./pages/Invoice";
import InvoiceDetailPage from "./pages/InvoiceDetail";
import SubscriptionsPage from "./pages/Subscriptions";
import PricingPlansPage from "./pages/PricingPlans";
import PaymentsPage from "./pages/Payments";
import BookkeepingPage from "./pages/Bookkeeping";
import AutomationPage from "./pages/Automation";
import ContractsPage from "./pages/Contracts";

// import EcommercePage from "./pages/Ecommerce";
// import ServicesPage from "./pages/ServicesPage";

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
import RoofEstimatorWizard from "./pages/RoofEstimatorWizard";
import RoofEstimatorPolygonEditor from "./pages/RoofEstimatorPolygonEditor";
import ConstructionEstimator from "./pages/ConstructionEstimator";
import AISalesAssistantPage from "./pages/ai/AISalesAssistant";
import AIEmailGeneratorPage from "./pages/ai/AIEmailGenerator";
import AILeadScoringPage from "./pages/ai/AILeadScoring";
import AIDealInsightsPage from "./pages/ai/AIDealInsights";

// Help Center
import HelpCenterPage from "./pages/HelpCenter";

// Integrations
import IntegrationsPage from "./pages/integrations/IntegrationsPage";
import WhatsAppIntegrationPage from "./pages/integrations/WhatsAppIntegrationPage";

// Settings
import SettingsPage from "./pages/settings/SettingsPage";

// Analytics
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import WebsiteAnalyticsPage from "./pages/WebsiteAnalytics";
import SharedRecordingPage from "./pages/SharedRecording";

// Reports
import ReportsPage from "./pages/reports/ReportsPage";

// Quotes
import QuotesPage from "./pages/Quotes";
import ProfilePage from "./pages/Profile";

// Notifications
import NotificationsPage from "./pages/Notifications";
import { DataImportPage, NotesPage } from "./pages/crm/CrmDevelopModulePage";
import CallsPage from "./pages/Calls";
import SequencesPage from "./pages/Sequences";
import EmailTemplatesPage from "./pages/EmailTemplates";

// Support
import SupportPage from "./pages/Support";

// Documents
import DocumentsPage from "./pages/Documents";

// Roles
import RolesPage from "./pages/roles/RolesPage";

const queryClient = new QueryClient();

const WorkspaceThemeSync = () => {
  const { theme, setTheme } = useTheme();
  const accessToken = getAccessToken();

  useEffect(() => {
    const storedTheme = readStoredWorkspaceTheme();
    if (!storedTheme) {
      return;
    }

    setTheme(storedTheme);
    syncLegacyThemeStorage(storedTheme);
  }, [setTheme]);

  useEffect(() => {
    if (!theme || theme === "system") {
      return;
    }

    syncLegacyThemeStorage(normalizeWorkspaceTheme(theme));
  }, [theme]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    const loadWorkspaceTheme = async () => {
      try {
        const general = await getGeneralSettings();
        if (cancelled) return;

        const nextTheme = normalizeWorkspaceTheme(general.theme);
        setTheme(nextTheme);
        syncLegacyThemeStorage(nextTheme);
      } catch {
        // Non-blocking: keep the last stored theme if settings are unavailable.
      }
    };

    void loadWorkspaceTheme();

    return () => {
      cancelled = true;
    };
  }, [accessToken, setTheme]);

  return null;
};

const SETTINGS_ROUTE_PERMISSIONS = [
  "settings.view",
  "settings.manage-integrations",
  "emails.view",
  "emails.send",
  "notifications.view",
  "users.view",
  "roles.view",
  "audit.view",
];

const EMAIL_ROUTE_PERMISSIONS = ["emails.view", "emails.send"];

const publicRoofingRoute = (element: ReactElement) =>
  isRoofingPublicMarketingEnabled ? element : <Navigate to="/product" replace />;

const resolveCreateRoute = (pathname: string): {
  path: string;
  permissionModule?: string;
  action?: "create";
} | null => {
  if (pathname.startsWith("/quotes") || pathname.startsWith("/proposals")) return { path: "/proposals?action=create", permissionModule: "quotes", action: "create" };
  if (pathname.startsWith("/invoice")) return { path: "/invoice/create", permissionModule: "invoices", action: "create" };
  if (pathname.startsWith("/client-list")) return { path: "/client-list/add", permissionModule: "clients", action: "create" };
  if (pathname.startsWith("/projects") || pathname.startsWith("/kanban") || pathname.startsWith("/deals") || pathname.startsWith("/pipeline")) return { path: "/deals?create=1", permissionModule: "projects", action: "create" };
  if (pathname.startsWith("/inspections")) return { path: "/leads", permissionModule: "leads", action: "create" };
  return null;
};

const PUBLIC_SITE_PATHS = new Set([
  "/",
  "/login",
  "/signin",
  "/signup",
  "/onboarding",
  "/product",
  "/solutions",
  "/ai-estimator",
  "/pricing",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/security",
  "/compare",
]);

const isPublicPath = (pathname: string): boolean => {
  if (PUBLIC_SITE_PATHS.has(pathname)) {
    return true;
  }
  if (pathname.startsWith("/product/")) {
    return true;
  }
  if (pathname.startsWith("/solutions/")) {
    return true;
  }
  if (pathname.startsWith("/compare/")) {
    return true;
  }
  if (pathname.startsWith("/quote/")) {
    return true;
  }
  if (pathname.startsWith("/proposal/sign/")) {
    return true;
  }
  if (pathname.startsWith("/estimate/sign/")) {
    return true;
  }
  return false;
};

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { branding } = useWorkspaceBranding();
  const onboardingLocked =
    Boolean(getAccessToken()) &&
    isOnboardingRequired() &&
    !isPublicPath(location.pathname);
  const showPersistentSidebar = useMemo(
    () => !isPublicPath(location.pathname),
    [location.pathname],
  );
  const storedTenantName = getStoredTenant()?.name?.trim();
  const companyName = storedTenantName || branding?.companyName?.trim() || "Sales CRM";
  const companyLogoUrl = branding?.logoUrl || null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;
    const userAgent = window.navigator.userAgent;
    const isIosSafari =
      /iP(ad|hone|od)/i.test(userAgent) &&
      /WebKit/i.test(userAgent) &&
      !/(CriOS|FxiOS|EdgiOS|OPiOS|OPT|DuckDuckGo|YaBrowser)/i.test(userAgent);

    const resetBottomOffset = () => {
      root.style.setProperty("--mobile-browser-bottom-offset", "0px");
    };

    if (!isIosSafari || !window.visualViewport) {
      resetBottomOffset();
      return;
    }

    let frameId = 0;

    const updateBottomOffset = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        if (!viewport) {
          resetBottomOffset();
          return;
        }

        const occludedBottom = Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
        );
        const activeElement = document.activeElement;
        const editingField =
          activeElement instanceof HTMLElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.tagName === "SELECT" ||
            activeElement.isContentEditable);
        const bottomOffset =
          occludedBottom > 120 && editingField
            ? 0
            : Math.min(80, occludedBottom);

        root.style.setProperty("--mobile-browser-bottom-offset", `${bottomOffset}px`);
      });
    };

    updateBottomOffset();

    window.visualViewport.addEventListener("resize", updateBottomOffset);
    window.visualViewport.addEventListener("scroll", updateBottomOffset);
    window.addEventListener("resize", updateBottomOffset);
    window.addEventListener("orientationchange", updateBottomOffset);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.visualViewport?.removeEventListener("resize", updateBottomOffset);
      window.visualViewport?.removeEventListener("scroll", updateBottomOffset);
      window.removeEventListener("resize", updateBottomOffset);
      window.removeEventListener("orientationchange", updateBottomOffset);
      resetBottomOffset();
    };
  }, []);

  const syncAccessContext = useCallback(async () => {
    if (!getAccessToken()) {
      return;
    }

    try {
      const currentAccessContext = await getCurrentAccessContext();
      updateStoredAccessContext({
        employee: currentAccessContext.employee,
        permissions: currentAccessContext.permissions,
      });
    } catch {
      // Non-blocking: route/API guards still enforce access server-side.
    }
  }, []);

  const toggleAppSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((current) => !current);
      return;
    }
    setSidebarCollapsed((current) => !current);
  }, [isMobile]);

  const handleOpenHelp = useCallback(() => {
    navigate("/help");
  }, [navigate]);

  const handleOpenAiAssistant = useCallback(() => {
    openAiShortcutPanel();
  }, []);

  const handleCreateShortcut = useCallback(async () => {
    const createRoute = resolveCreateRoute(location.pathname);
    if (createRoute) {
      if (
        createRoute.permissionModule
        && createRoute.action
        && !canPerformAction(createRoute.permissionModule, createRoute.action)
      ) {
        toast({
          title: "Access denied",
          description: "You no longer have permission to create records from this screen.",
          variant: "destructive",
        });
        return;
      }

      navigate(createRoute.path);
      return;
    }

    const triggered = await triggerCreateUiAction();
    if (!triggered) {
      setCommandPaletteOpen(true);
      toast({
        title: "Choose what to create",
        description: "Pick a create action from the command palette.",
      });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    void syncAccessContext();
  }, [location.pathname, syncAccessContext]);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void syncAccessContext();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncAccessContext();
      }
    }, 10000);

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [syncAccessContext]);

  const handleSaveShortcut = useCallback(async () => {
    const triggered = await triggerSaveUiAction();
    if (!triggered) {
      toast({
        title: "No form to save",
        description: "Open a form or editor first, then press Command+S again.",
      });
    }
  }, []);

  const handleExportShortcut = useCallback(async () => {
    const triggered = await triggerExportUiAction();
    if (!triggered) {
      toast({
        title: "No export action found",
        description: "This screen does not have a visible export action right now.",
      });
    }
  }, []);

  const handleImportShortcut = useCallback(async () => {
    const triggered = await triggerImportUiAction();
    if (!triggered) {
      toast({
        title: "No import action found",
        description: "This screen does not have a visible import action right now.",
      });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) {
        if (event.key === "Escape") {
          setCommandPaletteOpen(false);
          closeAiShortcutPanel();
          setMobileOpen(false);
        }
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "k" && !event.shiftKey) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (key === "p" && event.shiftKey) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (key === "n" && !event.shiftKey) {
        event.preventDefault();
        void handleCreateShortcut();
        return;
      }

      if (key === "b" && !event.shiftKey) {
        event.preventDefault();
        toggleAppSidebar();
        return;
      }

      if (key === "/" || key === "?") {
        event.preventDefault();
        handleOpenHelp();
        return;
      }

      if (key === "a" && event.shiftKey) {
        event.preventDefault();
        handleOpenAiAssistant();
        return;
      }

      if (key === "s" && !event.shiftKey) {
        event.preventDefault();
        void handleSaveShortcut();
        return;
      }

      if (key === "e" && event.shiftKey) {
        event.preventDefault();
        void handleExportShortcut();
        return;
      }

      if (key === "i" && event.shiftKey) {
        event.preventDefault();
        void handleImportShortcut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCreateShortcut,
    handleExportShortcut,
    handleImportShortcut,
    handleOpenAiAssistant,
    handleOpenHelp,
    handleSaveShortcut,
    toggleAppSidebar,
  ]);

  if (onboardingLocked) {
    return <Navigate to="/onboarding" replace />;
  }

  const routesContent = (
    <SidebarSuppressionContext.Provider value={showPersistentSidebar}>
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/product/ai-roof-estimator" element={publicRoofingRoute(<ProductAiRoofEstimatorPage />)} />
        <Route path="/product/job-management" element={<ProductJobManagementPage />} />
        <Route path="/product/customer-crm" element={<ProductCustomerCrmPage />} />
        <Route path="/product/proposals" element={<ProductProposalsPage />} />
        <Route path="/product/invoicing" element={<ProductInvoicingPage />} />
        <Route path="/product/mobile-app" element={<ProductMobileAppPage />} />
        <Route path="/solutions" element={<SolutionsPage />} />
        <Route path="/solutions/residential-roofers" element={publicRoofingRoute(<SolutionResidentialRoofersPage />)} />
        <Route path="/solutions/commercial-roofing" element={publicRoofingRoute(<SolutionCommercialRoofingPage />)} />
        <Route path="/solutions/storm-restoration" element={publicRoofingRoute(<SolutionStormRestorationPage />)} />
        <Route path="/solutions/multi-location" element={publicRoofingRoute(<SolutionMultiLocationPage />)} />
        <Route path="/ai-estimator" element={publicRoofingRoute(<AIEstimatorPage />)} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
        <Route path="/security" element={<SecurityInfoPage />} />
        <Route path="/compare" element={isRoofingPublicMarketingEnabled ? <Navigate to="/compare/jobnimbus" replace /> : <Navigate to="/product" replace />} />
        <Route path="/compare/jobnimbus" element={publicRoofingRoute(<CompareJobNimbusPage />)} />
        <Route path="/compare/acculynx" element={publicRoofingRoute(<CompareAccuLynxPage />)} />
        <Route path="/compare/roofr" element={publicRoofingRoute(<CompareRoofrPage />)} />
        <Route path="/compare/jobprogress" element={publicRoofingRoute(<CompareJobProgressPage />)} />
        <Route path="/compare/leap" element={publicRoofingRoute(<CompareLeapPage />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/quote/:token" element={<PublicQuoteView />} />
        <Route path="/proposal/sign/:token" element={<PublicQuoteView />} />
        <Route path="/estimate/sign/:token" element={publicRoofingRoute(<PublicQuoteView />)} />
        <Route path="/shared-recording/:token" element={<SharedRecordingPage />} />

        {/* ========== DASHBOARD ========== */}
        <Route
          path="/dashboard"
          element={
            <AccessGuard permissionModule="dashboard" action="view">
              <Index />
            </AccessGuard>
          }
        />
        <Route
          path="/tasks"
          element={
            <AccessGuard featureId="tasks" permissionModule="tasks" action="view">
              <TasksPage />
            </AccessGuard>
          }
        />

        {/* ========== LEAD ROUTES ========== */}
        <Route path="/deals" element={<AccessGuard featureId="projects" permissionModule="projects" action="view"><DealsPage /></AccessGuard>} />
        <Route path="/pipeline" element={<AccessGuard featureId="kanban" permissionModule="projects" action="view"><KanbanPage /></AccessGuard>} />
        <Route path="/meetings" element={<AccessGuard featureId="calendar" permissionModule="calendar" action="view"><CalendarPage /></AccessGuard>} />
        <Route path="/proposals" element={<AccessGuard featureId="finance" permissionModule="quotes" action="view"><QuotesPage /></AccessGuard>} />
        <Route path="/subscriptions" element={<AccessGuard featureId="finance" permissionModule="invoices" action="view"><SubscriptionsPage /></AccessGuard>} />
        <Route path="/pricing-plans" element={<AccessGuard featureId="finance" permissionModule="invoices" action="view"><PricingPlansPage /></AccessGuard>} />
        <Route path="/payments" element={<AccessGuard featureId="finance" permissionModule="invoices" action="view"><PaymentsPage /></AccessGuard>} />
        <Route path="/expenses" element={<Navigate to="/bookkeeping" replace />} />
        <Route path="/expenses/:id" element={<Navigate to="/bookkeeping" replace />} />
        <Route path="/bookkeeping" element={<AccessGuard featureId="finance" permissionModule="bookkeeping" action="view"><BookkeepingPage /></AccessGuard>} />
        <Route path="/automation" element={<AccessGuard permissionModule="automation" action="view"><AutomationPage /></AccessGuard>} />
        <Route path="/accounts" element={<AccessGuard featureId="clients" permissionModule="clients" action="view"><OrganizationsPage /></AccessGuard>} />
        <Route path="/organizations" element={<AccessGuard featureId="clients" permissionModule="clients" action="view"><OrganizationsPage /></AccessGuard>} />
        <Route path="/notes" element={<AccessGuard featureId="tasks" permissionModule="tasks" action="view"><NotesPage /></AccessGuard>} />
        <Route path="/calls" element={<AccessGuard featureId="tasks" permissionModule="tasks" action="view"><CallsPage /></AccessGuard>} />
        <Route path="/call-logs" element={<AccessGuard featureId="tasks" permissionModule="tasks" action="view"><CallsPage /></AccessGuard>} />
        <Route path="/sequences" element={<AccessGuard featureId="letterbox" anyOf={EMAIL_ROUTE_PERMISSIONS}><SequencesPage /></AccessGuard>} />
        <Route path="/email-templates" element={<AccessGuard featureId="letterbox" anyOf={EMAIL_ROUTE_PERMISSIONS}><EmailTemplatesPage /></AccessGuard>} />
        <Route path="/data-import" element={<AccessGuard permissionModule="settings" action="view"><DataImportPage /></AccessGuard>} />
        <Route path="/mail" element={<AccessGuard featureId="letterbox" anyOf={EMAIL_ROUTE_PERMISSIONS}><LetterBoxPage /></AccessGuard>} />
        <Route path="/letterbox" element={<Navigate to="/mail" replace />} />
        <Route path="/ai/sales-assistant" element={<AccessGuard featureId="aiAssistant"><AISalesAssistantPage /></AccessGuard>} />
        <Route path="/ai/email-generator" element={<AccessGuard featureId="letterbox" anyOf={EMAIL_ROUTE_PERMISSIONS}><AIEmailGeneratorPage /></AccessGuard>} />
        <Route path="/ai/lead-scoring" element={<AccessGuard featureId="aiAssistant" permissionModule="leads" action="view"><AILeadScoringPage /></AccessGuard>} />
        <Route path="/ai/deal-insights" element={<AccessGuard featureId="aiAssistant" permissionModule="projects" action="view"><AIDealInsightsPage /></AccessGuard>} />
        <Route path="/forecast" element={<AccessGuard featureId="analytics" permissionModule="analytics" action="view"><AnalyticsPage /></AccessGuard>} />
        <Route path="/website-analytics" element={<AccessGuard featureId="analytics" permissionModule="analytics" action="view"><WebsiteAnalyticsPage /></AccessGuard>} />
        <Route
          path="/leads"
          element={
            <AccessGuard featureId="leads" permissionModule="leads" action="view">
              <AllLeads />
            </AccessGuard>
          }
        />
        <Route
          path="/leads/pipeline"
          element={
            <AccessGuard featureId="leads" permissionModule="leads" action="view">
              <Pipeline />
            </AccessGuard>
          }
        />
        <Route
          path="/leads/sources"
          element={
            <AccessGuard featureId="leads" permissionModule="lead-sources" action="view">
              <LeadSources />
            </AccessGuard>
          }
        />
        <Route
          path="/lead-sources/:id"
          element={
            <AccessGuard featureId="leads" permissionModule="lead-sources" action="view">
              <LeadSourceDetail />
            </AccessGuard>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <AccessGuard featureId="leads" permissionModule="leads" action="view">
              <LeadDetailPage />
            </AccessGuard>
          }
        />

        <Route path="/inspections" element={<Navigate to="/dashboard" replace />} />
        <Route path="/inspections/new" element={<Navigate to="/dashboard" replace />} />
        <Route path="/inspections/:id" element={<Navigate to="/dashboard" replace />} />

        {/* ========== CLIENT ROUTES ========== */}
        <Route
          path="/client-list"
          element={
            <AccessGuard featureId="clients" permissionModule="clients" action="view">
              <ClientListPage />
            </AccessGuard>
          }
        />
        <Route
          path="/client-list/add"
          element={
            <AccessGuard featureId="clients" permissionModule="clients" action="create">
              <AddClientPage />
            </AccessGuard>
          }
        />
        <Route
          path="/client-list/:id"
          element={
            <AccessGuard featureId="clients" permissionModule="clients" action="view">
              <ClientDetailPage />
            </AccessGuard>
          }
        />
        <Route
          path="/contacts"
          element={
            <AccessGuard featureId="clients" permissionModule="contacts" action="view">
              <ClientContactListPage />
            </AccessGuard>
          }
        />
        <Route path="/client-contact-list" element={<Navigate to="/contacts" replace />} />
        <Route
          path="/client-list/:id/edit"
          element={
            <AccessGuard featureId="clients" permissionModule="clients" action="update">
              <AddClientPage />
            </AccessGuard>
          }
        />
        <Route
          path="/clients/groups"
          element={
            <AccessGuard featureId="clients" permissionModule="groups" action="view">
              <ClientGroupPage />
            </AccessGuard>
          }
        />
        <Route
          path="/crm"
          element={
            <AccessGuard featureId={["leads", "clients"]} anyOf={["leads.view", "clients.view"]}>
              <CRMPage />
            </AccessGuard>
          }
        />

        <Route path="/projects" element={<Navigate to="/deals" replace />} />
        <Route path="/projects/add" element={<Navigate to="/deals?create=1" replace />} />
        <Route path="/projects/:id" element={<Navigate to="/deals" replace />} />
        <Route path="/projects/:id/edit" element={<Navigate to="/deals" replace />} />
        <Route path="/kanban" element={<Navigate to="/pipeline" replace />} />

        {/* ✅ Time Tracking Route */}
        <Route
          path="/time-tracking"
          element={
            <FeatureGuard featureId="timeTracking">
              <TimeTrackingPage />
            </FeatureGuard>
          }
        />

        {/* ========== FINANCE ROUTES ========== */}
        <Route
          path="/invoice"
          element={
            <AccessGuard featureId="finance" permissionModule="invoices" action="view">
              <InvoicePage />
            </AccessGuard>
          }
        />
        <Route
          path="/invoice/:id"
          element={
            <AccessGuard featureId="finance" permissionModule="invoices" action="view">
              <InvoiceDetailPage />
            </AccessGuard>
          }
        />
        {/* ========== QUOTES ROUTE ========== */}
        <Route
          path="/quotes"
          element={<Navigate to={`/proposals${location.search}`} replace />}
        />

        {/* ========== NOTIFICATIONS ROUTE ========== */}
        <Route
          path="/notifications"
          element={
            <AccessGuard featureId="letterbox" permissionModule="notifications" action="view">
              <NotificationsPage />
            </AccessGuard>
          }
        />

        {/* ========== SUPPORT ROUTES ========== */}
        <Route
          path="/support/tickets"
          element={
            <AccessGuard featureId="support" permissionModule="support" action="view">
              <SupportPage />
            </AccessGuard>
          }
        />
        <Route
          path="/support/knowledge-base"
          element={
            <AccessGuard featureId="support" permissionModule="support" action="view">
              <SupportPage />
            </AccessGuard>
          }
        />
        <Route
          path="/support/faq"
          element={
            <AccessGuard featureId="support" permissionModule="support" action="view">
              <SupportPage />
            </AccessGuard>
          }
        />

        {/* ========== DOCUMENTS ROUTE ========== */}
        <Route
          path="/documents"
          element={
            <AccessGuard featureId="files" permissionModule="files" action="view">
              <DocumentsPage />
            </AccessGuard>
          }
        />
        <Route
          path="/contracts"
          element={
            <AccessGuard featureId="finance" permissionModule="contracts" action="view">
              <ContractsPage />
            </AccessGuard>
          }
        />
        <Route
          path="/contracts/:id"
          element={
            <AccessGuard featureId="finance" permissionModule="contracts" action="view">
              <ContractsPage />
            </AccessGuard>
          }
        />

        {/* Invoice routes using Layout wrapper */}
        <Route element={<Layout />}>
          <Route
            path="/invoice/list"
            element={
              <AccessGuard featureId="finance" permissionModule="invoices" action="view">
                <InvoiceList />
              </AccessGuard>
            }
          />
          <Route
            path="/invoice/create"
            element={
              <AccessGuard featureId="finance" permissionModule="invoices" action="create">
                <CreateInvoice />
              </AccessGuard>
            }
          />
          <Route
            path="/invoice/:id/edit"
            element={
              <AccessGuard featureId="finance" permissionModule="invoices" action="update">
                <CreateInvoice />
              </AccessGuard>
            }
          />
          {/* ✅ NEW: Employee Management Routes */}
          <Route
            path="/employees"
            element={
              <AccessGuard featureId="team" permissionModule="employees" action="view">
                <AllEmployeesPage />
              </AccessGuard>
            }
          />
          <Route
            path="/employees/all"
            element={
              <AccessGuard featureId="team" permissionModule="employees" action="view">
                <AllEmployeesPage />
              </AccessGuard>
            }
          />
          <Route
            path="/employees/departments"
            element={
              <AccessGuard featureId="team" permissionModule="employees" action="view">
                <DepartmentsPage />
              </AccessGuard>
            }
          />
          <Route
            path="/employees/attendance"
            element={
              <AccessGuard featureId="team" permissionModule="employees" action="view">
                <AttendancePage />
              </AccessGuard>
            }
          />
          <Route
            path="/employees/leave-requests"
            element={
              <AccessGuard featureId="team" permissionModule="employees" action="view">
                <LeaveRequestsPage />
              </AccessGuard>
            }
          />
        </Route>

        {/* ========== BUSINESS ROUTES ========== */}
        {/* DRAFT — re-enable next year */}
        {/* <Route path="/services" element={<ServicesPage />} /> */}
        {/* <Route
          path="/bookings"
          element={
            <FeatureGuard featureId="calendar">
              <BookingsPage />
            </FeatureGuard>
          }
        /> */}
        {/* <Route
          path="/booking-pages"
          element={
            <FeatureGuard featureId="calendar">
              <BookingPagesPage />
            </FeatureGuard>
          }
        /> */}
        {/* <Route
          path="/ecommerce"
          element={
            <FeatureGuard featureId="api">
              <EcommercePage />
            </FeatureGuard>
          }
        /> */}

        {/* ========== TEAM / EMPLOYEE ROUTES ========== */}
        {/* Legacy employee page */}



        {/* Other Team Routes */}
        <Route
          path="/users"
          element={
            <AccessGuard featureId="team" permissionModule="users" action="view">
              <UsersPage />
            </AccessGuard>
          }
        />


        {/* ========== COMMUNICATION ROUTES ========== */}
        <Route
          path="/letterbox"
          element={
            <AccessGuard featureId="letterbox" anyOf={EMAIL_ROUTE_PERMISSIONS}>
              <LetterBoxPage />
            </AccessGuard>
          }
        />
        <Route
          path="/filemanager"
          element={
            <AccessGuard featureId="files" permissionModule="files" action="view">
              <FileManagerPage />
            </AccessGuard>
          }
        />
        <Route
          path="/calendar"
          element={
            <AccessGuard featureId="calendar" permissionModule="calendar" action="view">
              <CalendarPage />
            </AccessGuard>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />

        {/* ✅ Chat Route */}
        <Route
          path="/chats"
          element={
            <AccessGuard featureId="chat" permissionModule="chat" action="view">
              <ChatPage />
            </AccessGuard>
          }
        />

        {/* ========== SETTINGS ROUTES ========== */}
        <Route path="/reports" element={<AccessGuard featureId="reports" permissionModule="analytics" action="view"><ReportsPage /></AccessGuard>} />
        <Route path="/settings" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/settings/general" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/company" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/billing" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/email" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/security" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/notifications" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/team" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><SettingsPage /></AccessGuard>} />
        <Route path="/settings/integrations" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><WhatsAppIntegrationPage /></AccessGuard>} />
        <Route path="/settings/integrations/whatsapp" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><WhatsAppIntegrationPage /></AccessGuard>} />
        <Route path="/integrations/whatsapp" element={<AccessGuard anyOf={SETTINGS_ROUTE_PERMISSIONS}><WhatsAppIntegrationPage /></AccessGuard>} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* ========== AI MODULES ========== */}
        <Route
          path="/roof-estimator"
          element={
            <AccessGuard featureId="roofEstimator" permissionModule="roof-estimator" action="view">
              <RoofEstimator />
            </AccessGuard>
          }
        />
        <Route
          path="/roof-estimator/new"
          element={
            <AccessGuard featureId="roofEstimator" permissionModule="roof-estimator" action="create">
              <RoofEstimatorWizard />
            </AccessGuard>
          }
        />
        <Route
          path="/roof-estimator/:id/edit"
          element={
            <AccessGuard featureId="roofEstimator" permissionModule="roof-estimator" action="update">
              <RoofEstimatorWizard />
            </AccessGuard>
          }
        />
        <Route
          path="/roof-estimator/editor"
          element={
            <AccessGuard featureId="roofEstimator" permissionModule="roof-estimator" action="create">
              <RoofEstimatorPolygonEditor />
            </AccessGuard>
          }
        />
        <Route
          path="/construction-estimator"
          element={
            <AccessGuard featureId="roofEstimator" permissionModule="roof-estimator" action="create">
              <ConstructionEstimator />
            </AccessGuard>
          }
        />
        <Route
          path="/construction-estimator/:id"
          element={
            <AccessGuard featureId="roofEstimator" permissionModule="roof-estimator" action="view">
              <ConstructionEstimator />
            </AccessGuard>
          }
        />

        {/* ========== HELP CENTER ========== */}
        <Route path="/help" element={<HelpCenterPage />} />

        {/* ========== INTEGRATIONS ========== */}
        <Route path="/integrations" element={<IntegrationsPage />} />

        {/* ========== ANALYTICS ========== */}
        <Route
          path="/analytics"
          element={
            <AccessGuard featureId="analytics" permissionModule="analytics" action="view">
              <AnalyticsPage />
            </AccessGuard>
          }
        />

        {/* ========== REPORTS ========== */}
        <Route
          path="/reports/sales"
          element={
            <AccessGuard featureId="reports" permissionModule="analytics" action="view">
              <ReportsPage />
            </AccessGuard>
          }
        />
        <Route
          path="/reports/revenue"
          element={
            <AccessGuard featureId="reports" permissionModule="analytics" action="view">
              <ReportsPage />
            </AccessGuard>
          }
        />
        <Route
          path="/reports/expenses"
          element={
            <AccessGuard featureId="reports" permissionModule="analytics" action="view">
              <ReportsPage />
            </AccessGuard>
          }
        />
        <Route
          path="/reports/custom"
          element={
            <AccessGuard featureId="reports" permissionModule="analytics" action="view">
              <ReportsPage />
            </AccessGuard>
          }
        />

        {/* ========== ROLES ========== */}
        <Route
          path="/roles"
          element={
            <AccessGuard featureId="team" permissionModule="roles" action="view">
              <RolesPage />
            </AccessGuard>
          }
        />

        {/* ========== 404 CATCH-ALL ========== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SidebarSuppressionContext.Provider>
  );

  return (
    <>
      {showPersistentSidebar ? (
        <div className="flex min-h-screen overflow-x-hidden bg-[#F8FAFC]">
          {/* Mobile top navbar */}
          <div className="mobile-navbar md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-md hover:bg-[#F1F5F9] text-[#475569] touch-exempt"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="flex min-w-0 items-center gap-2">
              {companyLogoUrl ? (
                <img src={companyLogoUrl} alt={companyName} className="h-8 w-8 rounded-md object-contain" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0891B2]/10 text-[11px] font-bold uppercase text-[#0891B2]">
                  {companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="max-w-[180px] truncate text-sm font-bold text-[#0F172A] tracking-tight">{companyName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCommandPaletteOpen(true)} className="p-2 rounded-md hover:bg-[#F1F5F9] text-[#475569] touch-exempt" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>
            </div>
          </div>

          <Sidebar
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            forceRender
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
          <div className="min-w-0 flex-1 overflow-x-hidden main-content pt-14 md:pt-0">
            {routesContent}
          </div>
          <MobileBottomNav />
        </div>
      ) : (
        routesContent
      )}
      <GlobalCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onCreate={() => void handleCreateShortcut()}
        onExport={() => void handleExportShortcut()}
        onImport={() => void handleImportShortcut()}
        onOpenHelp={handleOpenHelp}
        onOpenAi={handleOpenAiAssistant}
        onToggleSidebar={toggleAppSidebar}
      />
      <SessionTakeoverGuard />
      <GlobalAiFloatingButton />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey={WORKSPACE_THEME_STORAGE_KEY}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <WorkspaceBrandingProvider>
            <CopilotContextProvider>
              <WorkspaceThemeSync />
              <AppRoutes />
            </CopilotContextProvider>
          </WorkspaceBrandingProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
