import React from 'react';
import state from 'state';
import CardAuth from 'card-auth';
import CardLoading from 'card-loading';
import CardNotFound from 'card-not-found';
import CardGame from 'card-game';
import CardGameEdit from 'card-game-edit';
import CardImport from 'card-import';
import CardMenu from 'card-menu';
import CardOptimizationList from 'card-optimization-list';
import CardOptimizationEdit from 'card-optimization-edit';
import CardOptimization from 'card-optimization';
import CardOptimizationStatsOverride from 'card-optimization-stats-override';
import CardPasswordReset from 'card-password-reset';
import CardPlateAppearance from 'card-plate-appearance';
import CardPlayerList from 'card-player-list';
import CardPlayerEdit from 'card-player-edit';
import CardPlayerSelection from 'card-player-selection';
import CardPlayerSelect from 'card-player-select';
import CardSignup from 'card-signup';
import CardSpray from 'card-spray';
import CardTeam from 'card-team';
import CardTeamEdit from 'card-team-edit';
import CardTeamList from 'card-team-list';
import CardVerifyEmail from 'card-verify-email';
import CardStats from 'card-stats';

let routes;

const asserStateObjects = function(...args) {
  let valid = true;
  args.forEach(val => {
    if (!val) {
      valid = false;
      throw new Error(
        '[ROUTES] 404 - Undefined field in ' + JSON.stringify(args)
      );
    }
  });
  return valid;
};

const isSameRouteAs = function(key) {
  return props => {
    return routes[key](props);
  };
};

const renderWhileLoading = function({ loading, error }) {
  return Component => {
    if (loading) {
      return <CardLoading />;
    } else if (error) {
      return <CardNotFound />;
    } else {
      return Component();
    }
  };
};

routes = {
  '/not-found': () => {
    return (
      <CardNotFound
        title="Not Found"
        message="The content  you were looking for could not be found."
      />
    );
  },
  '/': () => {
    return <CardMenu />;
  },
  '/menu': isSameRouteAs('/'),
  '/menu/login': () => {
    return <CardAuth />;
  },
  '/menu/signup': () => {
    return <CardSignup />;
  },
  '/menu/import': () => {
    return <CardImport />;
  },
  '/account/verify-email/:token': ({ token }) => {
    return <CardVerifyEmail token={token} />;
  },
  '/account/password-reset/:token': ({ token }) => {
    return <CardPasswordReset token={token} />;
  },
  '/teams': () => {
    return <CardTeamList />;
  },
  '/teams/:teamId': ({ teamId }) => {
    const team = state.getTeam(teamId);
    asserStateObjects(team);
    return <CardTeam team={team} tab="games" />;
  },
  '/teams/:teamId/games': isSameRouteAs('/teams/:teamId'),
  '/teams/:teamId/edit': ({ teamId, isNew }) => {
    const team = state.getTeam(teamId); // TODO: revisit this, what happens if this page is loaded via external link
    asserStateObjects(team);
    return <CardTeamEdit team={team} isNew={isNew} />;
  },
  '/teams/:teamId/stats': ({ teamId }) => {
    const team = state.getTeam(teamId);
    asserStateObjects(team);
    return <CardTeam team={team} tab="stats" />;
  },
  '/teams/:teamId/stats/player/:playerId': ({ teamId, playerId }) => {
    const team = state.getTeam(teamId);
    const player = state.getPlayer(playerId);
    asserStateObjects(team, player);
    return <CardSpray team={team} player={player} origin="stats" />;
  },
  '/teams/:teamId/games/:gameId': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    asserStateObjects(team, game);
    return <CardGame team={team} game={game} tab="lineup" />;
  },
  '/teams/:teamId/games/:gameId/lineup': isSameRouteAs(
    '/teams/:teamId/games/:gameId'
  ),
  '/teams/:teamId/games/:gameId/scorer': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    asserStateObjects(team, game);
    return <CardGame team={team} game={game} tab="scorer" />;
  },
  '/teams/:teamId/games/:gameId/player-selection': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    asserStateObjects(team, game);
    return <CardPlayerSelection team={team} game={game} />;
  },
  '/teams/:teamId/games/:gameId/edit': ({ teamId, gameId, isNew }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    asserStateObjects(team, game);
    return <CardGameEdit team={team} game={game} isNew={isNew} />;
  },
  '/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId': ({
    teamId,
    gameId,
    plateAppearanceId,
    isNew,
  }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    const plateAppearance = state.getPlateAppearance(plateAppearanceId);
    const plateAppearances = state.getPlateAppearancesForPlayerInGame(
      plateAppearance.player_id,
      gameId
    );
    const player = state.getPlayer(plateAppearance.player_id);
    asserStateObjects(team, game, plateAppearance, player);
    return (
      <CardPlateAppearance
        team={team}
        game={game}
        player={player}
        plateAppearance={plateAppearance}
        plateAppearances={plateAppearances}
        isNew={isNew}
      />
    );
  },
  '/teams/:teamId/games/:gameId/scorer/plateAppearances/:plateAppearanceId': isSameRouteAs(
    '/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId'
  ),
  '/players': () => {
    return <CardPlayerList />;
  },
  '/players/:playerId': ({ playerId }) => {
    const player = state.getPlayer(playerId);
    asserStateObjects(player);
    return <CardSpray player={player} origin="players" />;
  },
  '/players/:playerId/edit': ({ playerId, isNew }) => {
    const player = state.getPlayer(playerId);
    asserStateObjects(player);

    return <CardPlayerEdit player={player} isNew={isNew} />;
  },
  '/optimizations': () => {
    // Optimizations weren't a part of the original JSON state schema, so if somebody imports a file
    // with the old schema the page will crash. This should be addressed properly by versioning for
    // exported files. In the meantime, here is a band aid.
    if (state.getAllOptimizations() === undefined) {
      state.getLocalState().optimizations = [];
    }
    return <CardOptimizationList />;
  },
  '/optimizations/:optimizationId/edit': ({ optimizationId, isNew }) => {
    const optimization = state.getOptimization(optimizationId);
    asserStateObjects(optimization);
    return <CardOptimizationEdit optimization={optimization} isNew={isNew} />;
  },
  '/optimizations/:optimizationId': ({ optimizationId }) => {
    const optimization = state.getOptimization(optimizationId);
    asserStateObjects(optimization);
    return <CardOptimization optimization={optimization} />;
  },
  '/optimizations/:optimizationId/overrides/player-select': ({
    optimizationId,
  }) => {
    const optimization = state.getOptimization(optimizationId);
    asserStateObjects(optimization);
    return (
      <CardPlayerSelect
        selected={JSON.parse(optimization.playerList)}
        onComplete={players => {
          state.setOptimizationField(
            optimization.id,
            'playerList',
            players,
            true
          );
        }}
      />
    );
  },
  '/optimizations/:optimizationId/overrides/:playerId': ({
    optimizationId,
    playerId,
  }) => {
    const optimization = state.getOptimization(optimizationId);
    const player = state.getPlayer(playerId);
    asserStateObjects(optimization, player);
    return (
      <CardOptimizationStatsOverride
        player={player}
        optimization={optimization}
      />
    );
  },
  '/stats/:statsId': ({ data, loading, error, statsId, teamId }) => {
    return renderWhileLoading({ loading, error })(() => {
      return (
        <CardStats state={data} team={data.team} routingMethod="statsPage" />
      );
    });
  },
  '/stats/:statsId/player/:playerId': ({
    data,
    loading,
    error,
    statsId,
    playerId,
  }) => {
    const player = data.players.reduce((prev, player) => {
      return player.id === playerId ? player : prev;
    }, null);

    return renderWhileLoading({ loading, error })(() => {
      return (
        <CardSpray
          state={data}
          team={data.team}
          player={player}
          origin="statsPage"
        />
      );
    });
  },
};

export default routes;
