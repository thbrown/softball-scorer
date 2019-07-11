import expose from 'expose';
import DOM from 'react-dom-factories';

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
        expose.set_state('main', {
          page: '/menu',
        });
      }
    };
  }

  render() {
    let src = this.props.showBlogLink
      ? '/server/assets/logo192.png'
      : '/server/assets/home.svg';
    let alt = this.props.showBlogLink ? 'blog' : 'home';
    return DOM.img({
      src: src,
      className: 'header-right',
      onClick: this.handleButtonPress,
      alt: alt,
    });
  }
}
