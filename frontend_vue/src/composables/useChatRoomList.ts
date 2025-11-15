import { useChatRoomStore } from '../stores/chatRoomStore';
import { storeToRefs } from 'pinia';

export function useChatRoomList () {

  const chatRoomStore = useChatRoomStore();
  const { chatRooms, activeChatRoomId, activeChatRoom } = storeToRefs(chatRoomStore);

  const selectChatRoom = (chatRoom: typeof chatRooms.value[number]) => {
    if (activeChatRoomId.value === chatRoom.id) {
      activeChatRoomId.value = undefined;
    } else {
      activeChatRoomId.value = chatRoom.id;
    }
  };

  return {
    chatRooms,
    activeChatRoom,
    activeChatRoomId,

    selectChatRoom
  };
};
