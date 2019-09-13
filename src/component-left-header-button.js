import React from 'react';

const LeftHeaderButton = props =>
  window?.history?.length > 1 || props.onClick ? (
    <img
      src="/server/assets/back.svg"
      className="back-arrow"
      alt="back"
      style={props.style}
      onClick={() => {
        if (props.onClick) {
          if (props.onClick()) {
            return;
          }
        }
        if (window?.history?.length > 1) {
          window.history.back();
        }
      }}
    />
  ) : (
    <></>
  );

LeftHeaderButton.defaultProps = {
  style: {},
  onClick: null,
};

export default LeftHeaderButton;
