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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optResult = opt!.resultData as any;
      let newLineup = [...optResult.flatLineup];
      const game = getGlobalState().getGame(gameId as GameId)!;
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
          .filter((opt) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (opt.resultData as any) !== '{}';
          })
          .reverse()
          .map(({ name, id }) => {
            return { name, id };
          })}
      />
    </Card>
  );
};

export default LineupPicker;
