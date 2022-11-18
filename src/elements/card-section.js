import React from 'react';

export default ({ message, isCentered, children, noPadding }) => {
  return (
    <div
      className="card-textbox"
      style={{
        paddingTop: noPadding ? '0px' : null,
        textAlign: isCentered ? 'center' : null,
        display: isCentered ? 'flex' : null,
        justifyContent: isCentered ? 'center' : null,
      }}
    >
      {message}
      {children}
    </div>
  );
};
