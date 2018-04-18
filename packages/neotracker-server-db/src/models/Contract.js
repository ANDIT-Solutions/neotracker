/* @flow */
import { Model } from 'objection';

import {
  BLOCK_TIME_COLUMN,
  CONTRACT_VALIDATOR,
  HASH_VALIDATOR,
  INTEGER_INDEX_VALIDATOR,
  NEP5_CONTRACT_TYPE,
  UNKNOWN_CONTRACT_TYPE,
} from './common';
import BlockchainModel from './BlockchainModel';
import { type EdgeSchema, type FieldSchema } from '../lib';

export default class Contract extends BlockchainModel<string> {
  id: string;
  script: string;
  parameters_raw: string;
  return_type: string;
  needs_storage: string;
  name: string;
  version: string;
  author: string;
  email: string;
  description: string;
  transaction_id: string;
  block_time: number;
  block_index: number;
  type: string;

  static modelName = 'Contract';
  static exposeGraphQL: boolean = true;
  static indices = [
    // ContractSearch
    {
      type: 'order',
      columns: [
        {
          name: 'block_time',
          order: 'desc nulls first',
        },
        {
          name: 'id',
          order: 'desc nulls last',
        },
      ],
      name: 'contract_desc_block_time_id',
    },
  ];
  static bigIntID = true;

  static fieldSchema: FieldSchema = {
    id: {
      type: CONTRACT_VALIDATOR,
      exposeGraphQL: true,
      required: true,
    },
    script: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    parameters_raw: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    return_type: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    needs_storage: {
      type: { type: 'boolean' },
      required: true,
      exposeGraphQL: true,
    },
    name: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    version: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    author: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    email: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    description: {
      type: { type: 'string' },
      required: true,
      exposeGraphQL: true,
    },
    transaction_id: {
      type: HASH_VALIDATOR,
      exposeGraphQL: true,
      required: true,
    },
    block_time: BLOCK_TIME_COLUMN,
    block_index: {
      type: INTEGER_INDEX_VALIDATOR,
      required: true,
    },
    type: {
      type: {
        type: 'string',
        enum: [NEP5_CONTRACT_TYPE, UNKNOWN_CONTRACT_TYPE],
        default: UNKNOWN_CONTRACT_TYPE,
      },
      required: true,
      exposeGraphQL: true,
    },
  };

  static edgeSchema: EdgeSchema = {
    transaction: {
      relation: {
        relation: Model.BelongsToOneRelation,
        get modelClass() {
          // eslint-disable-next-line
          return require('./Transaction').default;
        },
        join: {
          from: 'contract.transaction_id',
          to: 'transaction.id',
        },
      },
      exposeGraphQL: true,
      required: true,
    },
    transfers: {
      relation: {
        relation: Model.HasManyRelation,
        get modelClass() {
          // eslint-disable-next-line
          return require('./Transfer').default;
        },
        join: {
          from: 'contract.id',
          to: 'transfer.contract_id',
        },
      },
      exposeGraphQL: true,
    },
  };
}
