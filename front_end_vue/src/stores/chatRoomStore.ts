import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { type ChatRoom, type Message, type MessageBlock, useChatRoomContractService } from './services/chatRoomContractService';
import { useUserStore } from './userStore';

export const useChatRoomStore = defineStore('chatRoomStore', () => {
  const chatRoomSvc = useChatRoomContractService();
  const userStore = useUserStore();

  const chatRooms = ref<ChatRoom[]>([]);
  const activeChatRoomId = ref<string>();

  const createChatRoom = async (room: Pick<ChatRoom, 'name' | 'imageUrl'>) => {
    if (userStore.profile?.id) {
      const res = await chatRoomSvc.createRoom(userStore.profile?.id, room);
      return res;
    }
  };

  const fetchChatRooms = async () => {
    chatRooms.value = await chatRoomSvc.getAllChatRooms();
    return chatRooms.value;
  };

  const sendMessage = async (
    userProfileId: string,
    message: Pick<Message, 'content' | 'roomId'>
  ) => {
    return await chatRoomSvc.sendMessage(userProfileId, message);
  };

  const getChatRoomMessageBlocks = async (chatRoomId: string) => {
    return await chatRoomSvc.getChatRoomMessageBlocks(chatRoomId);
  };

  const getChatRoomMessagesFromBlock = async (messageBlock: Pick<MessageBlock, 'messageIds'>) => {
    return await chatRoomSvc.getChatRoomMessagesFromBlock(messageBlock);
  };

  return {
    createChatRoom,
    fetchChatRooms,
    sendMessage,
    getChatRoomMessageBlocks,
    getChatRoomMessagesFromBlock,

    chatRooms,
    activeChatRoomId,
    activeChatRoom: computed(() => chatRooms.value.find(chatRoom => chatRoom.id === activeChatRoomId.value))
  };
});

