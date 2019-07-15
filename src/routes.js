import React from 'react';
import state from 'state';
import CardAuth from 'card-auth';
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

let routes;

const assertStateObject = function(...args) {
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

const isSameRouteAs = function(key, routes) {
  return props => {
    routes[key](props);
  };
};

routes = {
  '/': () => {
    return <CardMenu />;
  },
  '/menu': isSameRouteAs('/', routes),
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
    assertStateObject(team);
    return <CardTeam team={team} tab="games" />;
  },
  '/teams/:teamId/games': isSameRouteAs('/teams/:teamId', routes),
  '/teams/:teamId/edit': ({ teamId, isNew }) => {
    const team = state.getTeam(teamId); // TODO: revisit this, what happens if this page is loaded via external link
    assertStateObject(team);
    return <CardTeamEdit team={team} isNew={isNew} />;
  },
  '/teams/:teamId/stats': ({ teamId }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
    return <CardTeam team={team} tab="stats" />;
  },
  '/teams/:teamId/stats/player/:playerId': ({ teamId, playerId }) => {
    const team = state.getTeam(teamId);
    const player = state.getPlayer(playerId);
    assertStateObject(team);
    assertStateObject(player);
    return <CardSpray team={team} player={player} origin="stats" />;
  },
  '/teams/:teamId/games/:gameId': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/teams/:teamId/games/:gameId/lineup': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/teams/:teamId/games/:gameId/scorer': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/teams/:teamId/games/:gameId/player-selection': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/teams/:teamId/games/:gameId/edit': ({ teamId, gameId }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId': ({
    teamId,
    gameId,
    plateAppearanceId,
  }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/teams/:teamId/games/:gameId/scorer/plateAppearances/:plateAppearanceId': ({
    teamId,
    gameId,
    plateAppearanceId,
  }) => {
    const team = state.getTeam(teamId);
    assertStateObject(team);
  },
  '/players': () => {},
  '/players/:playerId': ({ playerId }) => {
    const player = state.getPlayer(playerId);
    assertStateObject(player);
  },
  '/players/:playerId/edit': ({ playerId }) => {
    const player = state.getPlayer(playerId);
    assertStateObject(player);
  },
  '/optimizations': () => {},
  '/optimizations/:optimizationId/edit': ({ optimizationId }) => {},
  '/optimizations/:optimizationId': ({ optimizationId }) => {},
  '/optimizations/:optimizationId/overrides/player-select': ({
    optimizationId,
  }) => {},
  '/optimizations/:optimizationId/overrides/:playerId': ({
    optimizationId,
    playerId,
  }) => {},
  '/stats/:statsId/': ({ statsId }) => {},
};

export default routes;
