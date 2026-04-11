import React from 'react';

interface HrTitleProps {
  title?: string;
  children?: React.ReactNode;
}

export default class HrTitle extends React.Component<HrTitleProps> {
  render() {
    return (
      <div
        style={{
          display: 'flex',
          width: 'calc(100% - 20px)',
          margin: '10px',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            borderBottom: '2px solid var(--color-primary)',
            borderTop: '2px solid transparent',
            width: '5%',
          }}
        />
        <div
          style={{
            width: '100px',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          {this.props.title}
          {this.props.children}
        </div>
        <div
          style={{
            borderBottom: '2px solid var(--color-primary)',
            borderTop: '2px solid transparent',
            width: 'calc(100% - 5% - 100px)',
          }}
        />
      </div>
    );
  }
}
