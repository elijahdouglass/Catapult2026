import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  // Treat anything other than an explicit `true` as unverified — `undefined`
  // shouldn't reach here, but if it does we'd rather route the user through
  // the verify flow than silently let them past the gate.
  if (user.igVerified !== true) return <Navigate to="/onboarding/verify" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
