import React from 'react';

export default ({ className, children }) => (
  <span className={'no-select ' + className ? className : ''}>{children}</span>
);
