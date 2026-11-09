import type { DeviceKind } from '../core/types';

/** Original SVG icons (drawn for this project). */
export function DeviceIcon({ kind, size = 56 }: { kind: DeviceKind; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true } as const;
  if (kind === 'cisco-router') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="26" fill="#1f5fbf" />
        <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M32 12v14M26 18l6-6 6 6" />
          <path d="M32 52V38M26 46l6 6 6-6" />
          <path d="M12 32h14M18 26l-6 6 6 6" />
          <path d="M52 32H38M46 26l6 6-6 6" />
        </g>
      </svg>
    );
  }
  if (kind === 'cisco-switch' || kind === 'aruba-switch') {
    const fill = kind === 'cisco-switch' ? '#1f5fbf' : '#e8710a';
    return (
      <svg {...common}>
        <rect x="4" y="18" width="56" height="30" rx="5" fill={fill} />
        <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M14 29h20M29 24l5 5-5 5" />
          <path d="M50 38H30M35 33l-5 5 5 5" />
        </g>
        <g fill="#fff" opacity=".85">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={12 + i * 6.5} y="52" width="4" height="4" rx="1" fill={fill} />
          ))}
        </g>
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="8" y="10" width="48" height="33" rx="4" fill="#475569" />
      <rect x="12" y="14" width="40" height="25" rx="2" fill="#bfe3ff" />
      <path d="M26 43h12l3 9H23z" fill="#64748b" />
      <rect x="18" y="52" width="28" height="4" rx="2" fill="#475569" />
    </svg>
  );
}
