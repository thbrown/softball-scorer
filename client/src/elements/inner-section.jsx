import React from 'react';

const InnerSection = (props) => {
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
