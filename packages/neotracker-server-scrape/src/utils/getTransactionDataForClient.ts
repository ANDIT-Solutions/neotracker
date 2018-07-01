import { ConfirmedTransaction, Input } from '@neo-one/client';
import { Monitor } from '@neo-one/monitor';
import * as _ from 'lodash';
import { TransactionInputOutput as TransactionInputOutputModel, TYPE_INPUT } from 'neotracker-server-db';
import { Context, TransactionData } from '../types';
import { getActionDataForClient } from './getActionDataForClient';
import { getInputOutputResultForClient } from './getInputOutputResultForClient';

function calculateTransactionData({
  context,
  transaction,
  transactionIndex,
  claims,
  inputs,
}: {
  readonly context: Context;
  readonly transaction: ConfirmedTransaction;
  readonly transactionIndex: number;
  readonly claims: ReadonlyArray<TransactionInputOutputModel>;
  readonly inputs: ReadonlyArray<TransactionInputOutputModel>;
}): TransactionData {
  const transactionID = transaction.data.globalIndex.toString();
  const transactionHash = transaction.txid;
  const actionDatas =
    transaction.type === 'InvocationTransaction'
      ? transaction.invocationData.actions.map((action) =>
          getActionDataForClient({
            context,
            action,
            transactionID,
            transactionHash,
            transactionIndex,
          }),
        )
      : [];
  const result = getInputOutputResultForClient({
    transaction,
    transactionIndex,
    inputs,
    claims,
    actionDatas,
  });

  return {
    transaction,
    transactionID,
    transactionHash,
    transactionIndex,
    claims,
    inputs,
    actionDatas,
    result,
  };
}

interface ReferencesMap {
  // tslint:disable-next-line readonly-keyword
  [txid: string]: { [vout: number]: TransactionInputOutputModel | undefined } | undefined;
}

function mapReferences(
  referencesMap: ReferencesMap,
  inputs: ReadonlyArray<Input>,
): ReadonlyArray<TransactionInputOutputModel> {
  return inputs.map((input) => {
    const inputOutputs = referencesMap[input.txid];
    if (inputOutputs === undefined) {
      throw new Error('Not found');
    }

    const inputOutput = inputOutputs[input.vout];
    if (inputOutput === undefined) {
      throw new Error('Not found');
    }

    return inputOutput;
  });
}

export async function getTransactionDataForClient({
  monitor,
  context,
  transactions,
}: {
  readonly monitor: Monitor;
  readonly context: Context;
  readonly transactions: ReadonlyArray<{
    readonly transactionIndex: number;
    readonly transaction: ConfirmedTransaction;
  }>;
}): Promise<ReadonlyArray<TransactionData>> {
  const ids = [
    ...new Set(
      _.flatMap(transactions, ({ transaction }) => {
        let inputs = transaction.vin;
        if (transaction.type === 'ClaimTransaction') {
          inputs = inputs.concat(transaction.claims);
        }

        return inputs.map((input) =>
          TransactionInputOutputModel.makeID({
            type: TYPE_INPUT,
            outputTransactionHash: input.txid,
            outputTransactionIndex: input.vout,
          }),
        );
      }),
    ),
  ];
  if (ids.length === 0) {
    return transactions.map(({ transactionIndex, transaction }) =>
      calculateTransactionData({ context, transaction, transactionIndex, claims: [], inputs: [] }),
    );
  }

  const references = await TransactionInputOutputModel.query(context.db)
    .context(context.makeQueryContext(monitor))
    .whereIn('id', ids);
  const referencesMap = references.reduce<ReferencesMap>((acc, reference) => {
    let inputOutputs = acc[reference.output_transaction_hash];
    if (inputOutputs === undefined) {
      // tslint:disable-next-line no-object-mutation
      acc[reference.output_transaction_hash] = inputOutputs = {};
    }
    // tslint:disable-next-line no-object-mutation
    inputOutputs[reference.output_transaction_index] = reference;

    return acc;
  }, {});

  return transactions.map(({ transactionIndex, transaction }) => {
    const inputs = mapReferences(referencesMap, transaction.vin);
    const claims = mapReferences(referencesMap, transaction.type === 'ClaimTransaction' ? transaction.claims : []);

    return calculateTransactionData({ context, transaction, transactionIndex, claims, inputs });
  });
}
