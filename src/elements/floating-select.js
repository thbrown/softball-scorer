import React from 'react';

export default class FloatingSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.initialValue || props.values[0]?.value,
    };
  }

  render() {
    const options = this.props.values.map((valueEntry) => {
      let { label, value } = valueEntry;

      return (
        <option value={value} key={value}>
          {label}
        </option>
      );
    });
    if (!this.state.value) {
      options.push(
        <option disabled selected value>
          {'-- select an option --'}
        </option>
      );
    }

    return (
      <div className={'float-container active'}>
        <label>{this.props.label}</label>
        <select
          id={this.props.selectId}
          className="select"
          disabled={this.props.disabled}
          value={this.state.value}
          style={{
            width: this.props.fullWidth ? '100%' : undefined,
            ...(this.props.selectStyle ?? {}),
          }}
          onChange={(e) => {
            this.props.onChange(e.target.value);
            this.setState({ value: e.target.value });
          }}
        >
          {options}
        </select>
      </div>
    );
  }
}

FloatingSelect.defaultProps = {
  selectId: null,
  initialValue: '',
  label: '',
  disabled: false,
  onChange: () => {},
  values: [],
  fullWidth: false,
};
