import React from 'react';

interface NoSelectProps {
  className?: string;
  style?: React.CSSProperties;
  div?: boolean;
  children?: React.ReactNode;
}

const NoSelect = ({ className, style, div, children }: NoSelectProps) => {
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
