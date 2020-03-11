import React from 'react';

export const ListButtonContentIcon = ({ children, icon }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      {icon}
      {children}
    </div>
  );
};

const ListButton = ({ children, fullWidth, type, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`${fullWidth ? 'edit-button ' : ''}${type}-button button`}
      style={{
        textAlign: 'left',
      }}
    >
      {children}
    </div>
  );
};

ListButton.defaultProps = {
  type: 'confirm',
  fullWidth: true,
  onClick: function() {},
};

export default ListButton;
