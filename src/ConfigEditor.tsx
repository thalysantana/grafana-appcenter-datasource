import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from './types';

const { SecretFormField, FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      url: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  // Secure field (only sent to the backend)
  onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      key: event.target.value,
    };
    onOptionsChange({
      ...options,
      jsonData,
      secureJsonData: {
        apiKey: event.target.value,
      },
    });
  };

  onResetAPIKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        apiKey: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        apiKey: '',
      },
    });
  };

  onOrgNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      orgName: event.target.value.replace(/\s+/g, '-'),
    };
    onOptionsChange({ ...options, jsonData });
  };

  onAppNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      appName: event.target.value.replace(/\s+/g, '-'),
    };
    onOptionsChange({ ...options, jsonData });
  };

  render() {
    const { options } = this.props;
    const { jsonData, secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <FormField
            label="Base URL"
            labelWidth={10}
            inputWidth={20}
            onChange={this.onUrlChange}
            value={jsonData.url || ''}
            tooltip="App center domain. Default is https://api.appcenter.ms"
            placeholder="https://api.appcenter.ms"
          />
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              isConfigured={(secureJsonFields && secureJsonFields.apiKey) as boolean}
              value={secureJsonData.apiKey || ''}
              label="User API Key"
              tooltip="App Center user API Token. Can me generated through https://appcenter.ms/settings"
              placeholder="App Center User API Token"
              labelWidth={10}
              inputWidth={20}
              onReset={this.onResetAPIKey}
              onChange={this.onAPIKeyChange}
            />
          </div>
        </div>

        <div className="gf-form">
          <FormField
            label="Organization Name"
            onChange={this.onOrgNameChange}
            value={jsonData.orgName || ''}
            tooltip="You can check the available options using the query 'listOrgs'. Spaces will be replaced by dashes"
            placeholder="Organization Name"
            labelWidth={10}
            inputWidth={20}
          />
        </div>

        <div className="gf-form">
          <FormField
            label="App Name"
            onChange={this.onAppNameChange}
            value={jsonData.appName || ''}
            tooltip="Allows multiple apps separated by semicolon. You can check the available options using the query 'listApps'. Spaces will be replaced by dashes"
            placeholder="app1;myAndroidAPP;someIosApp"
            labelWidth={10}
            inputWidth={20}
          />
        </div>
      </div>
    );
  }
}
