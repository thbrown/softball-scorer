import React from 'react';
import Card from 'elements/card';
import ListPicker from 'elements/list-picker';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import { setRoute } from 'actions/route';

const LineupPicker = ({ gameId, teamId }) => {
  const handleItemClick = (item) => {
    const opt = getGlobalState().getOptimization(item.id);
    try {
      const optResult = opt.resultData;
      let newLineup = [...optResult.flatLineup];
      const game = getGlobalState().getGame(gameId);
      getGlobalState().replaceGame(gameId, teamId, {
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
            return opt.resultData !== '{}';
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
