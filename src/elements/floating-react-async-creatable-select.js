import React from 'react';
import AsyncCreatableSelect from 'react-select/async-creatable';

export default class FloatingReactAsyncCreatableSelect extends React.Component {
  constructor(props) {
    super(props);
    console.log(
      'DEFAULT PROPS',
      this.props.defaultValue.value,
      !!this.props.defaultValue
    );
    this.state = {
      value: this.props.defaultValue,
      active: !!this.props.defaultValue.value,
    };

    this.style = {
      control: (base) => ({
        ...base,
        border: 0,
        boxShadow: 'none',
        padding: 0,
        marginLeft: '-2px',
        fontSize: '16px',
      }),
      container: (base) => ({
        ...base,
        padding: 0,
      }),
      placeholder: (base) => ({
        ...base,
        margin: 0,
      }),
      indicatorSeparator: (base) => ({
        ...base,
        display: 'none',
      }),
      indicatorContainer: (base) => ({
        ...base,
        display: 'none', // This isn't being applied for some reason, resorting to css file styling
      }),
      menu: (base) => ({
        ...base,
        marginTop: '6px',
        marginLeft: '-9px',
        width: 'calc(100% + 18px)',
      }),
      singleValue: (base) => ({
        ...base,
        marginLeft: '3px',
        marginTop: '4px',
      }),
      input: (base) => ({
        ...base,
        width: '100%',
      }),
    };
  }

  render() {
    console.log('DEFAULT VALUE', this.state.value);
    return (
      <div className={'float-container' + (this.state.active ? ' active' : '')}>
        <label style={{ zIndex: 1 }}>{this.props.label}</label>
        <AsyncCreatableSelect
          className="floating-react-select"
          cacheOptions
          defaultOptions
          defaultValue={this.props.defaultValue}
          value={this.state.value}
          loadOptions={this.props.loadOptions}
          formatOptionLabel={this.props.formatOptionLabel}
          onChange={this.props.onChange}
          onFocus={() => {
            this.setState({ active: true });
          }}
          onBlur={() => {
            console.log('HEY', this.state.value.value);
            if (!this.state.value.value) {
              this.setState({ active: false });
            }
          }}
          isClearable
          styles={this.style}
          placeholder=""
          noOptionsMessage={() => null}
          isValidNewOption={this.props.isValidNewOption}
        />
      </div>
    );
  }
}

FloatingReactAsyncCreatableSelect.defaultProps = {
  defaultValue: '',
  label: '',
  onChange: () => {},
  formatOptionLabel: undefined,
};
