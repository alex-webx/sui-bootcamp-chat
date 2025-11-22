export type { ChatRoomRegistry, BanInfo, RoomKey, ChatRoom, Message, MessageBlock, ModeratorInfo, MemberInfo } from './chatRoomModels';
export { EPermission, ERoomType } from './chatRoomModels';
import * as chatRoomFunctions from './chatRoomFunctions';
import * as chatRoomQuery from './chatRoomQuery';
export const chatRoomModule = {
  ...chatRoomFunctions,
  ...chatRoomQuery
};
