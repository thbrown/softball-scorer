import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import DataContainer from 'elements/data-container';
import RouteContainer from 'elements/route-container';
import MainContainer from 'main-container';
import { getGlobalState } from 'state';
import routes from 'routes';
import 'utils/polyfills';
import dialog from 'dialog';

const global = window as any;
global.React = React;

const container = document.createElement('div');
document.body.prepend(container);

const Main = (global.Main = {
  render: () => void 0,
});

const App = (props) => {
  const [render, setRender] = React.useState(false);

  Main.render = () => {
    setRender(!render);
  };

  useMemo(() => {
    if ('serviceWorker' in navigator) {
      console.log('[ServiceWorker] Refresh dialog activated');
      // Register a service worker to support offline experience and quick subsequent page loads
      // When a new service worker is available, re-load the page
      navigator.serviceWorker.oncontrollerchange = () => {
        if (document.hidden) {
          dialog.show_notification(
            'Softball.app has been updated, this page will be automatically refreshed. You will not lose any data you have submitted.',
            () => {
              window.location.reload();
            }
          );
        } else {
          window.location.reload();
        }
      };
    }
  }, []);

  return (
    <DataContainer
      url="server/current-account"
      onRequestComplete={async (data) => {
        if (data.email) {
          console.log(`[AUTH] Active User: ${data.email}`);
          getGlobalState().setActiveUser(data.email);
          getGlobalState().sync();
        } else {
          console.log(`[AUTH] Not logged in`);
        }
      }}
    >
      {({ data, loading }) => {
        return (
          <RouteContainer routes={routes}>
            {(routeProps) => {
              return (
                <MainContainer
                  main={Main}
                  data={data}
                  loading={loading}
                  {...routeProps}
                />
              );
            }}
          </RouteContainer>
        );
      }}
    </DataContainer>
  );
};

(function () {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
})();

let _resize_timeout: any = null;
window.addEventListener('resize', function () {
  if (_resize_timeout !== null) {
    clearTimeout(_resize_timeout);
  }
  _resize_timeout = setTimeout(Main.render, 100);
});
