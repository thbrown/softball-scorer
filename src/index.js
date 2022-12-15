import React from 'react';
import ReactDOM from 'react-dom';
import DataContainer from 'elements/data-container';
import RouteContainer from 'elements/route-container';
import MainContainer from 'main-container';
import state from 'state';
import routes from 'routes';
import 'utils/polyfills';

global.React = React;

const container = document.createElement('div');
document.body.prepend(container);

let Main = (global.Main = {});

const App = (props) => {
  return (
    <DataContainer
      url="server/current-account"
      onRequestComplete={async (data) => {
        if (data.email) {
          console.log(`[AUTH] Active User: ${data.email}`);
          state.setActiveUser(data.email);
          state.sync();
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

(Main.render = function () {
  ReactDOM.render(<App />, container);
})();

let _resize_timeout = null;
window.addEventListener('resize', function () {
  if (_resize_timeout !== null) {
    clearTimeout(_resize_timeout);
  }
  _resize_timeout = setTimeout(Main.render, 100);
});
