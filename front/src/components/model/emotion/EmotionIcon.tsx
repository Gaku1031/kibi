import { useMemo } from 'react';
import type { EmotionIcon as EmotionIconType } from '../../../types/emotion';
import { renderEmotionIconToSVG } from '../../../libraries/emotionIconGenerator';

interface EmotionIconProps {
  icon: EmotionIconType;
  size?: number;
  className?: string;
}

export function EmotionIcon({ icon, size = 64, className = '' }: EmotionIconProps) {
  const svgContent = useMemo(() => {
    return renderEmotionIconToSVG(icon, size, size);
  }, [icon, size]);

  return (
    <div 
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}