import React from 'react';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

const Card = ({ title, enableLeftHeader, enableRightHeader, children }) => {
  return (
    <div className="card">
      <div className="card-title">
        <LeftHeaderButton style={{
          visibility: enableLeftHeader ? 'visible' : 'hidden' 
        }}/>
        <div>{title}</div>
        <RightHeaderButton style={{
          visibility: enableRightHeader ? 'visible' : 'hidden' 
        }}/>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
};

Card.defaultProps = {
  title: 'title',
  enableLeftHeader: true,
  enableRightHeader: true,
};

export default Card;
