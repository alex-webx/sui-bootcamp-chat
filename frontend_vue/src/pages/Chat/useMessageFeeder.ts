import { ref, computed } from 'vue';
import { useAsyncLoop, type AsyncLoopControls } from '../../utils/delay';
import { type ChatRoom, ERoomType, Message, MessageBlock, chatRoomModule } from '../../move';
import { useUserStore } from '../../stores';
import { useChat } from './useChat';

let lastMessagesLooper: AsyncLoopControls | null = null;

const latestMessageBlocks = ref<Record<string, MessageBlock>>({});
const latestMessages = ref<Record<string, Message>>({});

export const useMessageFeeder = () => {

  const userStore = useUserStore();
  const chatService = useChat();
  const { chatRoomStore } = chatService;

  const fetchLastMessages = async () => {
    if (userStore.profile?.id) {
      latestMessageBlocks.value = await chatRoomModule.getLastMessageBlocksFromUserChatRoomsJoined(userStore.profile!);

      const msgs = await chatRoomModule.getLastMessages(Object.values(latestMessageBlocks.value));
      latestMessages.value = msgs;
    }
  };


  const start = () => {
    stop();
    lastMessagesLooper = useAsyncLoop(fetchLastMessages, 1000, true);
  };

  const stop = () => {
    lastMessagesLooper?.stopLoop();
  };

  return {
    latestMessageBlocks,
    latestMessages,

    start,
    stop
  };
};
