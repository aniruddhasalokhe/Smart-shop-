'use client';

import React from 'react';

interface TurbotechLogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function TurbotechLogo({ variant = 'full', size = 'md', className = '' }: TurbotechLogoProps) {
  // Size mappings
  const sizeClasses = {
    sm: { svg: 'h-8 w-auto', text: 'text-xs' },
    md: { svg: 'h-10 w-auto', text: 'text-sm' },
    lg: { svg: 'h-14 w-auto', text: 'text-lg' },
    xl: { svg: 'h-24 w-auto', text: 'text-2xl' }
  };

  const activeSize = sizeClasses[size];

  // Gear Teeth angles (10-cog gear)
  const teethAngles = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Dynamic SVG Vector Logo */}
      <svg 
        viewBox="0 0 100 100" 
        className={`${activeSize.svg} shrink-0 select-none`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Left half clipping mask */}
          <clipPath id="clip-left">
            <rect x="0" y="0" width="50" height="100" />
          </clipPath>
          {/* Right half clipping mask */}
          <clipPath id="clip-right">
            <rect x="50" y="0" width="50" height="100" />
          </clipPath>
        </defs>

        {/* Unified Gear Construction Group */}
        {/* We define the shapes here inside a reusable <g> to render twice with different clips/colors */}
        <g id="gear-shape">
          {/* Main Gear Ring */}
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="9" fill="none" className="stroke-[9]" />
          
          {/* Center Hole ring outline */}
          <circle cx="50" cy="50" r="14" stroke="currentColor" strokeWidth="2.5" fill="none" className="opacity-10" />

          {/* 10 crisp trapezoidal teeth rotated around center */}
          {teethAngles.map((angle) => (
            <path
              key={angle}
              d="M 46.5 8 L 53.5 8 L 55.5 20 L 44.5 20 Z"
              fill="currentColor"
              transform={`rotate(${angle}, 50, 50)`}
            />
          ))}

          {/* Stylized "T" shape merging from center hole to top/right */}
          {/* M 44 26 (stem left) H 76 (top bar right) V 36 (top bar bottom) H 56 (stem right) V 76 (stem bottom) H 44 Z */}
          <path 
            d="M 43.5 23 H 76 V 34 H 56.5 V 77 H 43.5 Z" 
            fill="currentColor" 
          />
        </g>

        {/* Render Left Half (Clipped to Left, colored text-foreground / white / black) */}
        <use href="#gear-shape" clipPath="url(#clip-left)" className="text-foreground" fill="currentColor" />

        {/* Render Right Half (Clipped to Right, colored in Turbotech Cyan/Blue `#0284c7` matching the app primary color) */}
        <use href="#gear-shape" clipPath="url(#clip-right)" className="text-primary" fill="currentColor" style={{ color: 'hsl(var(--primary))' }} />
      </svg>

      {/* Typography Branding exactly matching business card */}
      {variant === 'full' && (
        <div className="flex flex-col justify-center leading-none">
          <div className="font-mono-display font-black tracking-tight text-foreground uppercase italic select-none" style={{ fontSize: size === 'sm' ? '1rem' : size === 'md' ? '1.25rem' : size === 'lg' ? '1.65rem' : '2.5rem' }}>
            <span>TURBO</span>
            <span className="text-primary" style={{ color: 'hsl(var(--primary))' }}>TECH</span>
          </div>
          <div 
            className="font-mono-display font-medium text-muted-foreground uppercase select-none" 
            style={{ 
              fontSize: size === 'sm' ? '0.5rem' : size === 'md' ? '0.625rem' : size === 'lg' ? '0.8rem' : '1.2rem',
              letterSpacing: '0.36em',
              marginTop: '2px'
            }}
          >
            INDUSTRIES
          </div>
        </div>
      )}
    </div>
  );
}
