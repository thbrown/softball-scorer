import { GlobalState } from 'state';
import mockData from './mock.json';
import SharedLib from 'shared-lib';
import StateIndex from 'state-index';
import StateContainer from 'state-container';

describe('Does the StateIndex class work', () => {
  it('Can select a Plate Appearance', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getPa('2IHrEOVC4hfUTI')).not.toEqual(undefined);
  });

  it(`Can select a Plate Appearance's Team`, () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getTeamForPa('2IHrEOVC4hfUTI')).not.toEqual(undefined);
  });

  it(`Can select a Plate Appearance's Game`, () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getGameForPa('2IHrEOVC4hfUTI')).not.toEqual(undefined);
  });

  it('Lookup to deleted Plate Appearance will return undefined', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    const globalState = new GlobalState(stateContainer, stateIndex);

    // Delete the PA
    const game = stateIndex.getGameForPa('2IHrEOVC4hfUTI');
    globalState.removePlateAppearance('2IHrEOVC4hfUTI', game.id);

    // Make sure it's invalid in the index
    expect(stateIndex.getPa('2IHrEOVC4hfUTI')).toEqual(undefined);
  });

  it('Can select Game', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getGame('4')).not.toEqual(undefined);
  });

  it('Can select Team for Game', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getTeamForGame('4')).not.toEqual(undefined);
  });

  it('Can select Team', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getTeam('4i7WarrEmtZMxJ')).not.toEqual(undefined);
  });

  it('Can select Player', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getPlayer('4RU3Lh3zwMKAKY')).not.toEqual(undefined);
  });

  it('Can select Optimization', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getOptimization('3NSGvYhAAtiCCc')).not.toEqual(undefined);
  });

  it('Can select an Optimization for a PA', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getOptimizationForPa('3RLrHvbYmi4QT5')).not.toEqual(
      undefined
    );
  });

  it('Can select a PA from an optimization', () => {
    const stateContainer = new StateContainer(mockData);
    const stateIndex = new StateIndex(stateContainer);
    expect(stateIndex.getPaFromOptimization('3RLrHvbYmi4QT5')).not.toEqual(
      undefined
    );
  });
});
