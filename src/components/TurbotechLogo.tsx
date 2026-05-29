'use client';

import React from 'react';

interface TurbotechLogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function TurbotechLogo({ variant = 'full', size = 'md', className = '' }: TurbotechLogoProps) {
  const sizeMap = {
    sm: { height: '32px',  width: '110px' },
    md: { height: '44px',  width: '150px' },
    lg: { height: '60px',  width: '200px' },
    xl: { height: '90px',  width: '300px' },
  };

  const iconSizeMap = {
    sm: { height: '32px', width: '32px' },
    md: { height: '44px', width: '44px' },
    lg: { height: '60px', width: '60px' },
    xl: { height: '90px', width: '90px' },
  };

  const s = variant === 'icon' ? iconSizeMap[size] : sizeMap[size];

  return (
    <div className={`flex items-center shrink-0 select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="TurboTech Industries"
        style={{ height: s.height, width: s.width, objectFit: 'contain' }}
      />
    </div>
  );
}
