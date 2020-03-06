import React from 'react';
import Card from 'elements/card';
import ListPicker from 'elements/list-picker';
import state from 'state';
import dialog from 'dialog';
import { setRoute } from 'actions/route';

const LineupPicker = ({ gameId, teamId }) => {
  const handleItemClick = item => {
    const opt = state.getOptimization(item.id);
    try {
      const results = JSON.parse(opt.resultData);
      console.log('RESULTS', results);
      let newLineup = [];
      if (results.lineup.GroupA && results.lineup.GroupB) {
        for (
          let i = 0;
          i <
          Math.max(results.lineup.GroupA.length, results.lineup.GroupB.length);
          i++
        ) {
          const aId = results.lineup.GroupA[i];
          const bId = results.lineup.GroupB[i];
          console.log('IDS', aId, bId);
          if (aId) {
            newLineup.push(aId);
          }
          if (bId) {
            newLineup.push(bId);
          }
        }
      } else if (results.lineup.GroupA) {
        newLineup = [...results.lineup.GroupA];
      }
      const game = state.getGame(gameId);
      console.log('REPLACE GAME!', game, newLineup);
      state.replaceGame(gameId, teamId, {
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
        items={state
          .getAllOptimizations()
          .filter(opt => {
            return opt.resultData !== '{}';
          })
          .reverse()
          .map(({ name, id }, i) => {
            return { name, id };
          })}
      />
    </Card>
  );
};

export default LineupPicker;
