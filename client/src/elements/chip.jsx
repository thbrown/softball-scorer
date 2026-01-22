import React from 'react';

const typeToColor = {
  NEUTRAL: undefined,
  SUCCESS: 'var(--color-primary)',
  ERROR: 'var(--color-delete)',
  WARNING: 'var(--color-secondary)',
};

const Chip = (props) => {
  return (
    <div
      className="chip"
      style={{
        color: typeToColor[props.type],
      }}
    >
      {props.children}
    </div>
  );
};

Chip.defaultProps = {
  type: 'NEUTRAL', // SUCCESS | ERROR | WARNING
};

export default Chip;
