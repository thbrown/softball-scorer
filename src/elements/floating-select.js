import React from 'react';

export default class FloatingSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value:
        props.initialValue || props.values?.[Object.keys(props?.values?.[0])],
    };
  }

  render() {
    return (
      <div className={'float-container active'}>
        <label>{this.props.label}</label>
        <select
          id={this.props.id}
          className="select"
          disabled={this.props.disabled}
          value={this.state.value}
          onChange={e => {
            this.props.onChange(e.target.value);
            this.setState({ value: e.target.value });
          }}
        >
          {Object.keys(this.props.values).map(value => {
            const label = this.props.values[value];
            return (
              <option value={value} key={value}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    );
  }
}

FloatingSelect.defaultProps = {
  id: null,
  initialValue: '',
  label: '',
  disabled: false,
  onChange: () => {},
  values: {},
};
