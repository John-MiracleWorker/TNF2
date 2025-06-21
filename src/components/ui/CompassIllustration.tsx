import React from 'react';
import { TrueNorthLogo } from './TrueNorthLogo';

export function CompassIllustration() {
  return (
    <div className="relative p-6 bg-navy/5 rounded-xl w-[320px] h-[320px] md:w-[400px] md:h-[400px] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-navy/10 rounded-xl" />
      <TrueNorthLogo size={240} />
    </div>
  );
}