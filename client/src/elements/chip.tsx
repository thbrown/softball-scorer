import React from 'react';
import css from 'css';
const colors = css.colors;

const typeToColor: Record<string, string | undefined> = {
  NEUTRAL: undefined,
  SUCCESS: colors.PRIMARY,
  ERROR: colors.DELETE,
  WARNING: colors.SECONDARY,
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
