import _, { add } from 'lodash';
import Dexie, { liveQuery, Table } from 'dexie';
export * from './useLiveQuery';
import * as move from '../../move';
import { useAsyncLoop } from '../useAsyncLoop';
import { useConfig } from '../../../configs';

const COMMIT_REF = useConfig().getConfig('CommitRef') || new Date().getTime().toString();

class SuiChatDB extends Dexie implements Disposable {
  settings!:  Table<string, string>;
  profile!: Table<move.UserProfile, string>;
  room!: Table<move.ChatRoom, string>;
  message!: Table<move.Message, string>;
  roomLastUpdate!: Table<Pick<move.ChatRoom, 'id' | 'updatedAt' | 'messageCount'>, string>;   // key: id
  messageRead!: Table<number, string>;     // key: roomId
  memberInfo!: Table<move.MemberInfo, string>; // key: roomId

  constructor() {
    super('suichat_db');

    this.version(1).stores({
      settings: '',
      profile: '&owner, id, username, *roomsJoined',
      room: '&id, name, owner, roomType',
      message: '&id, roomId, messageNumber, sender, createdAt, replyTo, previousVersionId',
      roomLastUpdate: '&id',
      messageRead: '',
      memberInfo: '&roomId'
    });
  }

  public refreshProfiles = async (addresses: string[] | undefined = undefined) => {
    let profiles = addresses?.length ?
      await move.userProfileModule.getUsersProfilesFromAddresses(addresses) :
      await move.userProfileModule.getUsersProfilesFromAddresses();

    await this.profile.bulkPut(profiles);

    return profiles;
  };

  public refreshMemberInfo = async () => {
    const dbAddress = await this.settings.get('address');
    let userMemberInfos = await move.chatRoomModule.getUserMemberInfos(dbAddress!);
    await this.memberInfo.bulkPut(userMemberInfos);
    return userMemberInfos;
  };

  public refreshUserRooms = async (roomsIds: string[] | undefined = undefined) => {
    if (!roomsIds?.length) {
      roomsIds = (await this.room.toArray()).map(room => room.id);
    }

    const rooms = await move.chatRoomModule.getChatRooms(roomsIds);
    await this.room.bulkPut(rooms);

    return rooms;
  }

  public refreshUserChatRoomMessages = async (room: move.ChatRoom, startIndex?: number) => {
    const messageIds = await move.chatRoomModule.getAllMessagesIds(room);

    const ids = startIndex ?
      _.toPairs(messageIds).filter(pairs => Number(pairs[0]) >= startIndex).map(p => p[1]) :
      Object.values(messageIds);

    const messages = await move.chatRoomModule.getAllMessages(Object.values(ids));
    await this.message.bulkPut(messages);
  }

  public initDatabase = async (address: string) => {
    const dbAddress = await this.settings.get('address');
    const dbCommitRef = await this.settings.get('commitRef');

    if (dbAddress !== address || dbCommitRef !== COMMIT_REF) {
      await this.resetDatabase();
      await this.settings.put(address, 'address');
      await this.settings.put(COMMIT_REF, 'commitRef');
    }

    const profiles = await this.refreshProfiles();
    const rooms = await this.refreshUserRooms();
    await this.refreshMemberInfo();

    for (let room of rooms) {
      await this.refreshUserChatRoomMessages(room);
    }

    return this.runLoop(1000);
  };

  private runLoop = async (initialIntervalMS: number) => {
    let intervalMS = initialIntervalMS;

    const controls = useAsyncLoop(async () => {

      try {
        const memberInfo = await this.refreshMemberInfo();
        const simpleRooms = await move.chatRoomModule.getChatRooms(memberInfo.map(m => m.roomId), false);

        let roomsToUpdate: string[] = [];

        for (let room of simpleRooms) {
          // check room updates
          const lastUpdate = await this.roomLastUpdate.get(room.id);
          if (!lastUpdate || room.updatedAt > lastUpdate.updatedAt) {
            roomsToUpdate.push(room.id);

            await this.refreshUserChatRoomMessages(room, lastUpdate?.messageCount || 0);
          }

          if (!await this.memberInfo.get(room.id)) {
            await this.refreshMemberInfo();
          }
        }

        if (roomsToUpdate.length) {
          const rooms = await this.refreshUserRooms(roomsToUpdate);
          this.roomLastUpdate.bulkPut(rooms.map(r => ({ id: r.id, updatedAt: r.updatedAt, messageCount: r.messageCount })));

          const addresses = _.uniq(rooms.flatMap(room => Object.keys(room.members)));
          if (addresses.length) {
            await this.refreshProfiles(addresses);
          }

        };

        intervalMS = initialIntervalMS;
      } catch (err) {
        console.error(err);
        intervalMS += initialIntervalMS;
      }
    }, intervalMS);

    controls.startLoop();

    return controls;
  };

  [Symbol.dispose](): void {
  }

  public resetDatabase = async () => {
    await this.delete();
    await this.open();
  }

}

export const db = new SuiChatDB();
(window as any).db = db;
