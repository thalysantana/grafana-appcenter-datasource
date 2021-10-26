import { DataQuery, DataSourceJsonData, SelectableValue } from '@grafana/data';

export const TYPES = [
  'Apps',
  'Error groups',
  'Errors',
  'Errors count',
  'Errors per day',
  'Crashes per day',
  'Orgs',
  'Events',
  'Event properties',
  'Event property count',
];

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

/**
 * Error types supported by AppCenter API (unhandledError meaning crashes).
 */
export type ErrorType = 'all' | 'unhandledError' | 'handledError';
