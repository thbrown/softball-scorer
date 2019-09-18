import React from 'react';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

const Card = ({
  children,
  title,
  enableLeftHeader,
  enableRightHeader,
  leftHeaderProps,
  rightHeaderProps,
  noFade,
}) => {
  return (
    <div className={noFade ? '' : 'card'}>
      <div className="card-title">
        <LeftHeaderButton
          style={{
            visibility: enableLeftHeader ? 'visible' : 'hidden',
          }}
          {...leftHeaderProps}
        />
        {title}
        <RightHeaderButton
          style={{
            visibility: enableRightHeader ? 'visible' : 'hidden',
          }}
          {...rightHeaderProps}
        />
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
};

Card.defaultProps = {
  title: 'title',
  enableLeftHeader: true,
  enableRightHeader: true,
  noFade: false,
  leftHeaderProps: {},
  rightHeaderProps: {},
};

export default Card;
