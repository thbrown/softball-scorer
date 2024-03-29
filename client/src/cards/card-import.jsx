import React from 'react';
import dialog from 'dialog';
import SharedLib from 'shared-lib';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import { setRoute } from 'actions/route';
import { makeStyles } from 'css/helpers';
import css from 'css';

const TLSchemas = SharedLib.schemaValidation.TLSchemas;

const useStyles = makeStyles((theme) => {
  return {
    fileInputContainer: {
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'row',
      position: 'relative',
    },
    fileInputButton: {
      width: '100%',
      color: theme.colors.TEXT_DARK,
      background: theme.colors.BACKGROUND,
      border: '2px dotted ' + theme.colors.PRIMARY_LIGHT,
    },
    fileInput: {
      position: 'absolute',
      left: 0,
      opacity: 0,
      top: 0,
      bottom: 0,
      width: '100%',
      cursor: 'pointer',
    },
    radioButtonsContainer: {
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: theme.spacing.small,
      margin: '1rem',
    },
    loadButton: {
      width: '120px',
    },
    loadButtonDisabled: {
      width: '120px',
      backgroundColor: theme.colors.DISABLED,
      cursor: 'default',
      // prevents the default button hover
      '&:hover': {
        filter: 'brightness(100%)',
      },
    },
  };
});

const CardImport = () => {
  const { classes } = useStyles();
  const [fileName, setFileName] = React.useState(null);
  const [loadType, setLoadType] = React.useState('mine');
  const fileInputRef = React.useRef(null);
  const handleFileInputChange = (ev) => {
    setFileName(ev.target.files[0].name);
  };
  const handleRadioClick = (ev) => {
    setLoadType(ev.target.value);
  };
  const handleLoadClick = () => {
    const file = fileInputRef.current.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        let parsedData;
        try {
          parsedData = JSON.parse(e.target.result);

          // Update the schema
          let result = SharedLib.schemaMigration.updateSchema(
            null,
            parsedData,
            'export'
          );

          if (result === 'ERROR') {
            throw new Error(`Invalid file format`);
          }

          // Now validate the schema
          SharedLib.schemaValidation.validateSchema(
            parsedData,
            TLSchemas.EXPORT
          );
        } catch (exception) {
          dialog.show_notification(
            'There was an error while parsing file input: ' + exception.message
          );
          console.error(exception);
          return;
        }

        if (loadType === 'mine') {
          const patchToLocal = SharedLib.objectMerge.diff(
            parsedData,
            getGlobalState().getLocalState()
          );
          let copy = JSON.parse(JSON.stringify(parsedData));
          let patched = SharedLib.objectMerge.patch(
            copy,
            patchToLocal,
            true,
            true
          );

          getGlobalState().setLocalState(patched);
        } else if (loadType === 'theirs') {
          const localToPatch = SharedLib.objectMerge.diff(
            getGlobalState().getLocalState(),
            parsedData
          );
          let copy = JSON.parse(
            JSON.stringify(getGlobalState().getLocalState())
          );
          let patched = SharedLib.objectMerge.patch(
            copy,
            localToPatch,
            true,
            true
          );

          // Changes in the patch win, so we need changes this from "export" to "client" manually
          patched.metadata.scope = 'client';

          getGlobalState().setLocalState(patched);
        } else {
          dialog.show_notification(
            'Please select load type option before clicking "Load".'
          );
          return;
        }
        dialog.show_notification(
          'Your data has successfully been merged with the existing data.'
        );
        setRoute('/teams');
      };
      reader.readAsText(file);
    }
  };
  return (
    <Card title="Load from File">
      <CardSection isCentered="true">
        <div style={{ maxWidth: '500px' }}>
          <div>
            <b>
              <div
                style={{
                  textAlign: 'left',
                  margin: '0px 16px',
                }}
              >
                Import data data that's been downloaded from{' '}
                <span
                  style={{
                    textDecoration: 'underline',
                    color: css.colors.PRIMARY_DARK,
                  }}
                >
                  Softball.app's
                </span>{' '}
                export feature. Any data imported here will be merged with your
                existing data.
              </div>
            </b>
          </div>
          <br></br>
          <div className={classes.fileInputContainer}>
            <input
              className={classes.fileInput}
              ref={fileInputRef}
              type="file"
              name="fileData"
              id="fileData"
              onChange={handleFileInputChange}
            />
            <label
              htmlFor="fileData"
              className={'button ' + classes.fileInputButton}
            >
              {fileName
                ? fileName
                : 'First, tap to choose a file or click-and-drag one here.'}
            </label>
          </div>
          <div>Next, select what happens in case of a merge conflict:</div>
          <div className={classes.radioButtonsContainer}>
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
          <div className={classes.fileInputContainer}>
            <div
              id="load"
              className={
                'button primary-button ' +
                (fileName ? classes.loadButton : classes.loadButtonDisabled)
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
