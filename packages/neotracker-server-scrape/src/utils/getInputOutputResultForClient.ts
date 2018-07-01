import { ConfirmedTransaction } from '@neo-one/client';
import BigNumber from 'bignumber.js';
import * as _ from 'lodash';
import { TransactionInputOutput as TransactionInputOutputModel } from 'neotracker-server-db';
import { ActionData, InputOutputResult } from '../types';
import { getActionDataInputOutputResult } from './getActionDataInputOutputResult';
import { reduceInputOutputResults } from './reduceInputOutputResults';

export function getInputOutputResultForClient({
  transaction,
  transactionIndex,
  inputs,
  claims,
  actionDatas,
}: {
  readonly transaction: ConfirmedTransaction;
  readonly transactionIndex: number;
  readonly inputs: ReadonlyArray<TransactionInputOutputModel>;
  readonly claims: ReadonlyArray<TransactionInputOutputModel>;
  // tslint:disable-next-line no-any
  readonly actionDatas: ReadonlyArray<ActionData<any>>;
}): InputOutputResult {
  const transactionID = transaction.data.globalIndex.toString();
  const transactionHash = transaction.txid;
  const addressData = {
    startTransactionID: transactionID,
    startTransactionIndex: transactionIndex,
    startTransactionHash: transactionHash,
  };

  const inputsResult = {
    addressIDs: _.fromPairs(inputs.map((input) => [input.address_id, addressData])),
    assetIDs: inputs.map((input) => input.asset_id),
    coinChanges: {
      transactionIndex,
      transactionID,
      transactionHash,
      changes: inputs.map((input) => ({
        address: input.address_id,
        asset: input.asset_id,
        value: new BigNumber(input.value).negated(),
      })),
    },
  };

  const outputsResult = {
    addressIDs: _.fromPairs(transaction.vout.map((output) => [output.address, addressData])),
    assetIDs: transaction.vout.map((output) => output.asset),
    coinChanges: {
      transactionIndex,
      transactionID,
      transactionHash,
      changes: transaction.vout.map((output) => ({
        address: output.address,
        asset: output.asset,
        value: new BigNumber(output.value),
      })),
    },
  };

  const claimsResult = {
    addressIDs: _.fromPairs(claims.map((claim) => [claim.address_id, addressData])),
    assetIDs: claims.map((claim) => claim.asset_id),
  };

  const invocationResult = getActionDataInputOutputResult({
    actionDatas,
    transactionID,
    transactionHash,
    transactionIndex,
  });

  return reduceInputOutputResults([inputsResult, outputsResult, claimsResult, invocationResult]);
}
