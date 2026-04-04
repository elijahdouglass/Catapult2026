import { CSSProperties } from "react";

const checkIcon = (size: number) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function VerifiedBadge({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <span style={compactStyle} title="Verified Human">
        {checkIcon(14)}
      </span>
    );
  }

  return (
    <span style={badgeStyle} title="Verified Human">
      {checkIcon(14)}
      Verified Human
    </span>
  );
}

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#22c55e",
  letterSpacing: "0.01em",
};

const compactStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  color: "#22c55e",
  marginLeft: 4,
  flexShrink: 0,
};
