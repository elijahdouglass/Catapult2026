import { useState, useEffect } from "react";
import {
  IDKitRequestWidget,
  orbLegacy,
  type RpContext,
  type IDKitResult,
  type IDKitErrorCodes,
} from "@worldcoin/idkit";
import { api } from "../api/client";

interface RpSignatureResponse {
  app_id: `app_${string}`;
  action: string;
  rp_context: RpContext;
}

export default function WorldIdVerify({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [rpData, setRpData] = useState<RpSignatureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRpData(null);
      setError(null);
      return;
    }

    setLoading(true);
    api
      .get<RpSignatureResponse>("/worldid/rp-signature")
      .then(setRpData)
      .catch(() => setError("Failed to initialize verification"))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  if (loading || error) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          {loading && <div className="spinner" />}
          {error && (
            <>
              <p style={{ color: "var(--text-primary)", marginBottom: 8 }}>
                {error}
              </p>
              <button onClick={onClose} style={closeBtnStyle}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!rpData) return null;

  return (
    <IDKitRequestWidget
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      app_id={rpData.app_id}
      action={rpData.action}
      rp_context={rpData.rp_context}
      allow_legacy_proofs={true}
      preset={orbLegacy({})}
      handleVerify={async (result: IDKitResult) => {
        await api.post("/worldid/verify", result);
      }}
      onSuccess={() => {
        onVerified();
        onClose();
      }}
      onError={(errorCode: IDKitErrorCodes) => {
        console.error("World ID error:", errorCode);
      }}
    />
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,.6)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  borderRadius: "var(--radius-lg)",
  padding: "32px",
  textAlign: "center",
  minWidth: 240,
};

const closeBtnStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "8px 20px",
  borderRadius: "var(--radius-full)",
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  fontSize: "0.85rem",
};
