import React from 'react';
import { setRoute } from 'actions/route';

interface RightHeaderButtonProps {
  onPress?: () => void;
  onClick?: () => boolean | void;
  showBlogLink?: boolean;
  style?: React.CSSProperties;
}

export default class RightHeaderButton extends React.Component<RightHeaderButtonProps> {
  handleButtonPress: (ev: React.MouseEvent) => void;

  constructor(props: RightHeaderButtonProps) {
    super(props);
    this.handleButtonPress = function (ev: React.MouseEvent) {
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
      ? '/assets/icons/logo.svg'
      : '/assets/home.svg';
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
