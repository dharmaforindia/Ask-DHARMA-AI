import React from 'react';

interface Props {
  className?: string;
}

export const DharmaLogo: React.FC<Props> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Dharma Wheel Logo"
    >
       {/* Background Circle: White backing to ensure visibility in dark mode */}
       <circle 
         cx="50" 
         cy="50" 
         r="49" 
         fill="white" 
         className="stroke-none"
       />
       
       <g fill="black">
          {/* 8 Outer Knobs - Positioned to overlap with the rim */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
             <circle key={`knob-${deg}`} cx="50" cy="6" r="6" transform={`rotate(${deg} 50 50)`} />
          ))}

          {/* Outer Rim Ring */}
          <path 
            d="M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10 Z M50 18 A32 32 0 1 1 50 82 A32 32 0 1 1 50 18 Z" 
            fillRule="evenodd"
          />

          {/* Central Hub Ring */}
          <path 
            d="M50 34 A16 16 0 1 0 50 66 A16 16 0 1 0 50 34 Z M50 44 A6 6 0 1 1 50 56 A6 6 0 1 1 50 44 Z" 
            fillRule="evenodd"
          />

          {/* 8 Tapered Spokes connecting Rim to Hub */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
             <path 
                key={`spoke-${deg}`} 
                d="M46 18 L54 18 L53 34 L47 34 Z"
                transform={`rotate(${deg} 50 50)`} 
             />
          ))}
       </g>
    </svg>
  );
};

export default DharmaLogo;