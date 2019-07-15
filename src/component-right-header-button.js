import expose from 'expose';
import DOM from 'react-dom-factories';
import { setRoute } from 'actions/route';

export default class RightHeaderButton extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.handleButtonPress = function() {
      if (props.onPress) {
        props.onPress();
      }
      if (props.showBlogLink) {
        window.open('https://blog.softball.app', '_blank');
      } else {
        setRoute('/menu');
      }
    };
  }

  render() {
    let src = this.props.showBlogLink
      ? '/server/assets/logo192.png'
      : '/server/assets/home.svg';
    let alt = this.props.showBlogLink ? 'blog' : 'home';
    return DOM.img({
      src,
      className: 'header-right',
      onClick: this.handleButtonPress,
      alt,
      style: this.props.style,
    });
  }
}
