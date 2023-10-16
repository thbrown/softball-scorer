import React from 'react';
import expose from 'expose';
import dialog from 'dialog';
import noSleepImport from './lib/nosleep.js';
import { getGlobalState } from 'state';
import CardNotFound from 'cards/card-not-found';
import CardLoading from 'cards/card-loading';
import DataContainer from 'elements/data-container';
import { Dialog } from 'dialog';
import config from './config';

const noSleep = new noSleepImport();

// TODO
// Text directions?
// Sample data?

// Smoother click and drag
// Use svgs

// Long names overlap back button on AP page

// Import file versioning (fix that page's css)

// Delete account/data
// Async localstorage interaction

// Bad sql field in getState query results in unhandled promise rejection
// Convert bad sync alert to native dialog

// Optimization changes when status is not NOT_STATED
// Optimization length limitations
export default class MainContainer extends expose.Component {
  constructor(props) {
    super(props);
    this.expose('main');

    this.state = {
      render: true,
      dialog: {},
    };
  }

  componentDidMount() {
    // Register a service worker to support offline experience and quick subsequent page loads
    if ('serviceWorker' in navigator) {
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

      // The actual registration
      window.addEventListener('load', function () {
        // the service worker actively sabotages the webpack dev server
        if (window.location.port !== '8889') {
          console.log('[ServiceWorker] Load event');
          navigator.serviceWorker.register('/service-worker.js');
        }
      });
    }

    // TODO: if(test) logic should be removed and we should find a way to mock problematic APIs
    if (!this.props.test) {
      // Load data from browser storage
      getGlobalState().loadLocalState();

      // Reload from local storage each time after the window regains focus
      window.addEventListener(
        'focus',
        () => {
          getGlobalState().loadLocalState();
        },
        false
      );

      // Enable wake lock. (must be wrapped in a user input event handler)
      document.addEventListener('click', enableNoSleep, false);
      function enableNoSleep() {
        noSleep.enable();
        document.removeEventListener('click', enableNoSleep, false);
      }

      // Update the network status whenever we receive an 'online' or 'offline' event
      window.addEventListener(
        'online',
        () => {
          // This event really just tells us if we are connected to a network, we need to actually talk to the server to know if we are online and authenticated
          getGlobalState().sync();
        },
        false
      );

      window.addEventListener(
        'offline',
        () => {
          getGlobalState().setOffline();
        },
        false
      );

      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        getGlobalState().setAddToHomescreenPrompt(e);
      });

      // Analytics
      let trackingId =
        config.analytics && config.analytics.trackingId
          ? config.analytics.trackingId
          : undefined;
      window.ga =
        window.ga ||
        function () {
          (window.ga.q = window.ga.q || []).push(arguments);
        };
      window.ga.l = +new Date();
      window.ga('create', trackingId, 'auto');
      window.ga('require', 'urlChangeTracker');
      window.ga('require', 'cleanUrlTracker', {
        stripQuery: true,
        indexFilename: 'index.html',
        trailingSlash: 'remove',
        urlFieldsFilter: function (fieldsObj, parseUrl) {
          fieldsObj.page = parseUrl(fieldsObj.page)
            .pathname.replace(/teams\/[a-zA-Z0-9]{14}/, 'teams/<team-id>')
            .replace(/player\/[a-zA-Z0-9]{14}/, 'player/<player-id>')
            .replace(/games\/[a-zA-Z0-9]{14}/, 'games/<game-id>')
            .replace(
              /plateAppearances\/[a-zA-Z0-9]{14}/,
              'plateAppearances/<pa-id>'
            )
            .replace(/players\/[a-zA-Z0-9]{14}/, 'players/<player-id>');
          return fieldsObj;
        },
      });
      window.ga('send', 'pageview');

      // Sync on first load
      setTimeout(() => {
        getGlobalState().sync();
      }, 1);
    }
  }

  render() {
    const { renderRouteComponent, loading, ...props } = this.props;
    let CardComponent = null;

    if (loading) {
      CardComponent = <CardLoading />;
    } else {
      try {
        //TODO find a more elegant solution for routing/caching this data container
        if (
          props?.page?.slice(0, 14) === '/public-teams/' &&
          props.publicTeamId
        ) {
          CardComponent = (
            <DataContainer url={`server/team-stats/${this.props.publicTeamId}`}>
              {({ data, loading, error }) => {
                return renderRouteComponent({
                  ...props,
                  data,
                  loading,
                  error,
                });
              }}
            </DataContainer>
          );
        } else {
          CardComponent = renderRouteComponent(props);
        }
      } catch (err) {
        // TODO fix multi-render that occurs when pressing the back button on edit page
        // with a new entity (new player, new team, new game etc.)  These cause this try
        // catch to trip and render 2 frames of CardNotFound before the route is set
        // correctly
        // TODO tests that trip this with 404 errors when deleting content
        if (
          process.env.NODE_ENV !== 'test' &&
          (true || window.ENABLE_VERBOSE_LOGGING)
        ) {
          console.error(renderRouteComponent, err);
        }
        CardComponent = (
          <CardNotFound
            title={'Error'}
            message="This object either does not exist, has been deleted, or belongs to another account."
          />
        );
      }
    }

    return (
      <div className="app-container">
        {CardComponent}
        <Dialog {...this.state.dialog} />
      </div>
    );
  }
}
