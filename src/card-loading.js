import React from 'react';
import Card from 'elements/card';
import Textbox from 'elements/textbox';

export default () => {
  return (
    <Card
      title="Softball.app"
      enableLeftHeader={false}
      enableRightHeader={false}
    >
      <Textbox message="Softball.app is loading..." />;
    </Card>
  );
};
