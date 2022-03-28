import React from 'react';
import { setRoute } from 'actions/route';

export default class RightHeaderButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleButtonPress = function (ev) {
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
        window.open('https://endlesswips.com/softball-app', '_blank');
      } else {
        setRoute('/menu');
      }
    };
  }

  render() {
    const src = this.props.showBlogLink
      ? '/server/assets/icons/logo.svg'
      : '/server/assets/home.svg';
    const alt = this.props.showBlogLink ? 'blog' : 'home';
    return (
      <img
        id="home-button"
        src={src}
        className="header-right"
        onClick={this.handleButtonPress}
        alt={alt}
        style={{ ...this.props.style }}
      />
    );
  }
}
