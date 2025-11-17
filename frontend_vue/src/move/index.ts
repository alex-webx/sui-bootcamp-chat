export type { BanInfo, ChatRoom, Message, MessageBlock, ModeratorInfo, ParticipantInfo } from './chatRoomModels';
export { EPermission, ERoomType } from './chatRoomModels';
import * as chatRoomFun from './chatRoomFun';
import * as chatRoomQuery from './chatRoomQuery';
export const chatRoomModule = {
  ...chatRoomFun,
  ...chatRoomQuery
};

export type { UserProfileRegistry,UserProfile } from './userProfileModel';
import * as userProfileQuery from './userProfileQuery';
import * as userProfileFun from './userProfileFun';
export const userProfileModule = {
  ...userProfileQuery,
  ...userProfileFun
};

export * from './useClient';
