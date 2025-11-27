import _ from 'lodash';
import Dexie, { liveQuery, Table } from 'dexie';
export * from './useLiveQuery';
import * as move from '../../move';
import { useAsyncLoop } from '../useAsyncLoop';

class SuiChatDB extends Dexie implements Disposable {
  settings!:  Table<string, string>;
  profile!: Table<move.UserProfile, string>;
  room!: Table<move.ChatRoom, string>;
  message!: Table<move.Message, string>;

  constructor() {
    super('suichat_db');

    this.version(1).stores({
      settings: '',
      profile: '&owner, id, username, *roomsJoined',
      room: '&id, name, owner, roomType',
      message: '&id, roomId, messageNumber, sender, createdAt, replyTo, previousVersionId',
    });
  }

  public refreshProfiles = async (addresses: string[] | undefined = undefined) => {
    let profiles = addresses?.length ?
      await move.userProfileModule.getUsersProfilesFromAddresses(addresses) :
      await move.userProfileModule.getUsersProfilesFromAddresses();

    await db.profile.bulkPut(profiles);
    return profiles;
  };

  public refreshUserRooms = async (roomsIds: string[] | undefined = undefined) => {
    const dbAddress = await db.settings.get('address');

    let userMemberInfos = await move.chatRoomModule.getUserMemberInfos(dbAddress!);

    if (!roomsIds?.length) {
      roomsIds = userMemberInfos.map(mi => mi.roomId);
    }

    const rooms = await move.chatRoomModule.getChatRooms(roomsIds);
    for (let memberInfo of userMemberInfos) {
      const room = rooms.find(r => r.id === memberInfo.roomId);
      if (room) {
        room.members[dbAddress!] = memberInfo;
      }
    }

    await db.room.bulkPut(rooms);

    return rooms;
  }

  public refreshUserChatRoomMessages = async (room: move.ChatRoom) => {
    const messageIds = await move.chatRoomModule.getAllMessagesIds(room);
    const messages = await move.chatRoomModule.getAllMessages(Object.values(messageIds));
    await db.message.bulkPut(messages);
  }

  public initDatabase = async (address: string) => {
    const dbAddress = await db.settings.get('address');
    if (dbAddress !== address) {
      await this.resetDatabase();
      await db.settings.put(address, 'address');
    }

    const profiles = await this.refreshProfiles();
    const rooms = await this.refreshUserRooms();

    for (let room of rooms) {
      await this.refreshUserChatRoomMessages(room);
    }

    const controls = useAsyncLoop(async () => {
      const rooms = await this.refreshUserRooms();

      for (let room of rooms) {
        await this.refreshUserChatRoomMessages(room);
      }

      console.log('looping');
    }, 5000);
    controls.startLoop();

    return controls;
  };

  [Symbol.dispose](): void {
    console.log('DISPOSING!!!');
  }

  public resetDatabase = async () => {
    await db.delete();
    await db.open();
  }

}

export const db = new SuiChatDB();
