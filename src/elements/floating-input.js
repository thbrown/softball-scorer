import React from 'react';

export default class FloatingInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.defaultValue,
      active: !!this.props.defaultValue,
    };
  }

  render() {
    return (
      <div className={'float-container' + (this.state.active ? ' active' : '')}>
        <label>{this.props.label}</label>
        <input
          id={this.props.inputId}
          type={this.props.type ? this.props.type : 'text'}
          min={this.props.min}
          step={this.props.step}
          maxLength={this.props.maxLength ? this.props.maxLength : 50}
          value={this.state.value}
          disabled={this.props.disabled}
          onChange={e => {
            this.props.onChange(
              this.props.type === 'number'
                ? parseFloat(e.target.value)
                : e.target.value
            );
            this.setState({
              value: e.target.value,
            });
          }}
          onFocus={() => {
            this.setState({ active: true });
          }}
          onBlur={() => {
            if (!this.state.value) {
              this.setState({ active: false });
            }
          }}
        />
      </div>
    );
  }
}

FloatingInput.defaultProps = {
  inputId: null,
  defaultValue: '',
  label: '',
  type: 'text',
  disabled: false,
  onChange: () => {},
  values: {},
};
