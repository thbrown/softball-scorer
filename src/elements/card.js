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
  titleProps,
  noFade,
  style,
}) => {
  return (
    <>
      <div className="card-title">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            maxWidth: '960px',
            width: '100%',
          }}
        >
          <LeftHeaderButton
            id="left-button"
            style={{
              visibility: enableLeftHeader ? 'visible' : 'hidden',
            }}
            {...leftHeaderProps}
          />
          <div
            style={{
              width: 'calc(100% - 100px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            {...titleProps}
          >
            {title}
          </div>
          <RightHeaderButton
            style={{
              visibility: enableRightHeader ? 'visible' : 'hidden',
            }}
            {...rightHeaderProps}
          />
        </div>
      </div>
      <div className={noFade ? '' : 'card'}>
        <div className="card-body" style={style}>
          {children}
        </div>
      </div>
    </>
  );
};

Card.defaultProps = {
  title: 'title',
  enableLeftHeader: true,
  enableRightHeader: true,
  noFade: false,
  leftHeaderProps: {},
  rightHeaderProps: {},
  titleProps: {},
};

export default Card;
