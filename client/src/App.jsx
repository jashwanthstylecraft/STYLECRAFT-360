import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Home360 from "./pages/Home360";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Finance from "./pages/Finance";
import Operations from "./pages/Operations";
import Marketing from "./pages/Marketing";
import CustomerService from "./pages/CustomerService";
import DataUpload from "./pages/DataUpload";
import DataEntry from "./pages/DataEntry";
import MetricDetail from "./pages/MetricDetail";
import Settings from "./pages/Settings";
import { useDataUpdatesListener } from "./hooks/useDataUpdatesListener";

export default function App() {
  useDataUpdatesListener();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home360 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute>
            <Sales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/:metricSlug"
        element={
          <ProtectedRoute>
            <MetricDetail backPath="/sales" backLabel="Sales" departmentKey="sales" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/:metricSlug"
        element={
          <ProtectedRoute>
            <MetricDetail backPath="/inventory" backLabel="Inventory & Purchasing" departmentKey="inventory" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <Finance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/:metricSlug"
        element={
          <ProtectedRoute>
            <MetricDetail backPath="/finance" backLabel="Finance" departmentKey="finance" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operations"
        element={
          <ProtectedRoute>
            <Operations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operations/:metricSlug"
        element={
          <ProtectedRoute>
            <MetricDetail backPath="/operations" backLabel="Operations" departmentKey="operations" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing"
        element={
          <ProtectedRoute>
            <Marketing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/:metricSlug"
        element={
          <ProtectedRoute>
            <MetricDetail backPath="/marketing" backLabel="Marketing" departmentKey="marketing" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer-service"
        element={
          <ProtectedRoute>
            <CustomerService />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer-service/:metricSlug"
        element={
          <ProtectedRoute>
            <MetricDetail backPath="/customer-service" backLabel="Customer Service" departmentKey="customer-service" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/data"
        element={
          <ProtectedRoute requireRole="admin">
            <DataUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/data-entry"
        element={
          <ProtectedRoute requireRole="admin">
            <DataEntry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
