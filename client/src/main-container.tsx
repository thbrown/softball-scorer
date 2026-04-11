import React from 'react';
import expose from 'expose';
import dialog from 'dialog';
import { getGlobalState } from 'state';
import CardNotFound from 'cards/card-not-found';
import CardLoading from 'cards/card-loading';
import DataContainer from 'elements/data-container';
import { Dialog } from 'dialog';
import config from './config';

const noSleep = new window.NoSleep();

// TODO
// Text directions?
// Sample data?

// Smoother click and drag
// Use svgs

// Long names overlap back button on AP page

// Import file versioning (fix that page's css)

// Async localstorage interaction

// Bad sql field in getState query results in unhandled promise rejection
// Convert bad sync alert to native dialog

// Optimization changes when status is not NOT_STATED
// Optimization length limitations

interface MainContainerProps {
  test?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderRouteComponent?: (props: any) => React.ReactNode;
  loading?: boolean;
  page?: string;
  publicTeamId?: string;
  [key: string]: unknown;
}

interface MainContainerState {
  render: boolean;
  dialog: Record<string, unknown>;
}

export default class MainContainer extends expose.Component<MainContainerProps, MainContainerState> {
  constructor(props: MainContainerProps) {
    super(props);
    this.expose('main');

    this.state = {
      render: true,
      dialog: {},
    };
  }

  componentDidMount() {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configAny = config as any;
      let trackingId =
        configAny.analytics && configAny.analytics.trackingId
          ? configAny.analytics.trackingId
          : undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.ga =
        w.ga ||
        function () {
          (w.ga.q = w.ga.q || []).push(arguments);
        };
      w.ga.l = +new Date();
      w.ga('create', trackingId, 'auto');
      w.ga('require', 'urlChangeTracker');
      w.ga('require', 'cleanUrlTracker', {
        stripQuery: true,
        indexFilename: 'index.html',
        trailingSlash: 'remove',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        urlFieldsFilter: function (fieldsObj: any, parseUrl: any) {
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
      w.ga('send', 'pageview');

      // Sync on first load
      setTimeout(() => {
        getGlobalState().sync();
      }, 1);
    }
  }

  render() {
    const { renderRouteComponent, loading, ...props } = this.props;
    let CardComponent: React.ReactNode = null;

    if (loading) {
      CardComponent = <CardLoading />;
    } else {
      try {
        // TODO find a more elegant solution for routing/caching this data container
        if (
          props?.page?.slice(0, 14) === '/public-teams/' &&
          props.publicTeamId
        ) {
          CardComponent = (
            <DataContainer url={`server/team-stats/${this.props.publicTeamId}`}>
              {({ data, loading, error }) => {
                return renderRouteComponent?.({
                  ...props,
                  data,
                  loading,
                  error,
                });
              }}
            </DataContainer>
          );
        } else {
          CardComponent = renderRouteComponent?.(props);
        }
      } catch (err) {
        // TODO fix multi-render that occurs when pressing the back button on edit page
        // with a new entity (new player, new team, new game etc.)  These cause this try
        // catch to trip and render 2 frames of CardNotFound before the route is set
        // correctly
        // TODO tests that trip this with 404 errors when deleting content
        if (
          process.env.NODE_ENV !== 'test' &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (true || (window as any).ENABLE_VERBOSE_LOGGING)
        ) {
          console.error(renderRouteComponent, err);
        }
        CardComponent = (
          <CardNotFound
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
