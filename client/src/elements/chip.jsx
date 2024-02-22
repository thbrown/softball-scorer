import React from 'react';
import css from 'css';
const colors = css.colors;

const typeToColor = {
  NEUTRAL: undefined,
  SUCCESS: colors.PRIMARY,
  ERROR: colors.DELETE,
  WARNING: colors.SECONDARY,
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
