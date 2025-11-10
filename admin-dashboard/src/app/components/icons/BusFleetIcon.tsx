export default function BusFleetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="11" rx="2" />
      <path d="M3 10h18" />
      <circle cx="8" cy="19" r="1" />
      <circle cx="16" cy="19" r="1" />
      <path d="M7 6V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
      <line x1="9" y1="10" x2="9" y2="14" />
      <line x1="15" y1="10" x2="15" y2="14" />
    </svg>
  );
}
