import React from 'react';

export default ({ message, isCentered }) => {
  return (
    <div
      className="card-textbox"
      style={{
        textAlign: isCentered ? 'center' : null,
      }}
    >
      {message}
    </div>
  );
};
