import React from 'react';
import { Link } from 'react-router-dom';

/**
 * CareerPilot Brand Logo Component
 * Vector SVG icon representing upward career trajectory, navigation compass, and forward momentum.
 * Sharp and scalable at any resolution with consistent brand color palette.
 */
export default function CareerPilotLogo({
  size = 'md',
  showText = true,
  subtitle,
  link = true,
  to = '/',
  className = ''
}) {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 'w-10 h-10', text: 'text-xl', sub: 'text-[11px]' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-14 h-14', text: 'text-3xl', sub: 'text-sm' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`inline-flex items-center space-x-3 group ${className}`}>
      {/* Dynamic SVG Icon */}
      <div
        className={`${currentSize.icon} relative flex-shrink-0 rounded-2xl bg-gradient-to-tr from-brand-600 via-sky-500 to-indigo-500 p-0.5 shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 group-hover:scale-105 transition-all duration-300`}
      >
        <div className="w-full h-full rounded-[14px] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4 drop-shadow-sm transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
          >
            {/* Subtle trajectory background trail */}
            <path
              d="M8 32C12 28 16 23 23 20C27 18.2 30 15 32 10"
              stroke="url(#trail-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="2 3"
              className="opacity-70"
            />
            {/* Ascending Compass / Paper Aircraft Pilot Shape */}
            <path
              d="M32 8L20 18L13 14L32 8Z"
              fill="url(#pilot-gradient-1)"
            />
            <path
              d="M32 8L22 27L20 18L32 8Z"
              fill="url(#pilot-gradient-2)"
            />
            <path
              d="M20 18L17 23L16 20L20 18Z"
              fill="#bae0fd"
              fillOpacity="0.9"
            />
            {/* Spark of career growth / star element */}
            <circle cx="32" cy="8" r="2" fill="#ffffff" className="animate-pulse" />

            <defs>
              <linearGradient id="trail-gradient" x1="8" y1="32" x2="32" y2="10" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" stopOpacity="0.2" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
              <linearGradient id="pilot-gradient-1" x1="13" y1="8" x2="32" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#93c5fd" />
              </linearGradient>
              <linearGradient id="pilot-gradient-2" x1="20" y1="8" x2="32" y2="27" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60a5fa" />
                <stop offset="1" stopColor="#2563eb" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`${currentSize.text} font-bold tracking-tight text-white`}>
              Career
            </span>
            <span
              className={`${currentSize.text} font-extrabold tracking-tight bg-gradient-to-r from-sky-400 to-brand-400 bg-clip-text text-transparent`}
            >
              Pilot
            </span>
          </div>
          {subtitle && (
            <span className={`${currentSize.sub} font-medium text-slate-400 tracking-wide uppercase`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (link) {
    return (
      <Link to={to} className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
