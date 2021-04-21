import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  orgName: string;
  appName: string;
  apiKey: string;
  baseUrl: string;
  start: Date;
  end: Date;
  timezone: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.orgName = instanceSettings.jsonData.orgName;
    this.appName = instanceSettings.jsonData.appName;
    this.apiKey = instanceSettings.jsonData.key;
    this.baseUrl = instanceSettings.jsonData.url;
    this.start = new Date();
    this.end = new Date();
    this.timezone = 'browser';
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    this.start = options.range.from.toDate();
    this.end = options.range.to.toDate();

    const promises = options.targets.map(query => {
      this.timezone = options.timezone;

      switch (query.type.value) {
        case 'Apps':
          return this.listApps(query);
        case 'Error groups':
          return this.listErrorGroups(query);
        case 'Errors':
          return this.listErrors(query);
        case 'Errors count':
          return this.listErrorsCount(query);
        case 'Orgs':
          return this.listOrgs(query);
        case 'Events':
          return this.listEvents(query);
      }

      throw new Error("A 'Query type' must be selected.");
    });

    return Promise.all(promises).then(data => ({ data }));
  }

  async listOrgs(query: MyQuery) {
    const url = `${this.baseUrl}` + `/v0.1/orgs`;
    var result: Array<Promise<any>> = [];

    // Executes ws for all apps and stores promises into result
    const promise = this.doRequest(url, {}).then(response => {
      return response.data;
    });

    // Stores promise
    result.push(promise);

    return Promise.all(result)
      .then(function (data: any[]) {
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'Id', type: FieldType.string },
            { name: 'Name', type: FieldType.string },
          ],
        });

        data[0].forEach((object: any) => {
          frame.appendRow([object.id, object.name]);
        });

        return frame;
      })
      .catch(console.error);
  }

  async listApps(query: MyQuery) {
    if (!this.orgName || this.orgName.length === 0) {
      throw new Error(
        'The "Organization name" has to be configured on datasource settings. Available options can be checked the listOrgs query.'
      );
    }

    const url = `${this.baseUrl}` + `/v0.1/orgs/${this.orgName}/apps`;
    var result: Array<Promise<any>> = [];

    // Executes ws for all apps and stores promises into result
    const promise = this.doRequest(url, {}).then(response => {
      return response.data;
    });

    // Stores promise
    result.push(promise);

    return Promise.all(result)
      .then(function (data: any[]) {
        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            { name: 'Id', type: FieldType.string },
            { name: 'name', type: FieldType.string },
          ],
        });

        data[0].forEach((object: any) => {
          frame.appendRow([object.id, object.name]);
        });

        return frame;
      })
      .catch(console.error);
  }

  async listErrorsCount(query: MyQuery) {
    const url = `${this.baseUrl}` + `/v0.1/apps/{owner_name}/{app_name}/errors/errorGroups`;
    const oneDay = 86400000;

    let versions: Set<string> = new Set();
    let timeIndexes: Set<number> = new Set();
    let result: any = {
      time: [],
    };
    let promises: Array<Promise<any>> = [];
    let rootElement = 'errors';

    let params = {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };

    // Set indexes for all days during the period
    let amountOfDays = (this.end.getTime() - this.start.getTime() + 1) / oneDay;

    for (let index = 0; index < amountOfDays; index++) {
      timeIndexes.add(addDays(removeTime(this.start, this.timezone), index).getTime());
    }

    // Get ErrorGroupIds for the entire period.
    await this.invokeForAllApps(url, params, 'errorGroups').then(errorGroups => {
      // Add version to results
      result[errorGroups.appVersion] = [];

      //Get all errors that occurred for each error group during the period
      errorGroups.forEach((errorGroup: any, dataIndex: number) => {
        let configuredUrl = `${this.baseUrl}/v0.1/apps/{owner_name}/{app_name}/errors/errorGroups/{error_group_id}/errors`;

        // Call API for errors and stores promises into result
        const url = configuredUrl
          .replace('{owner_name}', this.orgName)
          .replace('{app_name}', errorGroup.appName)
          .replace('{error_group_id}', errorGroup.errorGroupId);

        const promise = this.doRequest(url, params).then(response => {
          response.data.errors = response.data.errors.map(function (data: any) {
            data['appVersion'] = errorGroup.appVersion;
            return data;
          });

          return response.data;
        });

        // Stores promise
        promises.push(promise);
      });
    });

    return Promise.all(promises)
      .then(
        function (rootElement: any, data: any[]) {
          // Step 1 - Merged all apps results into a single list
          let errors: any = [];
          for (let index = 0; index < data.length; index++) {
            errors = errors.concat(...data[index][rootElement]);
          }

          return errors;
        }.bind(null, rootElement)
      )
      .then(
        function (timezone: any, data: any[]) {
          // Step 2 - Interate over all errors and count errors by version and day
          let groupedData: any = {};
          data.forEach(error => {
            const occurrencyDay = removeTime(new Date(error.timestamp), timezone).getTime();

            // Add version to results
            groupedData[error.appVersion] = groupedData[error.appVersion] ?? [];
            groupedData[error.appVersion][occurrencyDay] = (groupedData[error.appVersion][occurrencyDay] ?? 0) + 1;
          });

          return groupedData;
        }.bind(null, this.timezone)
      )
      .then(function (data: any[]) {
        // Step 3 - Add to results
        for (const key in data) {
          let version = data[key];

          // Add version to result
          versions.add(key);
          result[key] = [];

          // Set a line for version error count on each timeIndex
          timeIndexes.forEach((timeIndex: any) => {
            result[key].push(version[timeIndex] ?? 0);
          });
        }

        return data;
      })
      .then(function (data: any[]) {
        // Step 4 - Create frame
        const timeKey = 'time';
        versions.add(timeKey);
        result[timeKey] = [...timeIndexes];

        let frame = new MutableDataFrame({
          refId: query.refId,
          fields: [...versions].map(key => {
            return {
              type: key === timeKey ? FieldType.time : FieldType.number,
              name: key,
              title: key,
              values: result[key],
            };
          }),
          meta: {
            preferredVisualisationType: 'graph',
          },
        });

        return frame;
      })
      .catch(console.error);

    function removeTime(date: Date, region: string) {
      let dateString;

      // Convert to timezone and remove time
      if (region !== 'browser') {
        dateString = new Intl.DateTimeFormat('en-GB', { timeZone: region, timeZoneName: 'short' }).format(date);
      } else {
        dateString = new Intl.DateTimeFormat('en-GB', { timeZoneName: 'short' }).format(date);
      }

      // Create Date from string
      let [day, month, year, timezone] = dateString.match(/(\d+)|(GMT[\+|-]\d+)/g);

      // Set timezone to UTC if it's unknown
      timezone = timezone ?? 'z';

      return new Date(year + '-' + month + '-' + day + timezone);
    }

    function addDays(date: Date, daysToAdd: number) {
      return new Date(date.getTime() + 86400000 * daysToAdd);
    }
  }

  async listErrorGroups(query: MyQuery) {
    const url = `${this.baseUrl}` + `/v0.1/apps/{owner_name}/{app_name}/errors/errorGroups`;
    const params = {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
      top: query.limit,
    };

    return await this.invokeForAllApps(url, params, 'errorGroups').then(data => {
      const frame = new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'Id', type: FieldType.string },
          { name: 'App', type: FieldType.string },
          { name: 'Version', type: FieldType.string },
          { name: 'Build', type: FieldType.string },
          { name: 'Message', type: FieldType.string },
          { name: 'Device Count', type: FieldType.number },
          { name: 'Count', type: FieldType.number },
          { name: 'State', type: FieldType.string },
          { name: 'First Occurrence', type: FieldType.time },
          { name: 'Last Occurrence', type: FieldType.time },
        ],
      });

      data.sort(this.sortBy.bind(null, ['count desc', 'appVersion desc']));

      data.forEach((object: any) => {
        frame.appendRow([
          object.errorGroupId,
          object.appName,
          object.appVersion,
          object.appBuild,
          object.exceptionMessage ?? object.codeRaw,
          object.deviceCount,
          object.count,
          object.state,
          object.firstOccurrence,
          object.lastOccurrence,
        ]);
      });

      return frame;
    });
  }

  async listErrors(query: MyQuery) {
    const errorGroupId = this.getVariable('errorGroupId');
    const url = `${this.baseUrl}` + `/v0.1/apps/{owner_name}/{app_name}/errors/errorGroups/${errorGroupId}/errors`;
    const params = {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };

    return await this.invokeForAllApps(url, params, 'errors').then(data => {
      const frame = new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'Error Id', type: FieldType.string },
          { name: 'App', type: FieldType.string },
          { name: 'Device', type: FieldType.string },
          { name: 'OS', type: FieldType.string },
          { name: 'OS Version', type: FieldType.string },
          { name: 'User', type: FieldType.string },
          { name: 'Date', type: FieldType.time },
        ],
      });

      if (data) {
        data.sort(this.sortBy.bind(null, ['timestamp desc']));

        data.forEach((object: any) => {
          frame.appendRow([
            errorGroupId,
            object.appName,
            object.deviceName,
            object.osType,
            object.osVersion,
            object.userId,
            object.timestamp,
          ]);
        });
      }

      return frame;
    });
  }

  async listEvents(query: MyQuery) {
    const url = `${this.baseUrl}` + `/v0.1/apps/{owner_name}/{app_name}/analytics/events`;
    const params = {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
      top: query.limit,
    };

    return await this.invokeForAllApps(url, params, 'events').then(data => {
      const frame = new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'Id', type: FieldType.string },
          { name: 'Name', type: FieldType.string },
          { name: 'Device Count', type: FieldType.number },
          { name: 'Previous Device Count', type: FieldType.number },
          { name: 'Count', type: FieldType.number },
          { name: 'Previous Count', type: FieldType.number },
          { name: 'Count Per Device', type: FieldType.number },
        ],
      });

      data.sort(this.sortBy.bind(null, ['count desc']));

      data.forEach((object: any) => {
        frame.appendRow([
          object.id,
          object.name,
          object.device_count,
          object.previous_device_count,
          object.count,
          object.previous_count,
          object.count_per_device,
        ]);
      });

      return frame;
    });
  }

  /*
    Invokes an API for all apps configured and returns an list with merged results
  */
  async invokeForAllApps(configuredUrl: string, requestParameters: any, rootElement: string) {
    if (!this.orgName || this.orgName.length === 0) {
      throw new Error(
        'The "Organization name" has to be configured on datasource settings. Available options can be checked the listOrgs query.'
      );
    }

    if (!this.appName || this.appName.length === 0) {
      throw new Error(
        'The "App name" has to be configured on datasource settings. Available options can be checked the listApps query.'
      );
    }

    var result: Array<Promise<any>> = [];

    // Executes ws for all apps and stores promises into result
    this.appName.split(';').forEach(async appName => {
      const url = configuredUrl.replace('{owner_name}', this.orgName).replace('{app_name}', appName);

      const promise = this.doRequest(url, requestParameters).then(response => {
        //Set app name to data
        response.data[rootElement].map((element: any) => (element['appName'] = appName));

        return response.data;
      });

      // Stores promise
      result.push(promise);
    });

    return Promise.all(result)
      .then(
        function (rootElement: any, data: any[]) {
          //Merge results of all apps
          let result: any = [];
          for (let index = 0; index < data.length; index++) {
            result = result.concat(...data[index][rootElement]);
          }

          return result;
        }.bind(null, rootElement)
      )
      .catch(console.error);
  }

  /*
    Executes HTTP request
  */
  async doRequest(url: string, queryParams: any, retry = 3): Promise<any> {
    try {
      const result = await getBackendSrv().datasourceRequest({
        method: 'GET',
        url: url,
        params: queryParams,
        headers: {
          'X-API-Token': this.apiKey,
        },
      });

      if (retry < 3) {
        console.log(`Retried succesfully on attempt ${3 - retry}`);
      }

      return result;
    } catch (e) {
      if (retry > 0) {
        console.log(`Retrying (Attempt ${4 - retry}): ${url}`);
        return this.doRequest(url, queryParams, retry - 1);
      } else {
        console.log(`Failed on last attempt`);
        console.log(url);
        return new Promise(function (resolve, reject) {
          resolve({});
        });
      }
    }
  }

  /*
    Test database config parameters
  */
  async testDatasource() {
    // Validate fields
    if (!this.baseUrl || this.baseUrl.length === 0) {
      return showError('Base URL');
    }
    if (!this.baseUrl.toLowerCase().match('^(http|https)://[a-zA-Z0-9-.]+.[a-zA-Z]{2,6}(/S*)?$')) {
      return {
        status: 'error',
        message: `Base URL must start with https:// or http://`,
        title: 'ERROR',
      };
    }

    if (!this.apiKey || this.apiKey.length === 0) {
      return showError('Key');
    }

    // Test request
    const url = `${this.baseUrl}` + `/v0.1/orgs`;

    return await this.doRequest(url, {})
      .then(response => {
        return {
          status: 'success',
          message: 'Success',
        };
      })
      .catch(error => {
        return {
          status: 'error',
          message: `Could not connect to App Center using the informed parameter. URL: ${url}`,
          title: 'ERROR',
        };
      });

    function showError(field: any) {
      return {
        status: 'error',
        message: `A valid ${field} must be informed.`,
        title: 'Error',
      };
    }
  }

  /* 
    Sort array of objects by the objects properties 
  */
  sortBy(properties: string[], a: any, b: string) {
    let result = 1;
    for (let index = 0; index < properties.length; index++) {
      const order: number = properties[index].toUpperCase().includes(' DESC') ? 1 : -1;
      const propertyName: any = properties[index].split(' ')[0];

      if (a[propertyName] < b[propertyName]) {
        result = order;
        break;
      } else if (a[propertyName] > b[propertyName]) {
        result = -order;
        break;
      }
    }

    return result;
  }

  /*
    A helper function to get a dashboard variable
  */
  getVariable(name: string) {
    try {
      return getTemplateSrv().replace('$' + name);
    } catch (err) {
      return undefined;
    }
  }
}
