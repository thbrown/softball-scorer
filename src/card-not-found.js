import React from 'react';
import Textbox from 'elements/textbox';
import Card from 'elements/card';

export default ({ message }) => {
  return (
    <Card title="Not Found" enableLeftHeader={false}>
      <Textbox message={message} isCentered={true}/>
    </Card>
  );
};
