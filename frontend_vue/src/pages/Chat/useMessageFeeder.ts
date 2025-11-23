import { ref } from 'vue';
import { useAsyncLoop, type AsyncLoopControls } from '../../utils/delay';
import { Message, MessageBlock, chatRoomModule } from '../../move';
import { useUserStore } from '../../stores';

let lastMessagesLooper: AsyncLoopControls | null = null;

const latestMessageBlocks = ref<Record<string, MessageBlock>>({});
const latestMessages = ref<Record<string, Message>>({});

export const useMessageFeeder = () => {

  const userStore = useUserStore();

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
