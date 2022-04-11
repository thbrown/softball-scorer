import React from 'react';
import Card from 'elements/card';
import { makeStyles } from 'css/helpers';
import Loading from 'elements/loading';
import { colors } from '../css/theme';

// This might be pointless now, but we can adjust this later for free
const MS_BEFORE_LOADING_GIF_SHOWS = 1;

const useCardLoadingStyles = makeStyles((theme) => ({
  gif: {
    width: '100%',
  },
  gifContainer: {
    width: '5rem',
    margin: '5rem auto',
  },
}));
const CardLoading = (props) => {
  const { classes } = useCardLoadingStyles();
  const [showGif, setShowGif] = React.useState(false);
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowGif(true);
    }, MS_BEFORE_LOADING_GIF_SHOWS);
    return () => {
      clearTimeout(timeoutId);
      setShowGif(false);
    };
  }, []);

  return (
    <Card
      title=""
      noFade={true}
      enableLeftHeader={false}
      enableRightHeader={false}
      style={{
        background: colors.BACKGROUND,
        boxShadow: 'unset',
      }}
    >
      {showGif && (
        <div className={classes.gifContainer}>
          <Loading className={classes.gif} />
        </div>
      )}
    </Card>
  );
};

export default CardLoading;
