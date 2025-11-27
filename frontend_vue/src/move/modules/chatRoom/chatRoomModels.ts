export enum ERoomType {
  PrivateGroup = 1,
  PublicGroup = 2,
  DirectMessage = 3
};

export enum EMessageType {
  New = 1,
  Edited = 2,
  Deleted = 3
};

export enum EPermission {
  Nobody = 0,
  Admin = 1,
  Moderators = 2,
  Members = 4,
  Anyone = 8
}

export type ChatRoomRegistry = {
  id: string;
  rooms: string[];
  dmRooms: string[];
};

export type ModeratorInfo = {
  addedBy: string;
  timestamp: number;
};

export type BanInfo = {
  bannedBy: string;
  timestamp: number;
};

export type RoomKey = {
  pubKey: Uint8Array,
  iv: Uint8Array,
  encodedPrivKey: Uint8Array
}

export type ChatRoom = {
  id: string;
  name: string;
  owner: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  eventCount: number;
  messages: string;
  imageUrl: string;
  bannedUsers: Record<string, BanInfo>;
  moderators: Record<string, ModeratorInfo>;
  members: Record<string, string>;
  maxMembers: number;
  roomType: ERoomType;
  permissionInvite: EPermission;
  permissionSendMessage: EPermission;
};

export type MemberInfo = {
  id: string;
  owner: string;
  addedBy: string;
  timestamp: number;
  roomId: string;
  roomKey?: RoomKey;
};

export type Message = {
  id: string;
  roomId: string;
  messageNumber: number;
  eventNumber: number;
  sender: string;
  content: string;
  mediaUrl: string[];
  createdAt: number;
  replyTo?: string | undefined;
  previousVersionId?: string;
  editedAt?: number | undefined;
  deletedAt?: number | undefined;
  eventType: EMessageType
};
