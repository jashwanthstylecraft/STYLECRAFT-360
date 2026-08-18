import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// requireRole is optional — omit it for "any logged-in user"; pass "admin"
// for admin-only pages (Data Entry, Data). A viewer who lands here directly
// gets silently bounced home, not a 403 page — matches "hidden and blocked
// entirely" rather than "visible but denied."
export default function ProtectedRoute({ requireRole, children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;
  return children;
}
