import { ActionRaw } from '@neo-one/client';
import BigNumber from 'bignumber.js';
import { cleanupTest, getDBData, getMonitor, startDB } from 'neotracker-server-test';
import { data, makeDBContext } from '../../__data__';
import { ActionsUpdater } from '../../db';
import { normalizeAction } from '../../normalizeBlock';

const monitor = getMonitor();

const createAction = (actionIn: ActionRaw, transactionID: string) => {
  const action = normalizeAction(actionIn);

  return {
    action,
    transactionID,
    transactionHash: action.transactionHash,
  };
};

describe('ActionsUpdater', () => {
  afterEach(async () => {
    await cleanupTest();
  });

  test('inserts actions', async () => {
    const db = await startDB();
    const updater = new ActionsUpdater(makeDBContext({ db }));

    await updater.save(monitor, {
      actions: [
        createAction(data.createLogRaw({ index: 0, globalIndex: new BigNumber(0) }), '0'),
        createAction(data.createNotificationRaw({ index: 1, globalIndex: new BigNumber(1) }), '0'),
      ],
    });

    const dbData = await getDBData(db);
    expect(dbData).toMatchSnapshot();
  });

  test('handles duplicate inserts', async () => {
    const db = await startDB();
    const updater = new ActionsUpdater(makeDBContext({ db }));
    const actions = [
      createAction(data.createLogRaw({ index: 0, globalIndex: new BigNumber(0) }), '0'),
      createAction(data.createNotificationRaw({ index: 1, globalIndex: new BigNumber(1) }), '0'),
    ];

    await updater.save(monitor, { actions });

    const dbData = await getDBData(db);

    await updater.save(monitor, { actions });

    const finalDBData = await getDBData(db);
    expect(dbData).toEqual(finalDBData);
  });

  test('reverts actions', async () => {
    const db = await startDB();
    const updater = new ActionsUpdater(makeDBContext({ db }));

    await updater.save(monitor, {
      actions: [
        createAction(data.createLogRaw({ index: 0, globalIndex: new BigNumber(0) }), '0'),
        createAction(data.createNotificationRaw({ index: 1, globalIndex: new BigNumber(1) }), '0'),
      ],
    });

    data.nextBlock();
    const dbData = await getDBData(db);

    await updater.save(monitor, {
      actions: [
        createAction(data.createLogRaw({ index: 0, globalIndex: new BigNumber(2) }), '1'),
        createAction(data.createNotificationRaw({ index: 1, globalIndex: new BigNumber(3) }), '1'),
      ],
    });

    const nextDBData = await getDBData(db);
    expect(nextDBData).toMatchSnapshot();

    await updater.revert(monitor, { transactionIDs: ['1'] });

    const finalDBData = await getDBData(db);
    expect(dbData).toEqual(finalDBData);
  });
});
