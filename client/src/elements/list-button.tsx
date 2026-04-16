import React from 'react';

interface ListButtonContentIconProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export const ListButtonContentIcon = ({ children, icon }: ListButtonContentIconProps) => {
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

interface ListButtonProps {
  children?: React.ReactNode;
  id?: string;
  type?: string;
  onClick?: (ev?: React.MouseEvent) => void;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: unknown;
}

const ListButton = ({
  children,
  id,
  type,
  onClick = () => {},
  style = {},
}: ListButtonProps) => {
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

export default ListButton;
