import React from 'react';
import Textbox from 'elements/textbox';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

export default ({ message }) => {
  return (
    <div className="card">
      <div className="card-title">
        <LeftHeaderButton />
        <div className="prevent-overflow card-title-text-with-arrow">
          Not Found
        </div>
        <RightHeaderButton />
      </div>

      <div className="card-body">
        <Textbox message={message} isCentered={true} />
      </div>
    </div>
  );
};
