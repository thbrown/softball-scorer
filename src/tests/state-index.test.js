import state from 'state';
import mockData from './mock.json';
import SharedLib from 'shared-lib';
import StateIndex from 'state-index';

describe('Does the StateIndex class work', () => {
  it('Can select a Plate Appearance', () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getPa('2IHrEOVC4hfUTI')).not.toEqual(undefined);
  });

  it(`Can select a Plate Appearance's Team`, () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getTeamForPa('2IHrEOVC4hfUTI')).not.toEqual(undefined);
  });

  it(`Can select a Plate Appearance's Game`, () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getGameForPa('2IHrEOVC4hfUTI')).not.toEqual(undefined);
  });

  it('Lookup to deleted Plate Appearance will return undefined', async () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    await state.setLocalState(mockData);
    const stateIndex = new StateIndex(stateObject);
    const game = stateIndex.getGameForPa('2IHrEOVC4hfUTI');

    // Delete the PA
    state.removePlateAppearance('2IHrEOVC4hfUTI', game.id);

    // Make sure it's invalid in the index
    expect(stateIndex.getPa('2IHrEOVC4hfUTI')).toEqual(undefined);
  });

  // TODO
  it('Can select Game', () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getGame('4')).not.toEqual(undefined);
  });

  it('Can select Team for Game', () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getTeamForGame('4')).not.toEqual(undefined);
  });

  it('Can select Team', () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getTeam('4i7WarrEmtZMxJ')).not.toEqual(undefined);
  });

  it('Can select Player', () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getPlayer('4RU3Lh3zwMKAKY')).not.toEqual(undefined);
  });

  it('Can select Optimization', () => {
    const stateObject = mockData;
    SharedLib.schemaMigration.updateSchema(null, stateObject, 'client');
    const stateIndex = new StateIndex(stateObject);
    expect(stateIndex.getOptimization('3NSGvYhAAtiCCc')).not.toEqual(undefined);
  });
});
