import React from 'react';

const NoSelect = ({ className, style, div, children }) => {
  return div ? (
    <div
      style={{ userSelect: 'none', ...(style ?? {}) }}
      className={'no-select ' + className ? className : ''}
    >
      {children}
    </div>
  ) : (
    <span
      style={{ userSelect: 'none', ...(style ?? {}) }}
      className={'no-select ' + className ? className : ''}
    >
      {children}
    </span>
  );
};

export default NoSelect;
