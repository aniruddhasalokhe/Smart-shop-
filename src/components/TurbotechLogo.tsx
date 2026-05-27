'use client';

import React from 'react';

interface TurbotechLogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function TurbotechLogo({ variant = 'full', size = 'md', className = '' }: TurbotechLogoProps) {
  const sizeMap = {
    sm: { svg: 'h-8',  brand: '1rem',   sub: '0.45rem' },
    md: { svg: 'h-10', brand: '1.25rem', sub: '0.58rem' },
    lg: { svg: 'h-14', brand: '1.65rem', sub: '0.75rem' },
    xl: { svg: 'h-24', brand: '2.5rem',  sub: '1.1rem'  },
  };
  const s = sizeMap[size];

  // 10 gear teeth at every 36°
  const teeth = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>

      {/* ── SVG LOGO MARK ─────────────────────────────── */}
      <svg
        viewBox="0 0 100 100"
        className={`${s.svg} w-auto shrink-0 select-none`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Left half = dark foreground colour */}
          <clipPath id="ttl">
            <rect x="0" y="0" width="50" height="100" />
          </clipPath>
          {/* Right half = brand cyan / primary colour */}
          <clipPath id="ttr">
            <rect x="50" y="0" width="50" height="100" />
          </clipPath>
        </defs>

        {/*
          Everything is drawn once inside <g id="tt">,
          then rendered twice with different clip + colour.
        */}
        <g id="tt">
          {/* Gear ring */}
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="9" />

          {/* 10 rectangular teeth around the gear */}
          {teeth.map((angle) => (
            <rect
              key={angle}
              x="45.5" y="9"
              width="9" height="13"
              rx="1.5"
              fill="currentColor"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}

          {/*
            Double-T icon inside gear:
            Two overlapping bold italic "T" shapes —
            left T slightly offset, right T skewed italic style.
          */}

          {/* Back T (full-width crossbar) */}
          <path
            d="M 29 27 H 71 V 37 H 55 V 73 H 45 V 37 H 29 Z"
            fill="currentColor"
          />

          {/* Front T inset — creates the overlapping double-T look */}
          <path
            d="M 34 27 H 66 V 35 H 52.5 V 73 H 47.5 V 35 H 34 Z"
            fill="currentColor"
            opacity="0.55"
          />
        </g>

        {/* Dark left half */}
        <use href="#tt" clipPath="url(#ttl)" className="text-foreground" fill="currentColor" />

        {/* Cyan right half */}
        <use
          href="#tt"
          clipPath="url(#ttr)"
          fill="currentColor"
          style={{ color: 'hsl(var(--primary))' }}
        />
      </svg>

      {/* ── TYPOGRAPHY ────────────────────────────────── */}
      {variant === 'full' && (
        <div className="flex flex-col justify-center leading-none select-none">

          {/* TURBOTECH */}
          <div
            className="font-black italic uppercase tracking-tight"
            style={{ fontSize: s.brand }}
          >
            <span className="text-foreground">TURBO</span>
            <span style={{ color: 'hsl(var(--primary))' }}>TECH</span>
          </div>

          {/* INDUSTRIES */}
          <div
            className="font-semibold uppercase text-muted-foreground"
            style={{
              fontSize: s.sub,
              letterSpacing: '0.30em',
              marginTop: '3px',
            }}
          >
            INDUSTRIES
          </div>
        </div>
      )}
    </div>
  );
}
