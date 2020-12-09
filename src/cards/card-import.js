import React from 'react';
import dialog from 'dialog';
import objectMerge from '/../object-merge.js';
import state from 'state';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import { setRoute } from 'actions/route';
import { makeStyles } from 'css/helpers';

const useStyles = makeStyles((theme) => {
  return {
    fileInputContainer: {
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'row',
      position: 'relative',
    },
    fileInputButton: {
      backgroundColor: theme.colors.PRIMARY_DARK,
      width: '100%',
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
  const [loadType, setLoadType] = React.useState('Merge');
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
          parsedData = JSON.parse(e.target.result); // TODO: additional verification of object structure
        } catch (exception) {
          dialog.show_notification(
            'There was an error while parsing file input: ' + exception.message
          );
          return;
        }

        if (loadType === 'Merge') {
          const diff = objectMerge.diff(state.getLocalState(), parsedData);
          const stateCopy = JSON.parse(JSON.stringify(state.getLocalState()));
          objectMerge.patch(stateCopy, diff, true, true);
          state.setLocalState(stateCopy);
          dialog.show_notification(
            'Your data has successfully been merged with the existing data.'
          );
          setRoute('/teams');
        } else if (loadType === 'Overwrite') {
          state.setLocalState(parsedData);
          dialog.show_notification(`Your data has successfully been loaded.`);
          setRoute('/teams');
        } else {
          dialog.show_notification(
            'Please select load type option before clicking "Load"'
          );
        }
      };
      reader.readAsText(file);
    }
  };
  return (
    <Card title="Load from File">
      <CardSection isCentered="true">
        <div style={{ maxWidth: '500px' }}>
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
              {fileName ? fileName : 'Choose a File'}
            </label>
          </div>
          <div className={classes.radioButtonsContainer}>
            <div className="radio-button-option">
              <input
                id="mergeChoice"
                type="radio"
                name="loadType"
                value="Merge"
                onChange={handleRadioClick}
                checked={loadType === 'Merge'}
              />
              <label htmlFor="mergeChoice">Merge</label>
            </div>
            <div className="radio-button-option">
              <input
                id="overwriteChoice"
                type="radio"
                name="loadType"
                value="Overwrite"
                onChange={handleRadioClick}
                checked={loadType === 'Overwrite'}
              />
              <label htmlFor="overwriteChoice">Overwrite</label>
            </div>
          </div>
          <div className={classes.fileInputContainer}>
            <div
              id="load"
              className={
                'button confirm-button ' +
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
