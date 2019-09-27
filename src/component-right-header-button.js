import React from 'react';
import DOM from 'react-dom-factories';
import { setRoute } from 'actions/route';

export default class RightHeaderButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleButtonPress = function(ev) {
      ev.preventDefault();
      if (props.onPress) {
        props.onPress();
      }
      if (props.onClick) {
        if (props.onClick()) {
          return;
        }
      }
      if (props.showBlogLink) {
        window.open('https://blog.softball.app', '_blank');
      } else {
        setRoute('/menu');
      }
    };
  }

  render() {
    const src = this.props.showBlogLink
      ? '/server/assets/logo192.png'
      : '/server/assets/home.svg';
    const alt = this.props.showBlogLink ? 'blog' : 'home';
    return DOM.img({
      id: 'home-button',
      src,
      className: 'header-right',
      onClick: this.handleButtonPress,
      alt,
      style: this.props.style,
    });
  }
}
