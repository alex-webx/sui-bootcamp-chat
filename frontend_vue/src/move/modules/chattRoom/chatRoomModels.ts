export enum ERoomType {
  PrivateGroup = 1,
  PublicGroup = 2,
  DirectMessage = 3
};
export enum EPermission {
  Nobody = 0,
  Admin = 1,
  Moderators = 2,
  Members = 4,
  Anyone = 8
}

export type ChatRoomRegistry= {
  id: string;
  rooms: string[];
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
  messageCount: number;
  currentBlockNumber: number;
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

export type MessageBlock = {
  id: string;
  roomId: string;
  blockNumber: number;
  messageIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  roomId: string;
  blockNumber: number;
  messageNumber: number;
  sender: string;
  content: string;
  mediaUrl: string[];
  createdAt: number;
  replyTo?: string;
  editedAt: number;
  deletedAt: number;
};
