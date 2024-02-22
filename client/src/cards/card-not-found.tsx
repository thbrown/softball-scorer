import React from 'react';
import Card from 'elements/card';

import { goHome } from 'actions/route';
import IconButton from 'elements/icon-button';

const CardNotFound = (args: { message?: string }) => {
  const message =
    args.message === undefined
      ? 'The page you are looking for was not found. It may have been deleted or it may never have existed.'
      : args.message;
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
          src="/assets/home.svg"
          alt="home"
          onClick={goHome}
          invert
        />
      </div>
    </Card>
  );
};

export default CardNotFound;
