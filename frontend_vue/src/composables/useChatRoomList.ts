import { ERoomType } from '../move';
import { useChatRoomStore, useUserStore } from '../stores';
import { storeToRefs } from 'pinia';

export function useChatRoomList () {

  const chatRoomStore = useChatRoomStore();
  const userStore = useUserStore();
  const { chatRooms, activeChatRoomId, activeChatRoom } = storeToRefs(chatRoomStore);
  const { fetchAllUserJoinedChatRooms, fetchAllChatRooms } = chatRoomStore;

  const selectChatRoom = (chatRoom: typeof chatRooms.value[number]) => {
    if (activeChatRoomId.value === chatRoom.id) {
      activeChatRoomId.value = undefined;
    } else {
      activeChatRoomId.value = chatRoom.id;
    }
  };

  const getDmParticipantId = (room: (typeof chatRooms.value)[number] | null) => {
    if (room?.roomType === ERoomType.DirectMessage) {
      return Object.keys(room.participants).find(id => id !== userStore.profile?.owner)!;
    } else {
      return null;
    }
  };

  return {
    chatRooms,
    activeChatRoom,
    activeChatRoomId,

    selectChatRoom,
    fetchAllUserJoinedChatRooms,
    fetchAllChatRooms,
    getDmParticipantId
  };
};
