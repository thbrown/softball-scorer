import React from 'react';
import Card from 'elements/card';
import ListPicker from 'elements/list-picker';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import { GameId, OptimizationId, TeamId } from 'types/branded-ids';

interface LineupPickerProps {
  gameId: string;
  teamId: string;
}

interface ListPickerItem {
  id: string;
  name: string;
}

const LineupPicker = ({ gameId, teamId }: LineupPickerProps) => {
  const handleItemClick = (item: ListPickerItem) => {
    const opt = getGlobalState().getOptimization(item.id as OptimizationId);
    try {
      if (!opt) throw new Error('Optimization not found');
      const flatLineup = opt.resultData['flatLineup'] as string[] | undefined;
      if (!flatLineup) throw new Error('Optimization has no flatLineup result');
      let newLineup = [...flatLineup];
      const game = getGlobalState().getGame(gameId as GameId);
      if (!game) throw new Error('Game not found');
      getGlobalState().replaceGame(gameId as GameId, teamId as TeamId, {
        ...game,
        lineup: newLineup,
      });
    } catch (e) {
      console.error(e);
      dialog.show_notification('Failed to import lineup.');
    }

    setRoute(`/teams/${teamId}/games/${gameId}`);
  };

  return (
    <Card title="Import Lineup">
      <ListPicker
        onClick={handleItemClick}
        items={getGlobalState()
          .getAllOptimizations()
          .filter((opt) => opt.resultData['flatLineup'] !== undefined)
          .reverse()
          .map(({ name, id }) => {
            return { name, id };
          })}
      />
    </Card>
  );
};

export default LineupPicker;
