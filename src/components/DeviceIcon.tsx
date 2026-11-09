import type { DeviceKind } from '../core/types';

/** Original SVG icons (drawn for this project). */
export function DeviceIcon({ kind, size = 56 }: { kind: DeviceKind; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true } as const;
  if (kind === 'cisco-router') {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id="rg" cx="40%" cy="35%" r="75%">
            <stop offset="0" stopColor="#aab2b9" />
            <stop offset="1" stopColor="#5f6870" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="26" fill="url(#rg)" />
        <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M32 12v14M26 18l6-6 6 6" />
          <path d="M32 52V38M26 46l6 6 6-6" />
          <path d="M12 32h14M18 26l-6 6 6 6" />
          <path d="M52 32H38M46 26l6 6-6 6" />
        </g>
      </svg>
    );
  }
  if (kind === 'isp-router') {
    return (
      <svg {...common}>
        <path d="M18 44a12 12 0 0 1 2-23 15 15 0 0 1 28 4 10 10 0 0 1 0 19z" fill="#7b8794" />
        <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M22 32h20M37 27l5 5-5 5" />
          <path d="M42 40H22M27 35l-5 5 5 5" transform="translate(0 -2)" />
        </g>
        <text x="32" y="60" textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">WAN</text>
      </svg>
    );
  }
  if (kind === 'firewall') {
    return (
      <svg {...common}>
        <rect x="6" y="12" width="52" height="40" rx="4" fill="#b23a2f" />
        <g stroke="#f6d3cf" strokeWidth="2">
          <path d="M6 25h52M6 38h52M20 12v13M38 12v13M29 25v13M47 25v13M20 38v14M38 38v14" />
        </g>
      </svg>
    );
  }
  if (kind === 'wireless-ap') {
    return (
      <svg {...common}>
        <ellipse cx="32" cy="46" rx="22" ry="8" fill="#475569" />
        <g stroke="#2f6f8f" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M20 34a17 17 0 0 1 24 0" />
          <path d="M25 28a10 10 0 0 1 14 0" />
        </g>
        <circle cx="32" cy="22" r="3" fill="#2f6f8f" />
      </svg>
    );
  }
  if (kind === 'server') {
    return (
      <svg {...common}>
        <rect x="14" y="6" width="36" height="52" rx="4" fill="#3b4a5a" />
        {[12, 25, 38].map((y) => (
          <g key={y}>
            <rect x="18" y={y} width="28" height="9" rx="2" fill="#5d7185" />
            <circle cx="42" cy={y + 4.5} r="1.8" fill="#7ee787" />
          </g>
        ))}
        <rect x="22" y="51" width="20" height="3" rx="1.5" fill="#5d7185" />
      </svg>
    );
  }
  if (kind === 'laptop') {
    return (
      <svg {...common}>
        <rect x="12" y="12" width="40" height="28" rx="3" fill="#475569" />
        <rect x="15" y="15" width="34" height="22" rx="1.5" fill="#bfe3ff" />
        <path d="M5 44h54l-4 8H9z" fill="#64748b" />
      </svg>
    );
  }
  if (kind === 'cisco-switch' || kind === 'aruba-switch' || kind === 'l3-switch') {
    const fill = kind === 'l3-switch' ? '#1f5a4a' : '#2f6f8f';
    const accent = kind === 'cisco-switch' ? '#7fb8d3' : '#e8750a';
    return (
      <svg {...common}>
        <rect x="4" y="18" width="56" height="30" rx="5" fill={fill} />
        <rect x="4" y="43" width="56" height="5" rx="2" fill={accent} />
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
