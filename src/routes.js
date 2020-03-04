import React from 'react';
import state from 'state';
import CardAccount from 'cards/card-account';
import CardAuth from 'cards/card-auth';
import CardLoading from 'cards/card-loading';
import CardNotFound from 'cards/card-not-found';
import CardGame from 'cards/card-game';
import CardGameEdit from 'cards/card-game-edit';
import CardImport from 'cards/card-import';
import CardMenu from 'cards/card-menu';
import CardOptimizationList from 'cards/card-optimization-list';
import CardOptimizationEdit from 'cards/card-optimization-edit';
import CardOptimization from 'cards/card-optimization';
import CardOptimizationStatsOverride from 'cards/card-optimization-stats-override';
import CardPasswordReset from 'cards/card-password-reset';
import CardPlateAppearance from 'cards/card-plate-appearance';
import CardPlayerList from 'cards/card-player-list';
import CardPlayerEdit from 'cards/card-player-edit';
import CardPlayerSelection from 'cards/card-player-selection';
import CardPlayerSelect from 'cards/card-player-select';
import CardReset from 'cards/card-reset';
import CardSignup from 'cards/card-signup';
import CardSpray from 'cards/card-spray';
import CardTeam from 'cards/card-team';
import CardTeamEdit from 'cards/card-team-edit';
import CardTeamList from 'cards/card-team-list';
import CardVerifyEmail from 'cards/card-verify-email';
import CardStats from 'cards/card-stats';
import CardOptimizationLineupImport from 'cards/card-optimization-lineup-import';

// possibility to add '/app/' here?
export const ROUTE_PREFIX = '';

let routes;

const assertStateObjects = function(...args) {
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
    return routes[ROUTE_PREFIX + key](props);
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
  [`${ROUTE_PREFIX}/not-found`]: () => {
    return (
      <CardNotFound
        title="Not Found"
        message="The content you were looking for could not be found."
      />
    );
  },
  '/': () => {
    return <CardMenu />;
  },
  [`/index.html`]: () => {
    return <CardMenu />;
  },
  [`${ROUTE_PREFIX}`]: () => {
    return <CardMenu />;
  },
  [`${ROUTE_PREFIX}/`]: () => {
    return <CardMenu />;
  },
  [`${ROUTE_PREFIX}/index.html`]: () => {
    return <CardMenu />;
  },
  [`${ROUTE_PREFIX}/menu`]: isSameRouteAs('/'),
  [`${ROUTE_PREFIX}/menu/login`]: () => {
    return <CardAuth />;
  },
  [`${ROUTE_PREFIX}/menu/signup`]: () => {
    return <CardSignup />;
  },
  [`${ROUTE_PREFIX}/menu/import`]: () => {
    return <CardImport />;
  },
  [`${ROUTE_PREFIX}/account/verify-email/:token`]: ({ token }) => {
    return <CardVerifyEmail token={token} />;
  },
  [`${ROUTE_PREFIX}/account/password-reset/:token`]: ({ token }) => {
    return <CardPasswordReset token={token} />;
  },
  [`${ROUTE_PREFIX}/reset`]: () => {
    return <CardReset />;
  },
  [`${ROUTE_PREFIX}/teams`]: () => {
    return <CardTeamList />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId`]: ({ teamId, search }) => {
    const tab = search.tab;
    const team = state.getTeam(teamId);
    assertStateObjects(team);
    return <CardTeam team={team} tab={tab || 'games'} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games`]: isSameRouteAs('/teams/:teamId'),
  [`${ROUTE_PREFIX}/teams/:teamId/edit`]: ({ teamId, search: { isNew } }) => {
    const team = state.getTeam(teamId); // TODO: revisit this, what happens if this page is loaded via external link
    assertStateObjects(team);
    return <CardTeamEdit team={team} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/stats`]: ({ teamId }) => {
    const team = state.getTeam(teamId);
    assertStateObjects(team);
    return <CardTeam team={team} tab="stats" />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/stats/player/:playerId`]: ({
    teamId,
    playerId,
  }) => {
    const team = state.getTeam(teamId);
    const player = state.getPlayer(playerId);
    const playerPlateAppearances = state.getPlateAppearancesForPlayerOnTeam(
      playerId,
      teamId
    );

    assertStateObjects(team, player, playerPlateAppearances);
    return (
      <CardSpray
        team={team}
        player={player}
        plateAppearances={playerPlateAppearances}
      />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId`]: ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    assertStateObjects(team, game);
    return <CardGame team={team} game={game} tab="lineup" />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/lineup`]: isSameRouteAs(
    '/teams/:teamId/games/:gameId'
  ),
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/scorer`]: ({
    teamId,
    gameId,
  }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    assertStateObjects(team, game);
    return <CardGame team={team} game={game} tab="scorer" />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/player-selection`]: ({
    teamId,
    gameId,
  }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    assertStateObjects(team, game);
    return (
      <CardPlayerSelection id="player-selection" team={team} game={game} />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/edit`]: ({
    teamId,
    gameId,
    search: { isNew },
  }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    assertStateObjects(team, game);
    return <CardGameEdit team={team} game={game} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId`]: ({
    teamId,
    gameId,
    plateAppearanceId,
    search: { isNew },
  }) => {
    const team = state.getTeam(teamId);
    const game = state.getGame(gameId);
    const plateAppearance = state.getPlateAppearance(plateAppearanceId);
    const plateAppearances = state.getPlateAppearancesForPlayerInGame(
      plateAppearance.player_id,
      gameId
    );
    const player = state.getPlayer(plateAppearance.player_id);
    assertStateObjects(team, game, plateAppearance, player);
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
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/scorer/plateAppearances/:plateAppearanceId`]: isSameRouteAs(
    '/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId'
  ),
  [`${ROUTE_PREFIX}/players`]: () => {
    return <CardPlayerList />;
  },
  [`${ROUTE_PREFIX}/players/:playerId`]: ({ playerId }) => {
    const player = state.getPlayer(playerId);
    const playerPlateAppearances = state.getPlateAppearancesForPlayer(playerId);
    assertStateObjects(player, playerPlateAppearances);
    return (
      <CardSpray player={player} plateAppearances={playerPlateAppearances} />
    );
  },
  [`${ROUTE_PREFIX}/players/:playerId/edit`]: ({
    playerId,
    search: { isNew },
  }) => {
    const player = state.getPlayer(playerId);
    assertStateObjects(player);

    return <CardPlayerEdit player={player} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/optimizations`]: () => {
    // Optimizations weren't a part of the original JSON state schema, so if somebody imports a file
    // with the old schema the page will crash. This should be addressed properly by versioning for
    // exported files. In the meantime, here is a band aid.
    if (state.getAllOptimizations() === undefined) {
      state.getLocalState().optimizations = [];
      state.getAncestorState().optimizations = [];
    }
    return <CardOptimizationList />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/edit`]: ({
    optimizationId,
    search: { isNew },
  }) => {
    const optimization = state.getOptimization(optimizationId);
    assertStateObjects(optimization);
    return <CardOptimizationEdit optimization={optimization} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId`]: ({ optimizationId }) => {
    const optimization = state.getOptimization(optimizationId);
    assertStateObjects(optimization);
    return <CardOptimization optimization={optimization} />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/overrides/player-select`]: ({
    optimizationId,
  }) => {
    const optimization = state.getOptimization(optimizationId);
    assertStateObjects(optimization);
    return (
      <CardPlayerSelect
        optimization={optimization}
        selected={JSON.parse(optimization.playerList)}
        players={state.getAllPlayersAlphabetically()}
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
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/overrides/import-lineup`]: ({
    optimizationId,
  }) => {
    const optimization = state.getOptimization(optimizationId);
    assertStateObjects(optimization);
    return <CardOptimizationLineupImport optimization={optimization} />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/overrides/:playerId`]: ({
    optimizationId,
    playerId,
  }) => {
    const optimization = state.getOptimization(optimizationId);
    const player = state.getPlayer(playerId);
    assertStateObjects(optimization, player);
    return (
      <CardOptimizationStatsOverride
        player={player}
        optimization={optimization}
      />
    );
  },
  [`${ROUTE_PREFIX}/account`]: () => {
    return <CardAccount />;
  },
  [`${ROUTE_PREFIX}/public-teams/:publicTeamId/stats`]: ({
    data,
    loading,
    error,
    publicTeamId,
    teamId,
  }) => {
    return renderWhileLoading({ loading, error })(() => {
      return (
        <CardStats
          state={data}
          team={data.teams[0]}
          routingMethod="statsPage"
          publicTeamId={publicTeamId}
        />
      );
    });
  },
  [`${ROUTE_PREFIX}/public-teams/:publicTeamId/stats/player/:playerId`]: ({
    data,
    loading,
    error,
    publicTeamId,
    playerId,
  }) => {
    return renderWhileLoading({ loading, error })(() => {
      const player = data.players.reduce((prev, player) => {
        return player.id === playerId ? player : prev;
      }, null);

      const team = data.teams[0];

      const playerPlateAppearances = state.getPlateAppearancesForPlayerOnTeam(
        playerId,
        team.id,
        data
      );

      return (
        <CardSpray
          team={team}
          player={player}
          plateAppearances={playerPlateAppearances}
          backNavUrl={`/public-teams/${publicTeamId}/stats`}
        />
      );
    });
  },
};

export default routes;
