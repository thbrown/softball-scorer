import React from 'react';

const Button = ({ children, fullWidth, type, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`${fullWidth ? 'edit-button ' : ''}${type}-button button`}
    >
      {children}
    </div>
  );
};

Button.defaultProps = {
  type: 'confirm',
  fullWidth: true,
  onClick: function() {},
};

export default Button;
