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
        padding: '2px',
        borderRadius: '16px',
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
