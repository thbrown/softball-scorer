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
}) => {
  return (
    <div className="card">
      <div className="card-title">
        <LeftHeaderButton
          style={{
            visibility: enableLeftHeader ? 'visible' : 'hidden',
          }}
          {...leftHeaderProps}
        />
        <div>{title}</div>
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
  leftHeaderProps: {},
  rightHeaderProps: {},
};

export default Card;
