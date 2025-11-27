import { ref, computed, nextTick } from 'vue';
import { Dialog, Notify } from 'quasar';
import _ from 'lodash';
import { useUserStore, useWalletStore, useChatListStore, useUiStore } from '../../stores';
import CreateRoomDialog from './CreateRoomDialog.vue';
import { type TenorResult }  from '../../components/TenorComponent.vue';
import { type ChatRoom, chatRoomModule, EPermission, ERoomType, type MemberInfo, type Message, type UserProfile } from '../../move';
import { DirectMessageService, PrivateGroupService, PublicChannelService } from '../../utils/encrypt';
import { db } from '../../utils/dexie';

const newMessage = ref<Pick<Message, 'content' | 'mediaUrl' | 'replyTo' | 'id'> & { replyToMessage?: Message & { profile: UserProfile } }>({ id: '', content: '', mediaUrl: [], replyTo: '' });

export function useChat() {

  const walletStore = useWalletStore();
  const userStore = useUserStore();
  const chatListStore = useChatListStore();
  const uiStore = useUiStore();

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
          const dmUserAddress = _.findKey(activeChat?.members, (v, k) => k !== profile.owner);
          const dmUser = await db.profile.get(dmUserAddress!);
          const svc = new DirectMessageService(privKey!, dmUser?.keyPub!);
          encryptMessage = svc.encryptMessage.bind(svc);
          break;
        }
        case ERoomType.PrivateGroup: {
          const privKey = await userStore.ensurePrivateKey();
          const memberInfo = await db.memberInfo.get(activeChat.id);
          const svc = new PrivateGroupService({
            encodedAesKey: memberInfo?.roomKey?.encodedPrivKey!,
            inviterPublicKey: memberInfo?.roomKey?.pubKey!,
            iv: memberInfo?.roomKey?.iv!
          }, privKey!);
          encryptMessage = svc.encryptMessage.bind(svc);
          break;
        }
        case ERoomType.PublicGroup: {
          const svc = new PublicChannelService(activeChat.owner!);
          encryptMessage = svc.encryptMessage.bind(svc);
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
        const { tx, parser } = await chatRoomModule.txEditMessage({ id: newMessage.value.id, roomId: chatListStore.activeChatId! }, { content, mediaUrl });
        const messageId = parser(await walletStore.signAndExecuteTransaction(tx));
      } else {
        const { tx, parser } = chatRoomModule.txSendMessage(profile.id, {
          roomId: chatListStore.activeChat!.id,
          content: content!,
          replyTo: replyTo!,
          mediaUrl: mediaUrl || []
        });
        const messageId = parser(await walletStore.signAndExecuteTransaction(tx));
      }

      clearNewMessage();
      if ((profile.roomsJoined || []).indexOf(chatListStore.activeChatId) < 0) {
        await userStore.fetchCurrentUserProfile();
      }

      await db.refreshUserChatRoomMessages(chatListStore.activeChat!);
      await db.refreshUserRooms([chatListStore.activeChatId]);

      if (!isEdit) {
        uiStore.scrollTo('bottom');
      }
    }
  }

  const clearNewMessage = () => { newMessage.value = { id: '', content: '', mediaUrl: [], replyTo: '' }; };

  const selectChatRoom = (chatRoom: Pick<ChatRoom, 'id'>) => {
    clearNewMessage();

    nextTick(() => {
      if (uiStore.desktopMode) {
        if (chatListStore.activeChatId === chatRoom.id) {
          chatListStore.activeChatId = '';
        } else {
          chatListStore.activeChatId = chatRoom.id;
        }
      } else {
        chatListStore.activeChatId = chatRoom.id;
        uiStore.leftDrawerOpen = false;
      }
    });
  };

  const selectUser = async (user: UserProfile) => {
    const profileOwner = userStore.profile?.owner;
    if (user.owner === userStore.profile?.owner) {
      return undefined;
    }

    let dmRoom = await db.room.where('roomType').equals(ERoomType.DirectMessage).filter(room => !!room.members[profileOwner!] && !!room.members[user.owner]).first();

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
        const chatRoomId = await chatListStore.createDmRoom({
          inviteeUserProfile: user
        });
        if (chatRoomId) {
          Notify.create({
            message: 'Sala criada com sucesso!',
            color: 'positive'
          })
          await userStore.fetchCurrentUserProfile();
          await db.refreshUserRooms([chatRoomId]);
          await selectChatRoom({ id: chatRoomId });
        }
      });
    }
  };

  const createChatRoom = async (newChatRoom: Parameters<typeof chatListStore.createChatRoom>[0]) => {
    const notif = Notify.create({
      message: 'Criando sala de chat...',
      caption: 'Por favor, assine a transação em sua carteira.',
      color: 'primary',
      spinner: true,
      group: false,
      timeout: 0
    });

      try {

        if (!newChatRoom.isRestricted) {
          newChatRoom.inviteLevel = 'all';
        }

        const chatRoomId = await chatListStore.createChatRoom(newChatRoom);

        if (chatRoomId) {
          await userStore.fetchCurrentUserProfile();
          await db.refreshUserRooms([chatRoomId]);
          await selectChatRoom({ id: chatRoomId })

          notif({
            message: 'Sala de chat criada com sucesso',
            caption: '',
            timeout: 2500,
            spinner: false,
            icon: 'done',
            color: 'positive'
          });

          return true;
        } else {
          notif({
            message: 'Não foi possível criar a sala de chat',
            caption: '',
            timeout: 2500,
            spinner: false,
            icon: 'done',
            color: 'negative'
          });
          return false;
        }
      } catch (exc) {
        console.log({exc});
        notif({
          message: 'Não foi possível criar a sala de chat',
          caption: 'Ocorreu um erro: ' + exc,
          timeout: 2500,
          spinner: false,
          icon: 'done',
          color: 'negative'
        });
        return false;
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

      const { tx, parser } = await chatRoomModule.txDeleteMessage(message);
      const success = parser(await walletStore.signAndExecuteTransaction(tx));

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

  const joinRoom = async(room: Pick<ChatRoom, 'id'>) => {
    await chatListStore.joinRoom({ room: room! });
    await userStore.fetchCurrentUserProfile();
  };

  const canInvite = computed(() => checkPermission(chatListStore.activeChat?.permissionInvite || EPermission.Nobody));
  const canSendMessage = computed(() => checkPermission(chatListStore.activeChat?.permissionSendMessage || EPermission.Nobody));

  return {
    newMessage,

    createChatRoom,
    selectChatRoom,
    selectUser,

    insertGif,
    removeGif,
    insertEmoji,
    sendMessage,
    deleteMessage,
    clearNewMessage,
    joinRoom,

    canInvite,
    canSendMessage
  };
};
