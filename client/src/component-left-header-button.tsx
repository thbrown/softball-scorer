import React from 'react';
import { goBack } from 'actions/route';

interface LeftHeaderButtonProps {
  style?: React.CSSProperties;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: () => any;
}

const LeftHeaderButton = ({
  style = {},
  onClick = undefined,
}: LeftHeaderButtonProps) => {
  return window?.history?.length > 1 || onClick ? (
    <img
      id="back-button"
      src="/assets/back.svg"
      className="back-arrow"
      alt="back"
      style={style}
      onClick={(ev) => {
        ev.preventDefault();
        if (onClick) {
          if (onClick()) {
            return;
          }
        }
        if (window?.history?.length > 1) {
          goBack();
        }
      }}
    />
  ) : (
    <div style={{ width: '36px' }} />
  );
};

export default LeftHeaderButton;
