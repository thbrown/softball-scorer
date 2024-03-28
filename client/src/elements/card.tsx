import React from 'react';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

interface CardProps {
  title: string;
  enableLeftHeader: boolean;
  enableRightHeader: boolean;
  leftHeaderProps: any;
  rightHeaderProps: any;
  titleProps: any;
  noFade: boolean;
  style?: React.CSSProperties;
}
const Card = (props: CardProps & React.PropsWithChildren) => {
  const {
    children,
    title,
    enableLeftHeader,
    enableRightHeader,
    leftHeaderProps,
    rightHeaderProps,
    titleProps,
    noFade,
    style,
  } = props;
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
