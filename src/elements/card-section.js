import React from 'react';

export default ({ message, isCentered, children }) => {
  return (
    <div
      className="card-textbox"
      style={{
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
