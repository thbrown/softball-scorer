import React from 'react';
import dialog from 'dialog';
import SharedLib from 'shared-lib';
import type { TopLevelExport, PlateAppearance, PlayerId } from 'shared-lib';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import { setRoute } from 'actions/route';
import PlayerMapping from 'components/player-mapping';

const TLSchemas = SharedLib.schemaValidation.TLSchemas;

type Runners = NonNullable<PlateAppearance['runners']>;

function applyPlayerMapping(
  data: TopLevelExport,
  mapping: Record<string, string>
): TopLevelExport {
  const replaceId = (id: string): PlayerId => (mapping[id] ?? id) as PlayerId;

  data.players = data.players.filter((p) => !mapping[p.id]);

  for (const team of data.teams) {
    for (const game of team.games) {
      game.lineup = game.lineup.map(replaceId);
      for (const pa of game.plateAppearances) {
        pa.playerId = replaceId(pa.playerId);
        remapRunners(pa, replaceId);
      }
    }
  }
  return data;
}

function remapRunners(pa: PlateAppearance, replaceId: (id: string) => string): void {
  if (!pa.runners) return;
  const runners: Runners = pa.runners;
  for (const base of ['1B', '2B', '3B'] as const) {
    if (runners[base]) runners[base] = replaceId(runners[base]!);
  }
  if (runners.scored) runners.scored = runners.scored.map(replaceId);
  if (runners.out) runners.out = runners.out.map(replaceId) as Runners['out'];
}

const CardImport = () => {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [loadType, setLoadType] = React.useState('mine');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = React.useState<TopLevelExport | null>(null);
  const [playerMapping, setPlayerMapping] = React.useState<Record<string, string | null>>({});

  const localPlayers = getGlobalState().getAllPlayersAlphabetically();

  const handleFileInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsedData(null);
    setPlayerMapping({});
    const reader = new FileReader();
    reader.onload = function (e) {
      let parsed: TopLevelExport;
      try {
        parsed = JSON.parse(e.target?.result as string) as TopLevelExport;
        const result = SharedLib.schemaMigration.updateSchema(null, parsed, 'export');
        if (result === 'ERROR') throw new Error('Invalid file format');
        SharedLib.schemaValidation.validateSchema(parsed, TLSchemas.EXPORT);
      } catch (exception) {
        dialog.show_notification(
          'There was an error while parsing file input: ' + (exception as Error).message
        );
        console.error(exception);
        return;
      }
      const localIds = new Set(getGlobalState().getAllPlayers().map((p) => p.id));
      const initialMapping: Record<string, string | null> = {};
      for (const p of parsed.players) {
        if (!localIds.has(p.id)) initialMapping[p.id] = null;
      }
      setParsedData(parsed);
      setPlayerMapping(initialMapping);
    };
    reader.readAsText(file);
  };

  const handleRadioClick = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setLoadType(ev.target.value);
  };

  const handleLoadClick = () => {
    if (!parsedData) {
      dialog.show_notification('Please select a file first.');
      return;
    }

    const activeMapping: Record<string, string> = {};
    for (const [importId, localId] of Object.entries(playerMapping)) {
      if (localId) activeMapping[importId] = localId;
    }

    const data = applyPlayerMapping(
      JSON.parse(JSON.stringify(parsedData)) as TopLevelExport,
      activeMapping
    );

    if (loadType === 'mine') {
      const patchToLocal = SharedLib.objectMerge.diff(data, getGlobalState().getLocalState());
      const copy = JSON.parse(JSON.stringify(data)) as TopLevelExport;
      const patched = SharedLib.objectMerge.patch(copy, patchToLocal, true, true);
      getGlobalState().setLocalState(patched);
    } else if (loadType === 'theirs') {
      const localToPatch = SharedLib.objectMerge.diff(getGlobalState().getLocalState(), data);
      const copy = JSON.parse(JSON.stringify(getGlobalState().getLocalState()));
      const patched = SharedLib.objectMerge.patch(copy, localToPatch, true, true);
      patched.metadata.scope = 'client';
      getGlobalState().setLocalState(patched);
    } else {
      dialog.show_notification('Please select load type option before clicking "Load".');
      return;
    }
    dialog.show_notification('Your data has successfully been merged with the existing data.');
    setRoute('/teams');
  };

  return (
    <Card title="Load from File">
      <CardSection isCentered={true}>
        <div style={{ maxWidth: '500px' }}>
          <div>
            <b>
              <div style={{ textAlign: 'left', margin: '0px 16px' }}>
                Import data data that&apos;s been downloaded from{' '}
                <span
                  style={{
                    textDecoration: 'underline',
                    color: 'var(--color-primary-dark)',
                  }}
                >
                  Softball.app&apos;s
                </span>{' '}
                export feature. Any data imported here will be merged with your existing data.
              </div>
            </b>
          </div>
          <br />
          <div className="import-file-input-container">
            <input
              className="import-file-input"
              ref={fileInputRef}
              type="file"
              name="fileData"
              id="fileData"
              onChange={handleFileInputChange}
            />
            <label htmlFor="fileData" className="button import-file-input-button">
              {fileName
                ? fileName
                : 'First, tap to choose a file or click-and-drag one here.'}
            </label>
          </div>

          {parsedData && (
            <PlayerMapping
              importData={parsedData}
              localPlayers={localPlayers}
              mapping={playerMapping}
              onMappingChange={setPlayerMapping}
            />
          )}

          <div>Next, select what happens in case of a merge conflict:</div>
          <div className="import-radio-buttons-container">
            <div className="radio-button-option">
              <input
                id="myChoice"
                type="radio"
                name="loadType"
                value="mine"
                onChange={handleRadioClick}
                checked={loadType === 'mine'}
              />
              <label className="dark-text" htmlFor="myChoice">
                My changes win
              </label>
            </div>
            <div className="radio-button-option">
              <input
                id="theirChoice"
                type="radio"
                name="loadType"
                value="theirs"
                onChange={handleRadioClick}
                checked={loadType === 'theirs'}
              />
              <label className="dark-text" htmlFor="theirChoice">
                Their changes win
              </label>
            </div>
          </div>
          <div>Lastly, click the load button to make it official:</div>
          <div className="import-file-input-container">
            <div
              id="load"
              className={
                'button primary-button ' +
                (fileName ? 'import-load-button' : 'import-load-button-disabled')
              }
              onClick={handleLoadClick}
            >
              Load
            </div>
          </div>
        </div>
      </CardSection>
    </Card>
  );
};

export default CardImport;
