/**
 * Privara Logo Component
 * Stylized hexagon with checkmark and wing design matching brand colors
 */

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexagon outline - dark navy */}
      <path
        d="M50 8 L88 30 L88 70 L50 92 L12 70 L12 30 Z"
        stroke="#1E3A8A"
        strokeWidth="3.5"
        fill="none"
      />
      
      {/* Checkmark (left side) - yellow with navy outline */}
      <path
        d="M22 42 L32 52 L42 42"
        stroke="#1E3A8A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32 52 L22 62"
        stroke="#1E3A8A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M22 42 L32 52 L42 42"
        stroke="#FEDA15"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32 52 L22 62"
        stroke="#FEDA15"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Wing/M shape (right side) - dark navy */}
      <path
        d="M58 32 L68 42 L75 35 L82 45 L75 55 L68 48 L58 68"
        fill="#1E3A8A"
      />
      {/* Inner facets for depth */}
      <path
        d="M62 36 L70 44 L76 38 L80 45 L76 52 L70 46 L62 64"
        fill="#0F172A"
        opacity="0.4"
      />
    </svg>
  );
}

