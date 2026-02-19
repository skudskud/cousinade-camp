interface PixelBearProps {
  hatColor: string;
  topColor: string;
  bottomColor: string;
  size?: number;
}

const PixelBear = ({ hatColor, topColor, bottomColor, size = 64 }: PixelBearProps) => {
  const px = size / 16; // each "pixel" unit

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* Hat */}
      {hatColor !== 'none' && (
        <>
          <rect x="5" y="0" width="6" height="1" fill={hatColor} />
          <rect x="4" y="1" width="8" height="2" fill={hatColor} />
        </>
      )}

      {/* Ears */}
      <rect x="3" y="2" width="2" height="2" fill="#8B6914" />
      <rect x="11" y="2" width="2" height="2" fill="#8B6914" />
      <rect x="4" y="3" width="1" height="1" fill="#D4A837" />
      <rect x="11" y="3" width="1" height="1" fill="#D4A837" />

      {/* Head */}
      <rect x="4" y="3" width="8" height="5" fill="#D4A837" />
      <rect x="5" y="3" width="6" height="5" fill="#D4A837" />

      {/* Eyes */}
      <rect x="6" y="5" width="1" height="1" fill="#1a1a1a" />
      <rect x="9" y="5" width="1" height="1" fill="#1a1a1a" />

      {/* Nose */}
      <rect x="7" y="6" width="2" height="1" fill="#8B4513" />

      {/* Mouth */}
      <rect x="7" y="7" width="1" height="1" fill="#1a1a1a" />

      {/* Body / Top */}
      <rect x="4" y="8" width="8" height="4" fill={topColor} />
      <rect x="3" y="9" width="1" height="2" fill={topColor} />
      <rect x="12" y="9" width="1" height="2" fill={topColor} />

      {/* Belly */}
      <rect x="6" y="9" width="4" height="2" fill="#F5DEB3" />

      {/* Bottom / Legs */}
      <rect x="4" y="12" width="8" height="2" fill={bottomColor} />

      {/* Feet */}
      <rect x="4" y="14" width="3" height="2" fill="#8B6914" />
      <rect x="9" y="14" width="3" height="2" fill="#8B6914" />
    </svg>
  );
};

export default PixelBear;
