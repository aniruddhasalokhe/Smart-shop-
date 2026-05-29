'use client';

import React from 'react';
import Image from 'next/image';

interface TurbotechLogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function TurbotechLogo({ variant = 'full', size = 'md', className = '' }: TurbotechLogoProps) {
  const sizeMap = {
    sm: { height: 36,  width: 120 },
    md: { height: 48,  width: 160 },
    lg: { height: 64,  width: 210 },
    xl: { height: 96,  width: 320 },
  };

  const iconSizeMap = {
    sm: { height: 36, width: 36 },
    md: { height: 48, width: 48 },
    lg: { height: 64, width: 64 },
    xl: { height: 96, width: 96 },
  };

  const s = variant === 'icon' ? iconSizeMap[size] : sizeMap[size];

  return (
    <div className={`flex items-center shrink-0 select-none ${className}`}>
      <Image
        src="/logo.svg"
        alt="TurboTech Industries"
        width={s.width}
        height={s.height}
        className="object-contain"
        priority
      />
    </div>
  );
}
