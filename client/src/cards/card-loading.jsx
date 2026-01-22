import React from 'react';
import Card from 'elements/card';
import Loading from 'elements/loading';

// This might be pointless now, but we can adjust this later for free
const MS_BEFORE_LOADING_GIF_SHOWS = 1;

const CardLoading = (props) => {
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
        background: 'var(--color-background)',
        boxShadow: 'unset',
      }}
    >
      {showGif && (
        <div className="loading-gif-container">
          <Loading className="loading-gif" />
        </div>
      )}
    </Card>
  );
};

export default CardLoading;
