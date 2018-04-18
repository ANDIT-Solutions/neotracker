/* @flow */
import convertIDs from './convertIDs';
import fixQLC from './fixQLC';
import fixSkippedTransfers from './fixSkippedTransfers';
import resyncActions from './resyncActions';
import resyncTransferCoins from './resyncTransferCoins';
import updateIndices from './updateIndices';
import processedNextIndexNotify from './processedNextIndexNotify';

export type MigrationName =
  | 'convertIDs'
  | 'resyncActions'
  | 'fixQLC-0'
  | 'fixSkippedTransfers-2'
  | 'resyncTransferCoins-2'
  | 'updateIndices'
  | 'processedNextIndexNotify';

export default [
  ['convertIDs', convertIDs],
  ['resyncActions', resyncActions],
  ['fixQLC-0', fixQLC],
  // NOTE: Fixing skipped transfers requires resyncing transfer coins.
  ['fixSkippedTransfers-2', fixSkippedTransfers],
  ['resyncTransferCoins-2', resyncTransferCoins],
  ['updateIndices', updateIndices],
  ['processedNextIndexNotify', processedNextIndexNotify],
];
