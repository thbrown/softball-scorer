import React from 'react';
import css from 'css';
const colors = css.colors;

/*
src: string
alt: string
hideBackground?: boolean
invert?: boolean
id?: string
onClick?: () => void
*/
const IconButton = (props) => {
  const { hideBackground, invert, opacity, containerStyle, ...rest } = props;
  return (
    <div
      className="hover"
      style={{
        background: props.hideBackground ? undefined : colors.SEMI_TRANSPARENT,
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

IconButton.defaultProps = {
  hideBackground: true,
};

export default IconButton;
