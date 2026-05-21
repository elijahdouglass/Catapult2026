import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import VerifyIg from "./pages/VerifyIg";
import Onboarding from "./pages/Onboarding";
import Discover from "./pages/Discover";
import Matches from "./pages/Matches";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthErrorScreen from "./components/AuthErrorScreen";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user, authError } = useAuth();

  // A permanent identity failure (e.g. email_conflict) leaves the user signed
  // in to Clerk but with no usable local row. Take over the whole app so the
  // user lands on an explainer + sign-out instead of looping silently
  // through Auth → onboarding/verify → 409 → "Signing you in…" forever.
  if (authError) {
    return (
      <div className="app">
        <AuthErrorScreen error={authError} />
      </div>
    );
  }

  return (
    <div className="app">
      {user?.onboarded && <Navbar />}
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding/verify" element={<VerifyIg />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route
          path="/discover"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
