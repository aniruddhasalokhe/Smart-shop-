'use client';

import React from 'react';

interface TurbotechLogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Inline SVG icon — the "Turbo T" mark.
 * Renders a blue-gradient squircle with a bold white "T" letterform.
 * At larger sizes (≥48px), a green "live monitoring" indicator dot appears.
 */
function LogoIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="TurboTech logo"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Gear (#4A4A4A) */}
      <path
        fill="#4A4A4A"
        fillRule="evenodd"
        d="M 226.1 109.0 L 233.5 47.2 L 278.5 47.2 L 285.9 109.0 A 150 150 0 0 1 303.6 113.8 L 340.9 63.9 L 379.9 86.4 L 355.4 143.7 A 150 150 0 0 1 368.3 156.6 L 425.6 132.1 L 448.1 171.1 L 398.2 208.4 A 150 150 0 0 1 403.0 226.1 L 464.8 233.5 L 464.8 278.5 L 403.0 285.9 A 150 150 0 0 1 398.2 303.6 L 448.1 340.9 L 425.6 379.9 L 368.3 355.4 A 150 150 0 0 1 355.4 368.3 L 379.9 425.6 L 340.9 448.1 L 303.6 398.2 A 150 150 0 0 1 285.9 403.0 L 278.5 464.8 L 233.5 464.8 L 226.1 403.0 A 150 150 0 0 1 208.4 398.2 L 171.1 448.1 L 132.1 425.6 L 156.6 368.3 A 150 150 0 0 1 143.7 355.4 L 86.4 379.9 L 63.9 340.9 L 113.8 303.6 A 150 150 0 0 1 109.0 285.9 L 47.2 278.5 L 47.2 233.5 L 109.0 226.1 A 150 150 0 0 1 113.8 208.4 L 63.9 171.1 L 86.4 132.1 L 143.7 156.6 A 150 150 0 0 1 156.6 143.7 L 132.1 86.4 L 171.1 63.9 L 208.4 113.8 A 150 150 0 0 1 226.1 109.0 Z M 256 216 A 40 40 0 1 0 256 296 A 40 40 0 1 0 256 216 Z"
      />
      {/* T Letter (#0EA5E9) */}
      <g fill="#0EA5E9">
        <rect x="186" y="238.5" width="140" height="35" rx="8" />
        <rect x="233.5" y="273.5" width="45" height="180" rx="8" />
      </g>
    </svg>
  );
}

/**
 * TurboTech Industries brand logo component.
 *
 * Renders an inline SVG logo — no external files needed.
 * Supports icon-only and full (icon + text) variants at multiple sizes.
 *
 * @example
 * <TurbotechLogo variant="icon" size="sm" />        // 28px icon only
 * <TurbotechLogo variant="full" size="md" />         // 36px icon + text
 * <TurbotechLogo size="xl" />                        // 64px icon + large text (login hero)
 */
export default function TurbotechLogo({
  variant = 'full',
  size = 'md',
  className = '',
}: TurbotechLogoProps) {
  const config = {
    sm: { icon: 28, title: '13px', subtitle: '8.5px', gap: '6px' },
    md: { icon: 36, title: '16px', subtitle: '10px', gap: '8px' },
    lg: { icon: 48, title: '20px', subtitle: '12px', gap: '10px' },
    xl: { icon: 64, title: '26px', subtitle: '14px', gap: '12px' },
  };

  const c = config[size];

  if (variant === 'icon') {
    return (
      <div className={`flex items-center shrink-0 select-none ${className}`}>
        <LogoIcon size={c.icon} />
      </div>
    );
  }

  // variant === 'full': icon + branded text
  return (
    <div
      className={`flex items-center shrink-0 select-none ${className}`}
      style={{ gap: c.gap }}
    >
      <LogoIcon size={c.icon} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          lineHeight: 1.15,
        }}
      >
        {/* Company name — "Turbo" in white, "Tech" in brand blue */}
        <span
          style={{
            fontFamily: "var(--font-display, 'JetBrains Mono', monospace)",
            fontWeight: 700,
            fontSize: c.title,
            color: '#fff',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          Turbo<span style={{ color: '#0EA5E9' }}>Tech</span>
        </span>

        {/* Subtitle */}
        <span
          style={{
            fontFamily: "var(--font-body, 'Inter', sans-serif)",
            fontWeight: 400,
            fontSize: c.subtitle,
            color: 'hsl(215 15% 55%)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}
        >
          Industries
        </span>
      </div>
    </div>
  );
}
