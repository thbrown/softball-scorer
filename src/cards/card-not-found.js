import React from 'react';
import Section from 'elements/card-section';
import Card from 'elements/card';

export default ({ message }) => {
  return (
    <Card title="Not Found" enableLeftHeader={false}>
      <Section message={message} isCentered={true} />
    </Card>
  );
};
