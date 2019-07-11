import expose from 'expose';
import DOM from 'react-dom-factories';

export default class LeftHeaderButton extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.handleButtonPress = function() {
      if (props.onPress) {
        props.onPress();
      }
      window.history.back();
    };
  }

  render() {
    return DOM.img({
      src: '/server/assets/back.svg',
      className: 'back-arrow',
      onClick: this.handleButtonPress,
      alt: 'back',
    });
  }
};
