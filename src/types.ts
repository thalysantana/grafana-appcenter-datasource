import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';

export const TYPES = ['Apps', 'Error groups', 'Errors', 'Errors count', 'Orgs', 'Events'];

export interface MyQuery extends DataQuery {
  type: SelectableValue;
  limit?: number;
}

export const defaultQuery: Partial<MyQuery> = {
  type: { value: null, label: 'Select a query type' },
  limit: 30,
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  url: string;
  orgName: string;
  appName: string;
  key: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
