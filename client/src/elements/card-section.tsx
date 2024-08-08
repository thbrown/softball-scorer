import React, { PropsWithChildren } from 'react';

interface CardSectionProps {
  message?: string;
  isCentered?: boolean;
  noPadding?: boolean;
}

const CardSection = (props: CardSectionProps & PropsWithChildren) => {
  const { message, isCentered, children, noPadding } = props;
  return (
    <div
      className="card-textbox"
      style={{
        paddingTop: noPadding ? '0px' : undefined,
        textAlign: isCentered ? 'center' : undefined,
        display: isCentered ? 'flex' : undefined,
        justifyContent: isCentered ? 'center' : undefined,
      }}
    >
      {message}
      {children}
    </div>
  );
};

export default CardSection;
