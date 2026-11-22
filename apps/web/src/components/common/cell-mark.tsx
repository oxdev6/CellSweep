export function CellMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M32 5 55 18v28L32 59 9 46V18L32 5Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M21 26h8v12h-8M43 26h-8v12h8"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
      <path d="M21 43 43 21" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="45" cy="19" r="3.5" fill="var(--accent)" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
