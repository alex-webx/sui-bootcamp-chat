export type { ChatRoomRegistry, BanInfo, ChatRoom, Message, MessageBlock, ModeratorInfo, ParticipantInfo } from './chatRoomModels';
export { EPermission, ERoomType } from './chatRoomModels';
import * as chatRoomFunctions from './chatRoomFunctions';
import * as chatRoomQuery from './chatRoomQuery';
export const chatRoomModule = {
  ...chatRoomFunctions,
  ...chatRoomQuery
};

export type { UserProfileRegistry,UserProfile } from './userProfileModels';
import * as userProfileQuery from './userProfileQuery';
import * as userProfileFunctions from './userProfileFunctions';
export const userProfileModule = {
  ...userProfileQuery,
  ...userProfileFunctions
};

export * from './useClient';
