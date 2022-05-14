import React from 'react';
import { colors } from '../css/theme';

/*
src: string
alt: string
hideBackground?: boolean
invert?: boolean
id?: string
onClick?: () => void
*/
const IconButton = (props) => {
  const { hideBackground, invert, ...rest } = props;
  return (
    <div
      style={{
        background: props.hideBackground ? undefined : colors.SEMI_TRANSPARENT,
        filter: invert ? 'invert(1)' : undefined,
        display: 'flex',
        alignItems: 'center',
        width: '48px', // Minimum accessible tap target size
        height: '48px',
        borderRadius: '16px',
        alignItems: 'center',
        justifyContent: 'center',
        alignContent: 'center',
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
