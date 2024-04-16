import React, { useMemo } from 'react';
import { Optimization } from 'shared-lib/types';
import { getGlobalState } from 'state';

interface DisplayPlayer {
  isOverride: boolean;
  name: string;
  playerId: string;
  outs?: number;
  singles?: number;
  doubles?: number;
  triples?: number;
  homeruns?: number;
}

const OptimizationPlayerStatsTable = (props: {
  isOptEditable: boolean;
  optimization: Optimization;
  handleOverrideClick: (playerId: string) => void;
}) => {
  // Build players table
  const playerTable: React.JSX.Element[] = [
    <tr key="header" className="title">
      <th
        style={{
          height: '35',
        }}
      >
        Name
      </th>
      <th
        style={{
          width: '40',
        }}
      >
        Outs
      </th>
      <th
        style={{
          width: '35',
        }}
      >
        1B
      </th>
      <th
        style={{
          width: '35',
        }}
      >
        2B
      </th>
      <th
        style={{
          width: '35',
        }}
      >
        3B
      </th>
      <th
        style={{
          width: '35',
        }}
      >
        HR
      </th>
      {props.isOptEditable ? (
        <th
          style={{
            width: '48',
          }}
        />
      ) : (
        false // Don't show the last column for already started optimizations
      )}
    </tr>,
  ];

  const displayPlayers: DisplayPlayer[] = [];
  const playerIds = props.optimization.playerList as string[];
  const teamIds = props.optimization.teamList as string[];
  const overrideData = props.optimization.overrideData;

  // calculating stats is an expensive operation
  const stats = useMemo(() => {
    return getGlobalState().getActiveStatsForAllPlayers(
      overrideData,
      playerIds,
      teamIds
    );
  }, [overrideData, playerIds, teamIds]);

  for (let i = 0; i < playerIds.length; i++) {
    const displayPlayer: DisplayPlayer = {
      isOverride: false,
      name: '',
      playerId: '',
    };
    Object.assign(displayPlayer, stats[playerIds[i]]);

    const existingOverride = overrideData[playerIds[i]];
    if (existingOverride && existingOverride.length !== 0) {
      displayPlayer.isOverride = true;
    } else {
      displayPlayer.isOverride = false;
    }

    const player = getGlobalState().getPlayer(playerIds[i]);
    if (player) {
      displayPlayer.name = player.name;
    } else {
      displayPlayer.name = '<Player was deleted>';
    }
    displayPlayer.playerId = playerIds[i];
    displayPlayers.push(displayPlayer);
  }

  for (let i = 0; i < displayPlayers.length; i++) {
    playerTable.push(
      <tr
        key={'row' + i}
        className={displayPlayers[i].isOverride ? 'overridden' : undefined}
      >
        <td height="48" className="name">
          {displayPlayers[i].name}
        </td>
        <td>{displayPlayers[i].outs}</td>
        <td>{displayPlayers[i].singles}</td>
        <td>{displayPlayers[i].doubles}</td>
        <td>{displayPlayers[i].triples}</td>
        <td>{displayPlayers[i].homeruns}</td>
        {props.isOptEditable ? (
          <td height="48">
            <img
              src="/assets/tune-black.svg"
              alt=">"
              className="tableButton"
              onClick={() =>
                props.handleOverrideClick(displayPlayers[i].playerId)
              }
            />
          </td>
        ) : (
          false // Don't show override column for optimizations that have already started
        )}
      </tr>
    );
  }

  return (
    <table className="playerTable">
      <tbody>{playerTable}</tbody>
    </table>
  );
};

export default OptimizationPlayerStatsTable;
