import React from 'react';

const typeToColor: Record<string, string | undefined> = {
  NEUTRAL: undefined,
  SUCCESS: 'var(--color-primary)',
  ERROR: 'var(--color-delete)',
  WARNING: 'var(--color-secondary)',
};

interface ChipProps {
  type?: 'NEUTRAL' | 'SUCCESS' | 'ERROR' | 'WARNING';
  children?: React.ReactNode;
}

const Chip = ({ type = 'NEUTRAL', children }: ChipProps) => {
  return (
    <div
      className="chip"
      style={{
        color: typeToColor[type],
      }}
    >
      {children}
    </div>
  );
};

export default Chip;
