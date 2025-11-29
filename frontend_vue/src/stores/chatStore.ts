import { ref, computed, nextTick } from 'vue';
import { Dialog, Notify } from 'quasar';
import { acceptHMRUpdate, defineStore } from 'pinia';
import _ from 'lodash';
import { useUserStore, useWalletStore,  useUiStore } from '.';
import { type TenorResult }  from '../components/TenorComponent.vue';
import { type ChatRoom, chatRoomModule, EPermission, ERoomType, type RoomKey, type Message, type UserProfile } from '../move';
import { db, useLiveQuery } from '../utils/dexie';
import * as walrus from '../utils/walrus';
import * as encrypt from '../utils/encrypt';
import * as imageUtils from '../utils/image';

type NewMessage = Pick<Message, 'content' | 'mediaUrl' | 'replyTo' | 'id'> &
  { replyToMessage?: Message & { profile: UserProfile } };

export const useChatStore = defineStore('chatStore', () => {

  const newMessage = ref<NewMessage>({ id: '', content: '', mediaUrl: [], replyTo: '' });
  const activeChatId = ref('');
  const activeChat = useLiveQuery(() => db.room.get(activeChatId.value!), [activeChatId]);

  const walletStore = useWalletStore();
  const userStore = useUserStore();
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

  const insertImage = async () => {
    const file = await new Promise<File | undefined>((resolve, reject) => {
      const input = document.createElement('input');
      input.accept = '.png, .jpg, .jpeg, .gif';
      input.type = 'file';
      input.addEventListener('change', async evt => {
        resolve(input.files?.[0]);
      });
      input.click();
    });

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Notify.create({
          message: 'Por favor, selecione uma imagem com no máximo 2MB',
          caption: `O arquivo "${file.name}" possui ${(file.size / 1024 / 1024).toFixed(2)} MB`,
          color: 'negative'
        });
        return;
      }

      if (!await imageUtils.isValidImage(file)) {
        Notify.create({
          message: 'O arquivo não é uma imagem válida.',
          caption: `São aceitos imagens no formato PNG, JPG/JPEG, GIF e WEBP`,
          color: 'negative'
        });
        return;
      }

      newMessage.value.mediaUrl = [ URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type })) ];
    }
  }

  const removeImage = async () => {
    newMessage.value.mediaUrl = [];
  };

  const sendMessage = async () => {
    const profile = userStore.profile;

    if (profile && activeChat) {

      const isEdit = !!newMessage.value.id;
      let { content, mediaUrl, replyTo } = newMessage.value;

      if (!content?.length && !mediaUrl.length) {
        return;
      }

      let encryptMessage!: (plaintext: string) => Promise<{ iv: string, ciphertext: string }>;

      switch(activeChat.value?.roomType) {
        case ERoomType.DirectMessage: {
          const privKey = await userStore.ensurePrivateKey();
          const dmUserAddress = _.findKey(activeChat.value?.members, (v, k) => k !== profile.owner);
          const dmUser = await db.profile.get(dmUserAddress!);
          const svc = new encrypt.DirectMessageService(privKey!, dmUser?.keyPub!);
          encryptMessage = svc.encryptMessage.bind(svc);
          break;
        }
        case ERoomType.PrivateGroup: {
          const privKey = await userStore.ensurePrivateKey();
          const memberInfo = await db.memberInfo.get(activeChat.value.id);
          const svc = new encrypt.PrivateGroupService({
            encodedAesKey: memberInfo?.roomKey?.encodedPrivKey!,
            inviterPublicKey: memberInfo?.roomKey?.pubKey!,
            iv: memberInfo?.roomKey?.iv!
          }, privKey!);
          encryptMessage = svc.encryptMessage.bind(svc);
          break;
        }
        case ERoomType.PublicGroup: {
          const svc = new encrypt.PublicChannelService(activeChat.value.owner!);
          encryptMessage = svc.encryptMessage.bind(svc);
          break;
        }
      }

      if (content?.length) {
        const encContent = await encryptMessage(content);
        content = JSON.stringify([encContent.iv, encContent.ciphertext]);
      }
      if (mediaUrl.length) {

        //upload custom image conditional
        for (let urlIndex = 0; urlIndex < mediaUrl.length; urlIndex++) {
          const url = mediaUrl[urlIndex]!;
          if (url.startsWith('blob:')) {
            const blob = await fetch(url).then(r => r.blob());
            const encryptedBlob = JSON.stringify(await encryptMessage(await walrus.blobToBase64(blob)));
            const walrusObj = await walrus.uploadImage(new TextEncoder().encode(encryptedBlob).buffer);
            mediaUrl[urlIndex] = 'walrus://' + await walrus.getImageUrl(walrusObj.newlyCreated.blobObject.blobId || walrusObj.alreadyCertified.blobId);
          }
        }

        const encMedia = await Promise.all(mediaUrl.map(mediaUrl => encryptMessage(mediaUrl)));
        mediaUrl = encMedia.map(media => JSON.stringify([ media.iv, media.ciphertext ]));
      }

      if (isEdit) {
        const { tx, parser } = await chatRoomModule.txEditMessage({ id: newMessage.value.id, roomId: activeChatId.value! }, { content, mediaUrl });
        const messageId = parser(await walletStore.signAndExecuteTransaction(tx));
      } else {
        const { tx, parser } = chatRoomModule.txSendMessage(profile.id, {
          roomId: activeChatId.value!,
          content: content!,
          replyTo: replyTo!,
          mediaUrl: mediaUrl || []
        });
        const messageId = parser(await walletStore.signAndExecuteTransaction(tx));
      }

      clearNewMessage();

      if ((profile.roomsJoined || []).indexOf(activeChatId.value) < 0) {
        await userStore.fetchCurrentUserProfile();
      }

      await db.refreshUserChatRoomMessages(activeChat.value!);
      await db.refreshUserRooms([activeChatId.value]);

      if (!isEdit) {
        uiStore.scrollTo('bottom');
      }
    }
  }

  const clearNewMessage = () => {
    newMessage.value = {
      id: '',
      content: '',
      mediaUrl: [],
      replyTo: ''
    };
  };

  const selectChatRoom = (chatRoom: Pick<ChatRoom, 'id'>) => {
    clearNewMessage();

    nextTick(() => {
      if (uiStore.desktopMode) {
        if (activeChatId.value === chatRoom.id) {
          activeChatId.value = '';
        } else {
          activeChatId.value = chatRoom.id;
        }
      } else {
        activeChatId.value = chatRoom.id;
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

        const { tx, parser } = chatRoomModule.txCreateDmRoom({
          userProfile: userStore.profile!,
          inviteeAddress: user.owner
        });

        const chatRoomId = parser(await walletStore.signAndExecuteTransaction(tx));

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

  const createChatRoom = async (newChatRoom: {
    name: string,
    imageUrl: string,
    maxMembers: number,
    isRestricted: boolean,
    isAnnouncements: boolean,
    inviteLevel: 'administrator' | 'moderators' | 'all'
  }) => {

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

        const profile = userStore.profile!;

        const inviteObj = await encrypt.PrivateGroupService.generateInvitationKey(
          await encrypt.PrivateGroupService.generateRoomKeyMaterial(),
          profile.keyPrivDecoded!,
          profile.keyPub,
          profile.keyPub
        );

        const roomKey: RoomKey = {
          encodedPrivKey: inviteObj.encodedAesKey,
          iv: inviteObj.iv,
          pubKey: inviteObj.inviterPublicKey
        };

        const permissionInvite = EPermission.Admin |
          (newChatRoom.inviteLevel === 'moderators' ? EPermission.Moderators : 0) |
          (newChatRoom.inviteLevel === 'all' ? (EPermission.Moderators | EPermission.Members | EPermission.Anyone) : 0);

        const permissionSendMessage = EPermission.Admin |
          (newChatRoom.isAnnouncements ? EPermission.Moderators : (EPermission.Moderators | EPermission.Members | EPermission.Anyone));

        const roomType = newChatRoom.isRestricted ? ERoomType.PrivateGroup : ERoomType.PublicGroup;

        const { tx, parser } = chatRoomModule.txCreateRoom({
          userProfile: profile,
          room: {
            name: newChatRoom.name,
            imageUrl: newChatRoom.imageUrl,
            maxMembers: newChatRoom.maxMembers,
            permissionInvite,
            permissionSendMessage,
            roomType
          },
          roomKey
        });

        const chatRoomId = parser(await walletStore.signAndExecuteTransaction(tx));

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

      let success: string | undefined = undefined;

      try {
        const { tx, parser } = await chatRoomModule.txDeleteMessage(message);
        success = parser(await walletStore.signAndExecuteTransaction(tx));
      } catch {
      }

      if (success) {
        await db.refreshUserChatRoomMessages(activeChat.value!);
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

  const inviteMember = async (args: {
    room: Pick<ChatRoom, 'id'>,
    inviteeAddress: string,
    roomKey?: RoomKey | undefined
  }) => {
    const tx = chatRoomModule.txInviteMember(userStore.profile!, args.room, args.inviteeAddress, args.roomKey);
    return await walletStore.signAndExecuteTransaction(tx);
  };

  const joinRoom = async(room: Pick<ChatRoom, 'id'>) => {
    const tx = await chatRoomModule.txJoinRoom({ room, profile: userStore.profile! });
    await walletStore.signAndExecuteTransaction(tx);
    await userStore.fetchCurrentUserProfile();
  };

  const banUnbanUser = async (user: Pick<UserProfile, 'owner'>, action: 'ban' | 'unban') => {
    const tx = action === 'ban' ?
      await chatRoomModule.txBanUser(activeChat.value!, user.owner) :
      await chatRoomModule.txUnbanUser(activeChat.value!, user.owner);

    await walletStore.signAndExecuteTransaction(tx);

    await db.refreshUserRooms([ activeChat.value?.id! ]);
  }

  const addRemoveModerator = async (user: Pick<UserProfile, 'owner'>, action: 'add' | 'remove') => {
    const tx = action === 'add' ?
      await chatRoomModule.txAddModerator(activeChat.value!, user.owner) :
      await chatRoomModule.txRemoveModerator(activeChat.value!, user.owner);

    await walletStore.signAndExecuteTransaction(tx);
    await db.refreshUserRooms([ activeChat.value?.id! ]);
  }

  const manageMuteUser = async (user: Pick<UserProfile, 'owner'>, muteFor: number | null) => {
    const tx = await chatRoomModule.txMuteUser(activeChat.value!, user.owner, muteFor);
    await walletStore.signAndExecuteTransaction(tx);
    await db.refreshUserRooms([ activeChat.value?.id! ]);
  }

  const checkPermission = (permissionValue: EPermission) => {
    const profileOwner = userStore.profile?.owner;

    if (permissionValue! === EPermission.Nobody) { return false; }
    if ((permissionValue! & EPermission.Anyone) === EPermission.Anyone) { return true; }
    if ((permissionValue! & EPermission.Admin) === EPermission.Admin && profileOwner === activeChat.value?.owner) { return true; }
    if ((permissionValue! & EPermission.Moderators) === EPermission.Moderators && !!activeChat.value?.moderators?.[profileOwner!]) { return true; }
    if ((permissionValue! & EPermission.Members) === EPermission.Members && !!activeChat.value?.members?.[profileOwner!]) { return true; }
    return false;
  };

  const canInvite = computed(() => checkPermission(activeChat.value?.permissionInvite || EPermission.Nobody));
  const canSendMessage = computed(() => checkPermission(activeChat.value?.permissionSendMessage || EPermission.Nobody));
  const canBanUnban = computed(() => activeChat.value?.owner === userStore.profile?.owner || !!activeChat.value?.moderators?.[userStore.profile?.owner!]);
  const canSilenceUsers = computed(() => activeChat.value?.owner === userStore.profile?.owner || !!activeChat.value?.moderators?.[userStore.profile?.owner!]);
  const canManagerModerators = computed(() => activeChat.value?.owner === userStore.profile?.owner);

  return {
    newMessage,
    activeChat,
    activeChatId,

    createChatRoom,
    selectChatRoom,
    selectUser,

    insertGif,
    removeGif,
    insertEmoji,
    insertImage,
    removeImage,
    sendMessage,
    deleteMessage,
    clearNewMessage,

    inviteMember,
    joinRoom,
    banUnbanUser,
    addRemoveModerator,
    manageMuteUser,

    canInvite,
    canSendMessage,
    canSilenceUsers,
    canBanUnban,
    canManagerModerators,

    resetState: async () => {
      newMessage.value = { content: '', id: '', mediaUrl: [], replyTo: '' };
      activeChatId.value = '';
    }
  };

});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot));
}

