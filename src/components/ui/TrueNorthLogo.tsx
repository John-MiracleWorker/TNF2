import React from 'react';

interface TrueNorthLogoProps {
  size?: number;
  className?: string;
}

export function TrueNorthLogo({ size = 24, className }: TrueNorthLogoProps) {
  return (
    <img 
      src="/TrueNorth Compass Logo copy.png" 
      alt="TrueNorth Logo" 
      width={size} 
      height={size} 
      className={className}
    />
  );
}