import React from 'react';

export default ({ className, style, div, children }) => {
  return div ? (
    <div style={style} className={'no-select ' + className ? className : ''}>
      {children}
    </div>
  ) : (
    <span style={style} className={'no-select ' + className ? className : ''}>
      {children}
    </span>
  );
};
