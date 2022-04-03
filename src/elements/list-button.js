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

const ListButton = ({ children, type, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`${type ? type + '' : 'list-button'} button`}
      style={{
        textAlign: 'left',
      }}
    >
      {children}
    </div>
  );
};

ListButton.defaultProps = {
  type: undefined,
  onClick: function () {},
};

export default ListButton;
