import React from 'react';
import Card from 'elements/card';
import { compose, withState } from 'recompose';
import injectSheet from 'react-jss';

// This might be pointless now, but we can adjust this later for free
const MS_BEFORE_LOADING_GIF_SHOWS = 1;

class CardLoading extends React.Component {
  componentWillUnmount() {
    this.props.setShowGif(false);
    clearTimeout(this.timeoutId);
  }

  componentDidMount() {
    this.props.setShowGif(false);
    this.timeoutId = setTimeout(() => {
      this.props.setShowGif(true);
    }, MS_BEFORE_LOADING_GIF_SHOWS);
  }

  render() {
    const props = this.props;
    return (
      <Card
        title=""
        noFade={true}
        enableLeftHeader={false}
        enableRightHeader={false}
      >
        {this.props.showGif && (
          <div className={props.classes.gifContainer}>
            <img
              src="/server/assets/spinner.gif"
              alt="loading"
              className={props.classes.gif}
            />
          </div>
        )}
      </Card>
    );
  }
}

export default compose(
  withState('showGif', 'setShowGif', false),
  injectSheet(theme => ({
    gif: {
      width: '100%',
    },
    gifContainer: {
      width: theme.sizing.xSmall,
      marginLeft: 'auto',
      marginRight: 'auto',
      marginTop: theme.spacing.medium,
    },
  }))
)(CardLoading);
