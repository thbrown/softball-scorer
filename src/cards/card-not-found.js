import React from 'react';
import Section from 'elements/card-section';
import Card from 'elements/card';

import { goHome } from 'actions/route';
import IconButton from 'elements/icon-button';

export default ({ message }) => {
  message =
    message === undefined
      ? 'The page your looking for was not found. It may have been deleted or it may never have existed.'
      : message;
  return (
    <Card title="Not Found" enableLeftHeader={false}>
      <div
        style={{
          textAlign: 'center',
          margin: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        className="backgroundText"
      >
        <div>{message}</div>
        <br></br>
        <div>Go to the home page?</div>
        <IconButton
          className="help-icon"
          src="/server/assets/home.svg"
          alt="home"
          onClick={goHome}
          invert
        />
      </div>
    </Card>
  );
};
