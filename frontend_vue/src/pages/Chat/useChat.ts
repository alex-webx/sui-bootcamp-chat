import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Dialog, Notify, Screen } from 'quasar';
import { useChatRoomStore, useUsersStore, useUserStore, useWalletStore } from '../../stores';
import CreateRoomDialog from './CreateRoomDialog.vue';
import { type TenorResult }  from '../../components/TenorComponent.vue';
import { type ChatRoom, ERoomType, Message, MessageBlock, chatRoomModule } from '../../move';
import { DirectMessageService } from '../../utils/encrypt';

const breakpoint = 800;
const screenWidth = computed(() => Screen.width);
const desktopMode = computed(() => Screen.width > breakpoint);
const drawerWidth = computed(() => desktopMode.value ? 350 : Screen.width);
const leftDrawerOpen = ref(true);
const rightDrawerOpen = ref(false);

const newMessage = ref<Pick<Message, 'content' | 'mediaUrl' | 'replyTo' | 'id'>>({ id: '', content: '', mediaUrl: [], replyTo: '' });

const messageBlocks = ref<Pick<MessageBlock, 'blockNumber' | 'messageIds'>[]>([]);
const messageBlockLoadCount = ref<number>(2);
const messages = ref<Record<string, Message[]>>({});
const bottomChatElement = ref<InstanceType<typeof HTMLDivElement>>();

export function useChat() {

  const walletStore = useWalletStore();
  const userStore = useUserStore();
  const usersStore = useUsersStore();
  const chatRoomStore = useChatRoomStore();

  const createRoom = async () => {
    Dialog.create({
      component: CreateRoomDialog
    });
  };

  const insertGif = async (gif: TenorResult) => {
    newMessage.value.mediaUrl = [];
    newMessage.value.mediaUrl.push(gif.media_formats.mp4.url);
  };

  const removeGif = async() => {
    newMessage.value.mediaUrl = [];
  };

  const insertEmoji = (emoji: { i: string }) => {
    newMessage.value.content += emoji.i;
  }

  const sendMessage = async () => {
    if (userStore.profile && chatRoomStore.activeChatRoom) {
      if (chatRoomStore.activeChatRoom.roomType === ERoomType.DirectMessage) {

        let content = newMessage.value.content;
        let mediaUrl = newMessage.value.mediaUrl;

        if (content?.length || mediaUrl.length) {
          const privKey = await userStore.ensurePrivateKey();
          const dmUser = getDmParticipant(chatRoomStore.activeChatRoom);
          const dmService = new DirectMessageService(privKey!, dmUser?.keyPub!);

          if (content?.length) {
            const encContent = await dmService.encryptMessage(content);
            content = JSON.stringify([encContent.iv, encContent.ciphertext]);
          }
          if (mediaUrl.length) {
            const encMedia = await Promise.all(mediaUrl.map(mediaUrl => dmService.encryptMessage(mediaUrl)));
            mediaUrl = encMedia.map(media => JSON.stringify([ media.iv, media.ciphertext ]));
          }
        }

        if (newMessage.value.id) {
          const messageId = await chatRoomStore.editMessage(
            { id: newMessage.value.id, roomId: chatRoomStore.activeChatRoom.id },
            {
              content: content,
              mediaUrl: mediaUrl
            }
          );
        } else {
          const messageId = await chatRoomStore.sendMessage(
            chatRoomStore.activeChatRoom,
            {
              content: content,
              mediaUrl: mediaUrl,
              replyTo: newMessage.value.replyTo!
            }
          );
        }
      } else {
        if (newMessage.value.id) {
           const messageId = await chatRoomStore.editMessage(
            { id: newMessage.value.id, roomId: chatRoomStore.activeChatRoom.id },
            {
              content: newMessage.value.content,
              mediaUrl: newMessage.value.mediaUrl
            }
          );
        } else {
          await chatRoomStore.sendMessage(
            chatRoomStore.activeChatRoom,
            {
              content: newMessage.value.content,
              mediaUrl: newMessage.value.mediaUrl,
              replyTo: newMessage.value.replyTo!
            }
          );
        }
      }
      await fetchMessageBlocks();
      clearNewMessage();
      if ((userStore.profile.roomsJoined || []).indexOf(chatRoomStore.activeChatRoom.id) < 0) {
        await userStore.fetchCurrentUserProfile();
      }
      scrollTo('bottom');
    }
  }

  const scrollTo = (where: 'bottom') => {
    if (where === 'bottom') {
      setTimeout(() => {
        bottomChatElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  };

  const fetchMessageBlocks = async () => {
    const activeChatRoom = chatRoomStore.activeChatRoom;
    if (!activeChatRoom?.id) {
      return;
    };
    await chatRoomStore.refreshUserChatRoom(activeChatRoom);
    messageBlocks.value = await chatRoomStore.getChatRoomMessageBlocks(activeChatRoom.id);
  };

  const decryptDmMessage = async (dmService: DirectMessageService, jsonMessage: string) => {
    const decryptedMessage = JSON.parse(jsonMessage) as [iv: string, ciphertext: string ];
    await userStore.ensurePrivateKey();
    if (decryptedMessage[0] && decryptedMessage[1]) {
      try {
        const decrypted = await dmService.decryptMessage({
          iv: decryptedMessage[0],
          ciphertext: decryptedMessage[1]
        });
        return decrypted;
      } catch (e) {
        return '[conteúdo protegido]';
      }
    } else {
      return jsonMessage;
    }
  }

  const getDmParticipantId = (room: ChatRoom | null) => {
    if (room?.roomType === ERoomType.DirectMessage) {
      return Object.keys(room.participants).find(id => id !== userStore.profile?.owner)!;
    } else {
      return null;
    }
  };

  const getDmParticipant = (room: ChatRoom | null) => usersStore.users[getDmParticipantId(room)!];

  const clearNewMessage = () => { newMessage.value = { id: '', content: '', mediaUrl: [], replyTo: '' }; };

  const selectChatRoom = (chatRoom: ChatRoom) => {
    clearNewMessage();
    messageBlocks.value = [];
    messages.value = {};
    messageBlockLoadCount.value = 2;

    if (desktopMode.value) {
      if (chatRoomStore.activeChatRoomId === chatRoom.id) {
        chatRoomStore.activeChatRoomId = undefined;
      } else {
        chatRoomStore.activeChatRoomId = chatRoom.id;
      }
    } else {
      chatRoomStore.activeChatRoomId = chatRoom.id;
      leftDrawerOpen.value = false;
    }
  };


  const deleteMessage = async (
    message: Pick<Message, 'id' | 'roomId'>
  ) => {
    Dialog.create({
      title: 'Tem certeza que deseja apagar esta mensagem?',
      message: 'Apenas o conteúdo da mensagem será apagado',
      cancel: {
        label: 'Cancelar',
        color: 'grey',
        flat: true
      },
      ok: {
        label: 'Apagar',
        color: 'primary'
      }
    }).onOk(async () => {
      const notif = Notify.create({
        message: 'Apagando mensagem...',
        caption: 'Confirme a transação em sua carteira para apagar a mensagem.',
        timeout: 0, group: false,
        spinner: true,
        color: 'medium-sea'
      });

      const success = await chatRoomStore.deleteMessage(message).catch(() => false);
      await fetchMessageBlocks();

      if (success) {
        notif({
          message: 'Mensagem apagada com sucesso',
          caption: '',
          color: 'positive',
          icon: 'done',
          spinner: false,
          timeout: 2500
        })
      } else {
        notif({
          message: 'Não foi possível apagar a mensagem',
          caption: '',
          color: 'negative',
          icon: 'alert',
          spinner: false,
          timeout: 5000
        });
      }
    });
  };

  return {
    // ui
    breakpoint,
    screenWidth,
    desktopMode,
    drawerWidth,
    leftDrawerOpen,
    rightDrawerOpen,
    bottomChatElement,
    scrollTo,

    chatRoomStore,

    newMessage,

    messageBlocks,
    messages,
    messageBlockLoadCount,

    createRoom,
    selectChatRoom,

    insertGif,
    removeGif,
    insertEmoji,
    sendMessage,
    deleteMessage,
    clearNewMessage,

    fetchMessageBlocks,
    getDmParticipant,
    getDmParticipantId
  };
};
