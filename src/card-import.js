import React from 'react';
import css from 'css';
import dialog from 'dialog';
import objectMerge from '../object-merge.js';
import state from 'state';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import { setRoute } from 'actions/route';

export default class CardImport extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loadType: undefined,
    };

    this.handleLoadClick = function() {
      let file = document.getElementById('fileData').files[0];
      if (file) {
        var reader = new FileReader();
        let self = this;
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

          if (self.state.loadType === 'Merge') {
            let diff = objectMerge.diff(state.getLocalState(), parsedData);
            let stateCopy = JSON.parse(JSON.stringify(state.getLocalState()));
            objectMerge.patch(stateCopy, diff, true, true);
            state.setLocalState(stateCopy);
            dialog.show_notification(
              "This file's data has been merged into local data"
            );
            setRoute('/teams');
          } else if (self.state.loadType === 'Overwrite') {
            state.setLocalState(parsedData);
            dialog.show_notification(
              "This file's data has been copied to local data"
            );
            setRoute('/teams');
          } else {
            dialog.show_notification(
              'Please select load type option before clicking "Load"'
            );
          }
        };
        reader.readAsText(file);
      } else {
        dialog.show_notification('Please upload a file before clicking "Load"');
      }
    };

    this.handleRadioButtonChange = event => {
      this.setState({
        loadType: event.target.value,
      });
    };
  }

  render() {
    return (
      <Card title="Load from File">
        <CardSection>
          <input
            type="file"
            name="fileData"
            id="fileData"
            className="radio-button"
          />
          <div className="radio-button">
            <div className="radio-button-option">
              <input
                type="radio"
                name="loadType"
                value="Merge"
                id="mergeChoice"
                onChange={this.handleRadioButtonChange}
              />
              <label htmlFor="mergeChoice">Merge</label>
            </div>
            <div className="radio-button-option">
              <input
                type="radio"
                name="loadType"
                value="Overwrite"
                id="overwriteChoice"
                onChange={this.handleRadioButtonChange}
              />
              <label htmlFor="overwriteChoice">Overwrite</label>
            </div>
          </div>
          <div
            id="load"
            className="button confirm-button"
            onClick={this.handleLoadClick.bind(this)}
            style={{
              backgroundColor: css.colors.BG,
            }}
          >
            Load
          </div>
        </CardSection>
      </Card>
    );
  }
}
