import React, { createRef } from 'react';

export default class FloatingInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.floatContainerRef = createRef();
    this.inputRef = createRef();

    this.onChangeWrapper = function() {
      let value = this.inputRef?.current?.value;
      if (this.props.type === 'number') {
        value = Number(value);
      }
      this.props.onChange(value);
    };
  }

  componentDidMount() {
    const floatContainer = this.floatContainerRef.current;

    if (floatContainer?.querySelector('input')?.value) {
      floatContainer.classList.add('active');
    }

    const handleFocus = e => {
      const target = e.target;
      target.parentNode.classList.add('active');
    };

    const handleBlur = e => {
      const target = e.target;
      if (!target.value) {
        target.parentNode.classList.remove('active');
      }
      target.removeAttribute('placeholder');
    };

    const floatField = floatContainer.querySelector('input');
    floatField.addEventListener('focus', handleFocus);
    floatField.addEventListener('blur', handleBlur);
  }

  render() {
    return (
      <div
        key={this.props.id + 'container'}
        className="float-container"
        ref={this.floatContainerRef}
      >
        <label>{this.props.label}</label>
        <input
          id={this.props.id}
          type={this.props.type ? this.props.type : 'text'}
          min={this.props.min}
          step={this.props.step}
          maxLength={this.props.maxLength ? this.props.maxLength : '50'}
          onChange={this.onChangeWrapper.bind(this)}
          defaultValue={this.props.defaultValue}
          disabled={this.props.disabled}
          ref={this.inputRef}
        ></input>
      </div>
    );
  }
}
