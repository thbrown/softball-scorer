import React from 'react';

export default class HrTitle extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <h4
        style={{
          display: 'flex',
          width: '100%',
          margin: '5px 0px',
        }}
      >
        <hr
          style={{
            width: '5%',
          }}
        />
        {this.props.title}
        <hr
          style={{
            width: '75%',
          }}
        />
      </h4>
    );
  }
}
