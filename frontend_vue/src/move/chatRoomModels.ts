export enum ERoomType {
  Multi = 1,
  DirectMessage = 2
};
export enum EPermission {
  Nobody = 0,
  Admin = 1,
  Moderators = 2,
  Participants = 4,
  Anyone = 8
}

export type ParticipantInfo = {
  addedBy: string;
  timestamp: number;
  roomKey: Uint8Array;
  inviterKeyPub: Uint8Array;
};

export type ModeratorInfo = {
  addedBy: string;
  timestamp: number;
};

export type BanInfo = {
  bannedBy: string;
  timestamp: number;
};

export type ChatRoom = {
  id: string;
  name: string;
  owner: string;
  createdAt: number;
  messageCount: number;
  currentBlockNumber: number;
  imageUrl: string;
  bannedUsers: string[];
  moderators: string[];
  participants: Record<string, ParticipantInfo>;
  maxParticipants: number;
  isEncrypted: boolean;
  roomType: ERoomType;
  roomKey: Uint8Array;
  permissionInvite: EPermission;
  permissionSendMessage: EPermission;
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
  edited: boolean;
};

export type MessageBlock = {
  id: string;
  roomId: string;
  blockNumber: number;
  messageIds: string[];
  createdAt: number;
};
