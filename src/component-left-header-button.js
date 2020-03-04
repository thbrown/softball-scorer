import React from 'react';
import { goBack } from 'actions/route';

const LeftHeaderButton = props =>
  window?.history?.length > 1 || props.onClick ? (
    <img
      id="back-button"
      src="/server/assets/back.svg"
      className="back-arrow"
      alt="back"
      style={props.style}
      onClick={ev => {
        ev.preventDefault();
        if (props.onClick) {
          if (props.onClick()) {
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

LeftHeaderButton.defaultProps = {
  style: {},
  onClick: null,
};

export default LeftHeaderButton;
