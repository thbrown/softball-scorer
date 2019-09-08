import expose from 'expose';
import DOM from 'react-dom-factories';

export default class FloatingInput extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.onChangeWraper = function() {
      let value = document.getElementById(this.props.id).value;
      if (this.props.type === 'number') {
        value = Number(value);
      }
      this.props.onChange(value);
    };
  }

  componentDidMount() {
    const floatContainer = document.getElementById(this.props.id + 'container');

    if (floatContainer.querySelector('input').value) {
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
    return DOM.div(
      {
        key: this.props.id + 'container',
        id: this.props.id + 'container',
        className: 'float-container',
      },
      DOM.label({}, this.props.label),
      DOM.input({
        id: this.props.id,
        type: this.props.type ? this.props.type : 'text',
        min: this.props.min,
        step: this.props.step,
        maxLength: this.props.maxLength ? this.props.maxLength : '50',
        onChange: this.onChangeWraper.bind(this),
        defaultValue: this.props.defaultValue,
        disabled: this.props.disabled,
      })
    );
  }
}
