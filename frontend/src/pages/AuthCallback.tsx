import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      navigate(`/auth?error=${error}`);
      return;
    }

    if (token) {
      loginWithToken(token).then((user) => {
        navigate(user.onboarded ? "/discover" : "/onboarding");
      });
    } else {
      navigate("/auth");
    }
  }, [params, navigate, loginWithToken]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
}
