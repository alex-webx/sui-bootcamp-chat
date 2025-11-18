import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Dialog, Notify } from 'quasar';
import { useChatRoomStore, useUsersStore, useUserStore, useWalletStore } from '../../stores';
import CreateRoomDialog from './CreateRoomDialog.vue';
import { type TenorResult }  from '../../components/TenorComponent.vue';
import { type ChatRoom, ERoomType, Message, MessageBlock, chatRoomModule } from '../../move';
import { DirectMessageService } from '../../utils/encrypt';

const newMessage = ref<Pick<Message, 'content' | 'mediaUrl' | 'replyTo'>>({ content: '', mediaUrl: [], replyTo: '' });
const messageBlocks = ref<Pick<MessageBlock, 'blockNumber' | 'messageIds'>[]>([]);
const messages = ref<Record<string, Message[]>>({});
const latestMessages = ref<Record<string, Message>>({});

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
    newMessage.value.mediaUrl = [gif.media_formats.mp4.url];
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
        const privKey = await userStore.ensurePrivateKey();
        const dmUser = getDmParticipant(chatRoomStore.activeChatRoom);
        const dmService = new DirectMessageService(privKey!, dmUser?.keyPub!);

        const encryptedContent = await dmService.encryptMessage(newMessage.value.content);
        const encryptedMediaUrl = await Promise.all(newMessage.value.mediaUrl.map(mediaUrl => dmService.encryptMessage(mediaUrl)));

        const messageId = await chatRoomStore.sendMessage(
          chatRoomStore.activeChatRoom,
          {
            content: JSON.stringify([encryptedContent.iv, encryptedContent.ciphertext]),
            mediaUrl: encryptedMediaUrl.map(media => JSON.stringify([ media.iv,media.ciphertext ])),
            replyTo: newMessage.value.replyTo!
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
      await fetchMessages();
      newMessage.value = { content: '', mediaUrl: [], replyTo: '' };
      if ((userStore.profile.roomsJoined || []).indexOf(chatRoomStore.activeChatRoom.id) < 0) {
        await userStore.fetchCurrentUserProfile();
      }
    }
  }

  const fetchMessages = async () => {
    const activeChatRoom = chatRoomStore.activeChatRoom;
    if (!activeChatRoom?.id) {
      return;
    };

    await chatRoomStore.refreshUserChatRoom(activeChatRoom);
    messageBlocks.value = await chatRoomStore.getChatRoomMessageBlocks(activeChatRoom.id);

    for (let messageBlock of messageBlocks.value) {
      const currentMessages = await chatRoomStore.getChatRoomMessagesFromBlock(messageBlock);

      if (activeChatRoom.roomType == ERoomType.DirectMessage) {
        const privKey = userStore.profile?.keyPrivDecoded!;
        const dmUser = getDmParticipant(activeChatRoom);
        const pubKey = dmUser?.keyPub!;
        const dmService = new DirectMessageService(privKey, pubKey);
        for (let msg of currentMessages) {
          try {
            msg.content = await decryptDmMessage(dmService, msg.content);
            msg.mediaUrl = await Promise.all(msg.mediaUrl.map(url => decryptDmMessage(dmService, url))),
            (msg as any)._safe = true;
          } catch { }
        }
      }

      messages.value[messageBlock.blockNumber] = currentMessages;
    }
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

  const selectChatRoom = (chatRoom: ChatRoom) => {
    newMessage.value = { content: '', mediaUrl: [], replyTo: '' };
    if (chatRoomStore.activeChatRoomId === chatRoom.id) {
      chatRoomStore.activeChatRoomId = undefined;
    } else {
      chatRoomStore.activeChatRoomId = chatRoom.id;
    }
  };

  const getLastMessage = async (chatRoom: ChatRoom) => {
    return await chatRoomModule.getLastMessage(chatRoom);
  };

  const fetchLastMessageFromJoinedRooms = async () => {
    latestMessages.value = await chatRoomModule.getLastMessagesFromUserChatRoomsJoined(userStore.profile!);
  };

  const deleteMessage = async (
    chatRoom: Pick<ChatRoom, 'id'>,
    message: Pick<Message, 'id'>
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
      const success = await chatRoomStore.deleteMessage(chatRoom, message);
      if (success) {
        Notify.create({
          message: 'Mensagem apagada com sucesso',
          color: 'positive'
        })
      } else {
        Notify.create({
          message: 'Não foi possível apagar a mensagem',
          color: 'negative'
        });
      }
      await fetchMessages();
    });
  };

  const editMessage = async (
    message: Pick<Message, 'id'>,
    newMessage: Pick<Message, 'content'>
  ) => {
    alert('todo');
    // const success = await chatRoomStore.editMessage(message, newMessage);
    await fetchMessages();
  }


  return {
    chatRoomStore,

    newMessage,
    messageBlocks,
    messages,
    latestMessages,

    createRoom,
    selectChatRoom,

    insertGif,
    removeGif,
    insertEmoji,
    sendMessage,
    deleteMessage,
    editMessage,

    fetchMessages,
    fetchLastMessageFromJoinedRooms,
    getLastMessage,
    getDmParticipant,
    getDmParticipantId
  };
};
