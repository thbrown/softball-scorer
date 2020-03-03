import React, { createRef } from 'react';
import dialog from 'dialog';
import objectMerge from '/../object-merge.js';
import state from 'state';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import { setRoute } from 'actions/route';
import injectSheet from 'react-jss';
import { compose, withState, withHandlers, withProps } from 'recompose';

const enhance = compose(
  withState('fileName', 'setFileName', null),
  withState('loadType', 'setLoadType', 'Merge'),
  withProps(() => ({ fileInputRef: createRef() })),
  withHandlers({
    handleFileInputChange: props => ev => {
      props.setFileName(ev.target.files[0].name);
    },
    handleLoadClick: props => () => {
      const file = props.fileInputRef.current.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          let parsedData;
          try {
            parsedData = JSON.parse(e.target.result); // TODO: additional verification of object structure
          } catch (exception) {
            dialog.show_notification(
              'There was an error while parsing file input: ' +
                exception.message
            );
            return;
          }

          if (props.loadType === 'Merge') {
            const diff = objectMerge.diff(state.getLocalState(), parsedData);
            const stateCopy = JSON.parse(JSON.stringify(state.getLocalState()));
            objectMerge.patch(stateCopy, diff, true, true);
            state.setLocalState(stateCopy);
            dialog.show_notification(
              'Your data has succesfully been merged with the existing data.'
            );
            setRoute('/teams');
          } else if (props.loadType === 'Overwrite') {
            state.setLocalState(parsedData);
            dialog.show_notification(`Your data has succesfully been loaded.`);
            setRoute('/teams');
          } else {
            dialog.show_notification(
              'Please select load type option before clicking "Load"'
            );
          }
        };
        reader.readAsText(file);
      }
    },
    handleRadioClick: props => ev => {
      props.setLoadType(ev.target.value);
    },
  }),
  injectSheet(theme => ({
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
  }))
);

const CardImport = enhance(props => (
  <Card title="Load from File">
    <CardSection isCentered="true">
      <div style={{ maxWidth: '500px' }}>
        <div className={props.classes.fileInputContainer}>
          <input
            className={props.classes.fileInput}
            ref={props.fileInputRef}
            type="file"
            name="fileData"
            id="fileData"
            onChange={props.handleFileInputChange}
          />
          <label
            htmlFor="fileData"
            className={'button ' + props.classes.fileInputButton}
          >
            {props.fileName ? props.fileName : 'Choose a File'}
          </label>
        </div>
        <div className={props.classes.radioButtonsContainer}>
          <div className="radio-button-option">
            <input
              id="mergeChoice"
              type="radio"
              name="loadType"
              value="Merge"
              onChange={props.handleRadioClick}
              checked={props.loadType === 'Merge'}
            />
            <label htmlFor="mergeChoice">Merge</label>
          </div>
          <div className="radio-button-option">
            <input
              id="overwriteChoice"
              type="radio"
              name="loadType"
              value="Overwrite"
              onChange={props.handleRadioClick}
              checked={props.loadType === 'Overwrite'}
            />
            <label htmlFor="overwriteChoice">Overwrite</label>
          </div>
        </div>
        <div className={props.classes.fileInputContainer}>
          <div
            id="load"
            className={
              'button confirm-button ' +
              (props.fileName
                ? props.classes.loadButton
                : props.classes.loadButtonDisabled)
            }
            onClick={props.handleLoadClick}
          >
            Load
          </div>
        </div>
      </div>
    </CardSection>
  </Card>
));

export default CardImport;
