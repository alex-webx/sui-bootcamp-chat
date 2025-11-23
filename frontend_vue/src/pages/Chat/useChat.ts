import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Dialog, Notify, Screen } from 'quasar';
import { useChatRoomStore, useUsersStore, useUserStore, useWalletStore, useChatListStore } from '../../stores';
import CreateRoomDialog from './CreateRoomDialog.vue';
import { type TenorResult }  from '../../components/TenorComponent.vue';
import { type ChatRoom, EPermission, ERoomType, Message, MessageBlock, UserProfile, chatRoomModule } from '../../move';
import { DirectMessageService, PrivateGroupService, PublicChannelService } from '../../utils/encrypt';

const breakpoint = 800;
const screenWidth = computed(() => Screen.width);
const desktopMode = computed(() => Screen.width > breakpoint);
const drawerWidth = computed(() => desktopMode.value ? 350 : Screen.width);
const leftDrawerOpen = ref(true);
const rightDrawerOpen = ref(false);

const newMessage = ref<Pick<Message, 'content' | 'mediaUrl' | 'replyTo' | 'id'>>({ id: '', content: '', mediaUrl: [], replyTo: '' });

const messageBlocks = ref<Record<string, Pick<MessageBlock, 'blockNumber' | 'messageIds'>[]>>({});
const messageBlockLoadCount = ref<Record<string, number>>({});
const bottomChatElement = ref<InstanceType<typeof HTMLDivElement>>();

export function useChat() {

  const walletStore = useWalletStore();
  const userStore = useUserStore();
  const usersStore = useUsersStore();
  const chatRoomStore = useChatRoomStore();
  const chatListStore = useChatListStore();

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
    const profile = userStore.profile;
    const memberInfos = userStore.memberInfos;
    const activeChat = chatListStore.activeChat;

    if (profile && activeChat) {

      const isEdit = !!newMessage.value.id;
      let { content, mediaUrl, replyTo } = newMessage.value;

      if (!content?.length && !mediaUrl.length) {
        return;
      }

      let encryptMessage: (plaintext: string) => Promise<{ iv: string, ciphertext: string }>;

      switch(activeChat.roomType) {
        case ERoomType.DirectMessage: {
          const privKey = await userStore.ensurePrivateKey();
          const dmUser = getDmMemberUser(activeChat);
          const svc = new DirectMessageService(privKey!, dmUser?.keyPub!);
          encryptMessage = svc.encryptMessage;
          break;
        }
        case ERoomType.PrivateGroup: {
          const privKey = await userStore.ensurePrivateKey();
          const roomKey = memberInfos[chatListStore.activeChatId!]?.roomKey;
          const svc = new PrivateGroupService({
            encodedAesKey: roomKey?.encodedPrivKey!,
            inviterPublicKey: roomKey?.pubKey!,
            iv: roomKey?.iv!
          }, privKey!);
          encryptMessage = svc.encryptMessage;
          break;
        }
        case ERoomType.PublicGroup: {
          const svc = new PublicChannelService(activeChat.owner!);
          encryptMessage = svc.encryptMessage;
          break;
        }
      }

      if (content?.length) {
        const encContent = await encryptMessage(content);
        content = JSON.stringify([encContent.iv, encContent.ciphertext]);
      }
      if (mediaUrl.length) {
        const encMedia = await Promise.all(mediaUrl.map(mediaUrl => encryptMessage(mediaUrl)));
        mediaUrl = encMedia.map(media => JSON.stringify([ media.iv, media.ciphertext ]));
      }

      if (isEdit) {
        const messageId = await chatRoomStore.editMessage(
          { id: newMessage.value.id, roomId: chatListStore.activeChatId! },
          {
            content: content,
            mediaUrl: mediaUrl
          }
        );
      } else {
        const messageId = await chatRoomStore.sendMessage(
          chatListStore.activeChat,
          {
            content: content,
            mediaUrl: mediaUrl,
            replyTo: replyTo!
          }
        );
      }

      await fetchMessageBlocks();
      clearNewMessage();
      if ((profile.roomsJoined || []).indexOf(chatListStore.activeChatId) < 0) {
        await userStore.fetchCurrentUserProfile();
      }

      if (!isEdit) {
        scrollTo('bottom');
      }
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
    const activeChat = chatListStore.activeChat;
    if (!activeChat?.id) {
      return;
    };
    await chatListStore.refreshRoom(activeChat.id);
    messageBlocks.value[activeChat.id] = await chatRoomStore.getChatRoomMessageBlocks(activeChat.id);
    return messageBlocks.value;
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

  const getDmMemberUserAddress = (room: ChatRoom | null) => {
    if (room?.roomType === ERoomType.DirectMessage) {
      return Object.keys(room.members).find(id => id !== userStore.profile?.owner)!;
    } else {
      return null;
    }
  };

  const getDmMemberUser = (room: ChatRoom | null) => chatListStore.usersCache[getDmMemberUserAddress(room)!];

  const clearNewMessage = () => { newMessage.value = { id: '', content: '', mediaUrl: [], replyTo: '' }; };

  const selectChatRoom = (chatRoom: Pick<ChatRoom, 'id'>) => {
    clearNewMessage();
    messageBlocks.value = { [chatRoom.id]: [] };
    messageBlockLoadCount.value = { [chatRoom.id]: 2 };

    nextTick(() => {
      if (desktopMode.value) {
        if (chatListStore.activeChatId === chatRoom.id) {
          chatListStore.activeChatId = '';
        } else {
          chatListStore.activeChatId = chatRoom.id;
        }
      } else {
        chatListStore.activeChatId = chatRoom.id;
        leftDrawerOpen.value = false;
      }
    });
  };

  const selectUser = async (user: UserProfile) => {
    const profileOwner = userStore.profile?.owner;
    if (user.owner === userStore.profile?.owner) {
      return undefined;
    }

    let dmRoom = Object.values(chatListStore.chats)
      .filter(room => room.roomType === ERoomType.DirectMessage)
      .find(room => !!room.members[user.owner] && !!room.members[profileOwner!]);

    if (!dmRoom) {
      await userStore.fetchCurrentUserProfile();
      await chatListStore.refreshRooms();
      dmRoom = Object.values(chatListStore.chats)
        .filter(room => room.roomType === ERoomType.DirectMessage)
        .find(room => !!room.members[user.owner] && !!room.members[profileOwner!]);
    }

    if (dmRoom) {
      await selectChatRoom(dmRoom);
      return Object.keys(dmRoom.members).filter(addr => addr != profileOwner)?.[0];
    } else {
      Dialog.create({
        title: `Você ainda não possui um chat com ${user.username}.`,
        message: `Deseja iniciar a conversa com ${user.username}?`,
        cancel: {
          label: 'Cancelar',
          color: 'grey',
          flat: true
        },
        ok: {
          label: 'Iniciar conversa',
          color: 'primary'
        }
      }).onOk(async () => {
        const chatRoomId = await chatRoomStore.createDmRoom({
          inviteeUserProfile: user
        });
        if (chatRoomId) {
          Notify.create({
            message: 'Sala criada com sucesso!',
            color: 'positive'
          })
          await userStore.fetchCurrentUserProfile();
          const rooms = await chatListStore.refreshRooms();
          const room = rooms[chatRoomId];
          if (room) {
            await selectChatRoom(room);
          }
        }
      });
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


  const checkPermission = (permissionValue: EPermission) => {
    const profileOwner = userStore.profile?.owner;
    const room = chatListStore.activeChat;

    if (permissionValue! === EPermission.Nobody) { return false; }
    if ((permissionValue! & EPermission.Anyone) === EPermission.Anyone) { return true; }
    if ((permissionValue! & EPermission.Admin) === EPermission.Admin && profileOwner === room?.owner) { return true; }
    if ((permissionValue! & EPermission.Moderators) === EPermission.Moderators && !!room?.moderators?.[profileOwner!]) { return true; }
    if ((permissionValue! & EPermission.Members) === EPermission.Members && !!room?.members?.[profileOwner!]) { return true; }
    return false;
  };

  const canInvite = computed(() => checkPermission(chatListStore.activeChat?.permissionInvite || EPermission.Nobody));
  const canSendMessage = computed(() => checkPermission(chatListStore.activeChat?.permissionSendMessage || EPermission.Nobody));

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

    messageBlocks: computed(() => messageBlocks.value[chatListStore.activeChatId!]),
    messageBlockLoadCount: computed(() => messageBlockLoadCount.value[chatListStore.activeChatId!]),
    allMessageBlockLoadCount: messageBlockLoadCount,

    createRoom,
    selectChatRoom,
    selectUser,

    insertGif,
    removeGif,
    insertEmoji,
    sendMessage,
    deleteMessage,
    clearNewMessage,

    fetchMessageBlocks,
    getDmMemberUser,
    getDmMemberUserAddress,

    canInvite,
    canSendMessage
  };
};
