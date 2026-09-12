import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  position = 'top',
  className = '',
  iconClassName = 'w-3.5 h-3.5 text-slate-400 hover:text-amber-600',
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center justify-center p-0.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
        aria-label={title || 'More information'}
      >
        <Info className={`${iconClassName} transition-colors`} />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 ${getPositionClasses()} w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-left pointer-events-auto animate-in fade-in zoom-in-95 duration-150 border border-slate-700/60`}
        >
          {title && (
            <div className="font-bold text-xs text-amber-300 pb-1 mb-1 border-b border-slate-700 flex items-center gap-1.5">
              <span>{title}</span>
            </div>
          )}
          <div className="text-[11px] leading-relaxed text-slate-200 font-normal">
            {content}
          </div>
          {/* Subtle Arrow Indicator */}
          <div
            className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 border-slate-700/60 ${
              position === 'bottom'
                ? '-top-1 left-1/2 -translate-x-1/2 border-t border-l'
                : position === 'left'
                ? '-right-1 top-1/2 -translate-y-1/2 border-t border-r'
                : position === 'right'
                ? '-left-1 top-1/2 -translate-y-1/2 border-b border-l'
                : '-bottom-1 left-1/2 -translate-x-1/2 border-b border-r'
            }`}
          />
        </div>
      )}
    </div>
  );
};
