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

const ListButton = ({ children, id, type, onClick, style }) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`${type ? type + '' : 'list-button'} button left`}
      style={{
        //textAlign: 'left',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

ListButton.defaultProps = {
  type: undefined,
  onClick: function () {},
  style: {},
};

export default ListButton;
