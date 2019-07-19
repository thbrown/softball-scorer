import React from 'react';
import expose from 'expose';
import config from 'config';
import dialog from 'dialog';
import network from 'network';
import noSleepImport from './lib/nosleep.js';
import state from 'state';
import CardNotFound from 'card-not-found';
import CardLoading from 'card-loading';
import DataContainer from 'elements/data-container';
const noSleep = new noSleepImport();

// TODO
// Text directions?
// Sample data?

// Smoother click and drag
// Use svgs
// Scroll bars on desktop

// Long names overlap back button on AP page

// Max width for desktop
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
    };
  }

  componentDidMount() {
    // Register a service worker to support offline experience and quick subsequent page loads
    if ('serviceWorker' in navigator) {
      // When a new service worker is available, re-load the page
      navigator.serviceWorker.oncontrollerchange = () => {
        if (document.hidden) {
          dialog.show_notification(
            'Softball.app has been updated, this page will be automatically refreshed. You will not lose any data you have entered.',
            () => {
              window.location.reload();
            }
          );
        } else {
          window.location.reload();
        }
      };

      // The actual registration
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker');
      });
    }

    // Load data from localstorage synchronously
    state.loadStateFromLocalStorage();

    // Reload from local storage each time after the window regains focus
    window.addEventListener(
      'focus',
      () => {
        state.loadStateFromLocalStorage();
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
        // This event really just tells us if we are connected to a network, we need to ping the server to know if we are online and authenticated
        network.updateNetworkStatus();
      },
      false
    );

    window.addEventListener(
      'offline',
      () => {
        state.setOffline();
      },
      false
    );

    window.addEventListener('beforeinstallprompt', e => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      state.setAddToHomescreenPrompt(e);
    });

    // Analytics
    let trackingId =
      config.analytics && config.analytics.trackingId
        ? config.analytics.trackingId
        : undefined;
    window.ga =
      window.ga ||
      function() {
        (window.ga.q = window.ga.q || []).push(arguments);
      };
    window.ga.l = +new Date();
    window.ga('create', trackingId, 'auto');
    window.ga('require', 'urlChangeTracker');
    window.ga('require', 'cleanUrlTracker', {
      stripQuery: true,
      indexFilename: 'index.html',
      trailingSlash: 'remove',
      urlFieldsFilter: function(fieldsObj, parseUrl) {
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
    setTimeout(state.sync, 1);
  }

  render() {
    const { renderRouteComponent, loading, ...props } = this.props;

    if (loading) {
      return (
        <CardLoading />
      );
    } else {
      try {
        //TODO find a more elegant solution for routing/caching this data container
        if (props.page.slice(0, 7) === '/stats/' && this.props.statsId) {
          return (
            <DataContainer url={`server/stats/${this.props.statsId}`}>
              {({ data, loading, error }) => {
                return renderRouteComponent({
                  isNew: this.state.isNew,
                  ...props,
                  data,
                  loading,
                  error,
                });
              }}
            </DataContainer>
          );
        } else {
          return renderRouteComponent({ isNew: this.state.isNew, ...props });
        }
      } catch (err) {
        // TODO fix multi-render that occurrs when pressing the back button on edit page
        // with a new entity (new player, new team, new game etc.)  These cause this try
        // catch to trip and render 2 frames of CardNotFound before the route is set
        // correctly
        if (window.ENABLE_VERBOSE_LOGGING) {
          console.error(err);
        }
        return (
          <CardNotFound
            title={'Error'}
            message="This object either does not exist, has been deleted, or belongs to another account."
          />
        );
      }
    }
  }
}
