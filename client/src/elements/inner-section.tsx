import React from 'react';

interface InnerSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const InnerSection = (props: InnerSectionProps) => {
  const style = {
    margin: 'auto',
    maxWidth: '500px',
    ...(props.style ?? {}),
  };
  return (
    <div {...props} style={style}>
      {props.children}
    </div>
  );
};

export default InnerSection;
