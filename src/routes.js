import React from 'react';
import { getGlobalState, setGlobalState, resetGlobalState } from 'state';
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
import CardPlayerSelect from 'cards/card-player-select';
import CardPlayerStats from 'cards/card-player-stats';
import CardReset from 'cards/card-reset';
import CardSignup from 'cards/card-signup';
import CardSpray from 'cards/card-spray';
import CardStatsPrivate from 'cards/card-stats-private';
import CardStatsPublic from 'cards/card-stats-public';
import CardTeam from 'cards/card-team';
import CardTeamEdit from 'cards/card-team-edit';
import CardTeams from 'cards/card-teams';
import CardVerifyEmail from 'cards/card-verify-email';
import CardLineupImport from 'cards/card-lineup-import';
import CardLineupImporter from 'cards/card-lineup-importer';
import CardOptimizerSelect from 'cards/card-optimizer-select';
import { goBack, setRoute } from 'actions/route';
import { findPreviousObject } from 'utils/functions';

// possibility to add '/app/' here?
export const ROUTE_PREFIX = '';

const assertStateObjects = function (...args) {
  let valid = true;
  const errors = [];
  args.forEach((val) => {
    if (!val) {
      valid = false;
      errors.push(
        new Error(
          `[ROUTES] 404 - Invalid field ${val} in ` + JSON.stringify(args)
        )
      );
    }
  });
  return { valid, errors };
};

const isSameRouteAs = function (key) {
  return (props) => {
    return routes[ROUTE_PREFIX + key](props);
  };
};

const renderWhileLoading = function ({ loading, error }) {
  return (Component) => {
    if (loading) {
      return <CardLoading />;
    } else if (error) {
      return <CardNotFound />;
    } else {
      return Component();
    }
  };
};

const routes = {
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
  [`${ROUTE_PREFIX}/index.dev.html`]: () => {
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
    return <CardTeams />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId`]: ({ teamId, search }) => {
    const team = getGlobalState().getTeam(teamId);
    const { valid, errors } = assertStateObjects(team);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardTeam team={team} tab={'games'} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games`]: isSameRouteAs('/teams/:teamId'),
  [`${ROUTE_PREFIX}/teams/:teamId/edit`]: ({ teamId, search: { isNew } }) => {
    const team = getGlobalState().getTeam(teamId); // TODO: revisit this, what happens if this page is loaded via external link
    const { valid, errors } = assertStateObjects(team);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardTeamEdit team={team} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/stats`]: ({ teamId }) => {
    const team = getGlobalState().getTeam(teamId);
    const { valid, errors } = assertStateObjects(team);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return (
      <CardTeam team={team} tab="stats" subtab={CardStatsPrivate.SEASON_TAB} />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/stats/:subtab`]: ({ teamId, subtab }) => {
    const team = getGlobalState().getTeam(teamId);
    const { valid, errors } = assertStateObjects(team);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardTeam team={team} tab="stats" subtab={subtab} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/stats/player/:playerId`]: ({
    teamId,
    playerId,
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const player = getGlobalState().getPlayer(playerId);
    const decoratedPlayerPlateAppearances =
      getGlobalState().getDecoratedPlateAppearancesForPlayerOnTeam(
        playerId,
        teamId
      );
    const { valid, errors } = assertStateObjects(
      team,
      player,
      decoratedPlayerPlateAppearances
    );
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return (
      <CardSpray
        team={team}
        player={player}
        decoratedPlateAppearances={decoratedPlayerPlateAppearances}
      />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId`]: ({ teamId, gameId }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardGame team={team} game={game} tab="lineup" />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/lineup`]: isSameRouteAs(
    '/teams/:teamId/games/:gameId'
  ),
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/scorer`]: ({
    teamId,
    gameId,
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardGame team={team} game={game} tab="scorer" />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/stats/games/:gameId`]: ({
    teamId,
    gameId,
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return (
      <CardTeam
        team={team}
        tab="stats"
        subtab={CardStatsPrivate.GAME_STATS_TAB}
        game={game}
      />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/import`]: ({
    teamId,
    gameId,
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardLineupImporter teamId={team.id} gameId={game.id} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/import-lineup`]: ({
    teamId,
    gameId,
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }

    let onConfirm = (ev, targetTeam, targetGame) => {
      console.log('Importing', game.lineup);
      getGlobalState().setGameLineup(game.id, targetGame.lineup); // TODO: do we need to deep copy here?
      goBack(2);
    };

    let onCancel = (ev) => {
      goBack();
    };

    return (
      <CardLineupImport
        handleConfirmClick={onConfirm}
        handleCancelClick={onCancel}
      />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/player-select`]: ({
    teamId,
    gameId,
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }

    return (
      <CardPlayerSelect
        selected={game.lineup ? game.lineup : []}
        players={getGlobalState().getAllPlayersAlphabetically()}
        onComplete={(players) => {
          getGlobalState().setGameLineup(game.id, players);
        }}
        onImportClick={function () {
          setRoute(`/teams/${team.id}/games/${game.id}/import-lineup`);
        }}
      />
    );
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/edit`]: ({
    teamId,
    gameId,
    search: { isNew },
  }) => {
    const team = getGlobalState().getTeam(teamId);
    const game = getGlobalState().getGame(gameId);
    const { valid, errors } = assertStateObjects(team, game);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardGameEdit team={team} game={game} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId`]:
    ({ teamId, gameId, plateAppearanceId, search: { isNew } }) => {
      const team = getGlobalState().getTeam(teamId);
      const game = getGlobalState().getGame(gameId);
      const previousPlateAppearance = findPreviousObject(
        getGlobalState().getPlateAppearancesForGame(gameId),
        plateAppearanceId
      );
      const plateAppearance =
        getGlobalState().getPlateAppearance(plateAppearanceId);
      const plateAppearances =
        getGlobalState().getPlateAppearancesForPlayerInGame(
          plateAppearance?.playerId,
          gameId
        );
      const player = getGlobalState().getPlayer(plateAppearance?.playerId);
      const { valid, errors } = assertStateObjects(
        team,
        game,
        plateAppearance,
        plateAppearances,
        player
      );
      if (!valid) {
        console.warn(errors);
        return <CardNotFound />;
      }

      return (
        <CardPlateAppearance
          team={team}
          game={game}
          remove={function () {
            getGlobalState().removePlateAppearance(plateAppearance.id, game.id);
          }}
          replace={function (newPa) {
            getGlobalState().replacePlateAppearance(
              plateAppearance.id,
              game.id,
              team.id,
              newPa
            );
          }}
          player={player}
          previousPlateAppearance={previousPlateAppearance}
          plateAppearance={plateAppearance}
          plateAppearances={plateAppearances}
          isNew={isNew}
          origin={'game'}
        />
      );
    },
  [`${ROUTE_PREFIX}/teams/:teamId/games/:gameId/scorer/plateAppearances/:plateAppearanceId`]:
    isSameRouteAs(
      '/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId'
    ),
  [`${ROUTE_PREFIX}/players`]: () => {
    return <CardPlayerList />;
  },
  [`${ROUTE_PREFIX}/players/:playerId`]: ({ playerId }) => {
    const player = getGlobalState().getPlayer(playerId);
    const { valid, errors } = assertStateObjects(player);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardPlayerStats player={player} />;
  },
  [`${ROUTE_PREFIX}/players/:playerId/edit`]: ({
    playerId,
    search: { isNew },
  }) => {
    const player = getGlobalState().getPlayer(playerId);
    const { valid, errors } = assertStateObjects(player);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }

    return <CardPlayerEdit player={player} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/optimizations`]: () => {
    return <CardOptimizationList />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/edit`]: ({
    optimizationId,
    search: { isNew },
  }) => {
    const optimization = getGlobalState().getOptimization(optimizationId);
    const { valid, errors } = assertStateObjects(optimization);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardOptimizationEdit optimization={optimization} isNew={isNew} />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId`]: ({ optimizationId }) => {
    const optimization = getGlobalState().getOptimization(optimizationId);
    const { valid, errors } = assertStateObjects(optimization);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return <CardOptimization optimization={optimization} />;
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/player-select`]: ({
    optimizationId,
  }) => {
    const optimization = getGlobalState().getOptimization(optimizationId);
    const { valid, errors } = assertStateObjects(optimization);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return (
      <CardPlayerSelect
        selected={optimization.playerList}
        players={getGlobalState().getAllPlayersAlphabetically()}
        onComplete={(players) => {
          getGlobalState().setOptimizationField(
            optimization.id,
            'playerList',
            players
          );
        }}
        onImportClick={function () {
          setRoute(`/optimizations/${optimization.id}/import-lineup`);
        }}
      />
    );
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/import-lineup`]: ({
    optimizationId,
  }) => {
    const optimization = getGlobalState().getOptimization(optimizationId);
    const { valid, errors } = assertStateObjects(optimization);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    let onConfirm = (ev, team, game) => {
      getGlobalState().setOptimizationField(
        optimization.id,
        'playerList',
        game.lineup
      );
      goBack(2);
    };

    let onCancel = (ev) => {
      goBack();
    };

    return (
      <CardLineupImport
        handleConfirmClick={onConfirm}
        handleCancelClick={onCancel}
      />
    );
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/overrides/:playerId`]: ({
    optimizationId,
    playerId,
  }) => {
    const optimization = getGlobalState().getOptimization(optimizationId);
    const player = getGlobalState().getPlayer(playerId);
    const { valid, errors } = assertStateObjects(optimization, player);
    if (!valid) {
      console.warn(errors);
      return <CardNotFound />;
    }
    return (
      <CardOptimizationStatsOverride
        player={player}
        optimization={optimization}
      />
    );
  },
  [`${ROUTE_PREFIX}/optimizations/:optimizationId/overrides/:playerId/plateAppearances/:plateAppearanceId`]:
    ({ optimizationId, playerId, plateAppearanceId, search: { isNew } }) => {
      resetGlobalState();
      const optimization = getGlobalState().getOptimization(optimizationId);
      const player = getGlobalState().getPlayer(playerId);

      const plateAppearances =
        getGlobalState().getOptimizationOverridesForPlayer(
          optimizationId,
          playerId
        );

      const plateAppearance =
        getGlobalState().getOptimizationOverridePlateAppearance(
          plateAppearanceId
        );

      const previousPlateAppearance = findPreviousObject(
        plateAppearances,
        plateAppearanceId
      );

      const { valid, errors } = assertStateObjects(
        optimization,
        player,
        plateAppearance
      );
      if (!valid) {
        console.warn(errors);
        return <CardNotFound />;
      }
      return (
        <CardPlateAppearance
          remove={function () {
            getGlobalState().removeOptimizationOverridePlateAppearance(
              optimizationId,
              playerId,
              plateAppearanceId
            );
          }}
          replace={function (newPa) {
            getGlobalState().replaceOptimizationOverridePlateAppearance(
              optimizationId,
              playerId,
              newPa.id,
              newPa
            );
          }}
          player={player}
          previousPlateAppearance={previousPlateAppearance}
          plateAppearance={plateAppearance}
          plateAppearances={plateAppearances}
          isNew={isNew}
          origin={'optimization'}
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
      setGlobalState(data);
      console.log(
        '[GLOBAL_STATE] Global state teams',
        getGlobalState().getAllTeams()
      );
      const team = getGlobalState().getAllTeams()[0];
      const { valid, errors } = assertStateObjects(team);
      if (!valid) {
        console.warn(errors);
        return <CardNotFound />;
      }

      return <CardStatsPublic team={team} tab={CardStatsPublic.SEASON_TAB} />;
    });
  },
  [`${ROUTE_PREFIX}/public-teams/:publicTeamId/stats/season`]: ({
    data,
    loading,
    error,
    publicTeamId,
    teamId,
    tab,
  }) => {
    return renderWhileLoading({ loading, error })(() => {
      setGlobalState(data);
      const team = data.teams[0];
      const { valid, errors } = assertStateObjects(team);
      if (!valid) {
        console.warn(errors);
        return <CardNotFound />;
      }
      return (
        <CardStatsPublic
          team={team}
          tab={CardStatsPublic.SEASON_TAB}
          inputState={data}
        />
      );
    });
  },
  [`${ROUTE_PREFIX}/public-teams/:publicTeamId/stats/games`]: ({
    data,
    loading,
    error,
    publicTeamId,
    teamId,
    tab,
  }) => {
    return renderWhileLoading({ loading, error })(() => {
      setGlobalState(data);

      const team = data.teams[0];
      const game = team.games[0];
      const { valid, errors } = assertStateObjects(team); // Game can be undefined
      if (!valid) {
        console.warn(errors);
        return <CardNotFound />;
      }
      return (
        <CardStatsPublic
          team={team}
          tab={CardStatsPublic.GAME_STATS_TAB}
          game={game}
          inputState={data}
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
      setGlobalState(data);

      //const player = data.players.reduce((prev, player) => {
      //  return player.id === playerId ? player : prev;
      //}, null);
      const player = getGlobalState().getPlayer(playerId);
      const team = getGlobalState().getAllTeams()[0];

      const decoratedPlayerPlateAppearances =
        getGlobalState().getDecoratedPlateAppearancesForPlayerOnTeam(
          playerId,
          team.id,
          data
        );

      return (
        <CardSpray
          team={team}
          player={player}
          decoratedPlateAppearances={decoratedPlayerPlateAppearances}
          backNavUrl={`/public-teams/${publicTeamId}/stats`}
        />
      );
    });
  },
  [`${ROUTE_PREFIX}/public-teams/:publicTeamId/stats/games/:gameId`]: ({
    data,
    loading,
    error,
    publicTeamId,
    gameId,
  }) => {
    return renderWhileLoading({ loading, error })(() => {
      setGlobalState(data);
      const team = data.teams[0];
      const game = getGlobalState().getGame(gameId);
      const { valid, errors } = assertStateObjects(team, game);
      if (!valid) {
        console.warn(errors);
        return <CardNotFound />;
      }
      return (
        <CardStatsPublic
          team={team}
          tab={CardStatsPublic.GAME_STATS_TAB}
          game={game}
          inputState={data}
        />
      );
    });
  },
  [`${ROUTE_PREFIX}/account/select-optimizers`]: () => {
    return <CardOptimizerSelect />;
  },
};

// All routes use the default globalState by default.
// Individual routes can override this behavior in their respective functions.
for (let i = 0; i < routes.length; i++) {
  routes[i] = (inputArgs) => {
    resetGlobalState();
    console.log('[GLOBAL_STATE] resetting globalState');
    routes[i](inputArgs);
  };
  console.log('[GLOBAL_STATE] replacing state with default fxn', i);
}

export default routes;
