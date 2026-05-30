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
function LogoIcon({ size, gradientId }: { size: number; gradientId: string }) {
  const showPulse = size >= 48;

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
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="512"
          y2="512"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* Squircle background */}
      <rect width="512" height="512" rx="112" fill={`url(#${gradientId})`} />

      {/* T — horizontal bar */}
      <rect x="88" y="108" width="336" height="64" rx="14" fill="#fff" />

      {/* T — vertical bar */}
      <rect x="216" y="108" width="80" height="292" rx="14" fill="#fff" />

      {/* Monitoring pulse indicator (only at large sizes) */}
      {showPulse && (
        <>
          <circle cx="412" cy="412" r="40" fill="#10B981" />
          <circle cx="412" cy="412" r="20" fill="#fff" />
        </>
      )}
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
  // Generate a unique ID for the SVG gradient to avoid DOM conflicts
  // when multiple logo instances are on the same page
  const uniqueId = React.useId().replace(/:/g, '');
  const gradientId = `turbo-grad-${uniqueId}`;

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
        <LogoIcon size={c.icon} gradientId={gradientId} />
      </div>
    );
  }

  // variant === 'full': icon + branded text
  return (
    <div
      className={`flex items-center shrink-0 select-none ${className}`}
      style={{ gap: c.gap }}
    >
      <LogoIcon size={c.icon} gradientId={gradientId} />

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
          Turbo<span style={{ color: '#3B82F6' }}>Tech</span>
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
