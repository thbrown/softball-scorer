import React from 'react';
import css from 'css';
const colors = css.colors;

interface IconButtonProps {
  src: string;
  alt?: string;
  hideBackground?: boolean;
  invert?: boolean;
  opacity?: number;
  id?: string;
  onClick?: (ev?: React.MouseEvent) => void;
  containerStyle?: React.CSSProperties;
  [key: string]: unknown;
}

const IconButton = ({
  hideBackground = true,
  invert,
  opacity,
  containerStyle,
  ...rest
}: IconButtonProps) => {
  return (
    <div
      className="hover"
      style={{
        background: hideBackground ? undefined : colors.SEMI_TRANSPARENT,
        filter: invert ? 'invert(1)' : undefined,
        width: '24px',
        height: '24px',
        padding: '12px', // 24x24 + 12 + 12 padding => minimum accessible tap target size
        opacity: opacity,
        ...(containerStyle ?? {}),
      }}
    >
      <img alt="img" {...rest} />
    </div>
  );
};

export default IconButton;
