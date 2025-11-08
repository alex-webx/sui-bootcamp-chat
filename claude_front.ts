// ==================== 3. Pinia Store - chatStore.ts ====================
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSuiClientStore } from './suiClientStore';
import type { SuiObjectResponse } from '@mysten/sui.js/client';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '';
const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID || '';

export interface ChatRoom {
  id: string;
  name: string;
  owner: string;
  messageCount: number;
  currentBlockNumber: number;
  createdAt: number;
  isPrivate: boolean;
  bannedUsers: string[];
  moderators: string[];
}

export interface Message {
  id: string;
  roomId: string;
  sender: string;
  username: string;
  content: string;
  timestamp: number;
  blockNumber: number;
  messageNumber: number;
  edited: boolean;
  replyTo?: string;
}

export const useChatStore = defineStore('chat', () => {
  const suiClient = useSuiClientStore();

  // State
  const rooms = ref<Map<string, ChatRoom>>(new Map());
  const messages = ref<Map<string, Message>>(new Map());
  const messagesByRoom = ref<Map<string, string[]>>(new Map()); // roomId -> messageIds
  const activeRoomId = ref<string | null>(null);
  const loading = ref<Map<string, boolean>>(new Map());
  const errors = ref<Map<string, Error>>(new Map());

  // Getters
  const activeRoom = computed(() => {
    return activeRoomId.value ? rooms.value.get(activeRoomId.value) : null;
  });

  const activeRoomMessages = computed(() => {
    if (!activeRoomId.value) return [];
    const msgIds = messagesByRoom.value.get(activeRoomId.value) || [];
    return msgIds.map(id => messages.value.get(id)).filter(Boolean) as Message[];
  });

  const isLoading = (key: string) => loading.value.get(key) || false;
  const getError = (key: string) => errors.value.get(key);

  // Helper para parsear objetos
  const parseRoom = (response: SuiObjectResponse): ChatRoom => {
    if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
      throw new Error('Dados inválidos da sala');
    }

    const fields = response.data.content.fields as any;
    return {
      id: response.data.objectId,
      name: fields.name,
      owner: fields.owner,
      messageCount: Number(fields.message_count),
      currentBlockNumber: Number(fields.current_block_number),
      createdAt: Number(fields.created_at),
      isPrivate: fields.is_private,
      bannedUsers: fields.banned_users || [],
      moderators: fields.moderators || [],
    };
  };

  const parseMessage = (response: SuiObjectResponse): Message => {
    if (!response.data?.content || response.data.content.dataType !== 'moveObject') {
      throw new Error('Dados inválidos da mensagem');
    }

    const fields = response.data.content.fields as any;
    return {
      id: response.data.objectId,
      roomId: fields.room_id,
      sender: fields.sender,
      username: fields.username,
      content: fields.content,
      timestamp: Number(fields.timestamp),
      blockNumber: Number(fields.block_number),
      messageNumber: Number(fields.message_number),
      edited: fields.edited,
      replyTo: fields.reply_to?.Some?.[0],
    };
  };

  // Actions
  const fetchRoom = async (roomId: string) => {
    const key = `room-${roomId}`;
    loading.value.set(key, true);
    errors.value.delete(key);

    try {
      const response = await suiClient.client.getObject({
        id: roomId,
        options: { showContent: true },
      });

      const room = parseRoom(response);
      rooms.value.set(roomId, room);
      
      return room;
    } catch (error) {
      const err = error as Error;
      errors.value.set(key, err);
      throw err;
    } finally {
      loading.value.set(key, false);
    }
  };

  const fetchMessageBlock = async (roomId: string, blockNumber: number) => {
    const key = `block-${roomId}-${blockNumber}`;
    loading.value.set(key, true);
    errors.value.delete(key);

    try {
      // 1. Buscar o MessageBlock (dynamic field)
      const blockResponse = await suiClient.client.getDynamicFieldObject({
        parentId: roomId,
        name: {
          type: 'u64',
          value: blockNumber.toString(),
        },
      });

      if (!blockResponse.data?.content || blockResponse.data.content.dataType !== 'moveObject') {
        throw new Error('Bloco não encontrado');
      }

      const blockFields = blockResponse.data.content.fields as any;
      const messageIds: string[] = blockFields.message_ids || [];

      if (messageIds.length === 0) return [];

      // 2. Buscar todas as mensagens do bloco
      const messagesResponse = await suiClient.client.multiGetObjects({
        ids: messageIds,
        options: { showContent: true },
      });

      const fetchedMessages = messagesResponse
        .filter(r => r.data?.content?.dataType === 'moveObject')
        .map(r => parseMessage(r));

      // 3. Armazenar no state
      fetchedMessages.forEach(msg => {
        messages.value.set(msg.id, msg);
      });

      // 4. Atualizar índice de mensagens por sala
      const existingIds = messagesByRoom.value.get(roomId) || [];
      const newIds = fetchedMessages.map(m => m.id);
      const uniqueIds = [...new Set([...existingIds, ...newIds])];
      messagesByRoom.value.set(roomId, uniqueIds);

      return fetchedMessages;
    } catch (error) {
      const err = error as Error;
      errors.value.set(key, err);
      throw err;
    } finally {
      loading.value.set(key, false);
    }
  };

  const fetchRoomWithMessages = async (roomId: string) => {
    // Buscar sala
    const room = await fetchRoom(roomId);
    
    // Buscar bloco atual de mensagens
    if (room.currentBlockNumber >= 0) {
      await fetchMessageBlock(roomId, room.currentBlockNumber);
    }
    
    return room;
  };

  const loadMoreMessages = async (roomId: string, blockNumber: number) => {
    return await fetchMessageBlock(roomId, blockNumber);
  };

  const setActiveRoom = (roomId: string | null) => {
    activeRoomId.value = roomId;
  };

  const clearRoom = (roomId: string) => {
    rooms.value.delete(roomId);
    messagesByRoom.value.delete(roomId);
  };

  const clearAllMessages = () => {
    messages.value.clear();
    messagesByRoom.value.clear();
  };

  return {
    // State
    rooms,
    messages,
    activeRoomId,
    
    // Getters
    activeRoom,
    activeRoomMessages,
    isLoading,
    getError,
    
    // Actions
    fetchRoom,
    fetchMessageBlock,
    fetchRoomWithMessages,
    loadMoreMessages,
    setActiveRoom,
    clearRoom,
    clearAllMessages,
  };
});



// ==================== 5. Pinia Store - transactionStore.ts ====================
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Transaction } from '@mysten/sui.js/transactions';
import { useWalletStore } from './walletStore';
import { useSuiClientStore } from './suiClientStore';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '';
const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID || '';

export const useTransactionStore = defineStore('transaction', () => {
  const walletStore = useWalletStore();
  const suiClient = useSuiClientStore();

  // State
  const pending = ref(false);
  const lastTxDigest = ref<string | null>(null);
  const error = ref<Error | null>(null);

  // Actions
  const sendMessage = async (
    roomId: string,
    profileId: string,
    content: string,
    replyTo?: string
  ) => {
    if (!walletStore.account) {
      throw new Error('Carteira não conectada');
    }

    pending.value = true;
    error.value = null;

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::multi_user_chat::send_message`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.object(profileId),
          tx.object(roomId),
          tx.pure.string(content),
          replyTo ? tx.pure.option('id', replyTo) : tx.pure.option('id', null),
          tx.object('0x6'), // Clock object
        ],
      });

      // Assinar e executar via wallet
      const walletApi = walletStore.account.wallet;
      const result = await walletApi.features['sui:signAndExecuteTransactionBlock']
        .signAndExecuteTransactionBlock({
          transactionBlock: tx,
          account: walletStore.account,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

      lastTxDigest.value = result.digest;
      
      // Aguardar confirmação
      await suiClient.client.waitForTransaction({
        digest: result.digest,
      });

      return result;
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      pending.value = false;
    }
  };

  const createRoom = async (name: string, isPrivate: boolean) => {
    if (!walletStore.account) {
      throw new Error('Carteira não conectada');
    }

    pending.value = true;
    error.value = null;

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::multi_user_chat::create_room`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.string(name),
          tx.pure.bool(isPrivate),
          tx.object('0x6'), // Clock
        ],
      });

      const walletApi = walletStore.account.wallet;
      const result = await walletApi.features['sui:signAndExecuteTransactionBlock']
        .signAndExecuteTransactionBlock({
          transactionBlock: tx,
          account: walletStore.account,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

      lastTxDigest.value = result.digest;
      
      await suiClient.client.waitForTransaction({
        digest: result.digest,
      });

      // Extrair ID da sala criada dos object changes
      const roomObject = result.objectChanges?.find(
        (change: any) => change.type === 'created' && 
        change.objectType?.includes('ChatRoom')
      );

      return {
        result,
        roomId: roomObject?.objectId,
      };
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      pending.value = false;
    }
  };

  
  return {
    // State
    pending,
    lastTxDigest,
    error,
    
    // Actions
    sendMessage,
    createRoom,
    createProfile,
  };
});



// ==================== 7. Component - ChatRoom.vue ====================
/*
<template>
  <div class="chat-room">
    <div v-if="chatStore.isLoading(`room-${roomId}`)">
      Carregando sala...
    </div>
    
    <div v-else-if="chatStore.getError(`room-${roomId}`)">
      Erro: {{ chatStore.getError(`room-${roomId}`)?.message }}
    </div>
    
    <div v-else-if="room">
      <header class="room-header">
        <h1>{{ room.name }}</h1>
        <p>{{ room.messageCount }} mensagens</p>
        <button @click="refresh">🔄 Atualizar</button>
      </header>

      <div class="messages">
        <div 
          v-for="msg in chatStore.activeRoomMessages" 
          :key="msg.id"
          class="message"
        >
          <strong>{{ msg.username }}:</strong> {{ msg.content }}
          <small>{{ formatDate(msg.timestamp) }}</small>
        </div>
      </div>

      <div v-if="room.currentBlockNumber > 0" class="load-more">
        <button @click="loadOlder">Carregar mensagens antigas</button>
      </div>

      <form @submit.prevent="sendMsg" class="message-form">
        <input 
          v-model="newMessage" 
          placeholder="Digite sua mensagem..."
          :disabled="txStore.pending"
        />
        <button type="submit" :disabled="txStore.pending">
          {{ txStore.pending ? 'Enviando...' : 'Enviar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useUserStore } from '@/stores/userStore';
import { useWalletStore } from '@/stores/walletStore';

const props = defineProps<{ roomId: string }>();

const chatStore = useChatStore();
const txStore = useTransactionStore();
const userStore = useUserStore();
const walletStore = useWalletStore();

const newMessage = ref('');
const oldestBlock = ref<number | null>(null);

const room = computed(() => chatStore.rooms.get(props.roomId));

const loadRoom = async () => {
  await chatStore.fetchRoomWithMessages(props.roomId);
  chatStore.setActiveRoom(props.roomId);
};

const refresh = () => {
  loadRoom();
};

const loadOlder = async () => {
  if (!room.value) return;
  
  const blockToLoad = oldestBlock.value ?? room.value.currentBlockNumber - 1;
  if (blockToLoad >= 0) {
    await chatStore.loadMoreMessages(props.roomId, blockToLoad);
    oldestBlock.value = blockToLoad - 1;
  }
};

const sendMsg = async () => {
  if (!newMessage.value.trim()) return;
  
  // Pegar primeiro perfil do usuário
  const profiles = await userStore.fetchUserProfiles(walletStore.address!);
  if (!profiles.length) {
    alert('Você precisa criar um perfil primeiro');
    return;
  }

  try {
    await txStore.sendMessage(props.roomId, profiles[0].id, newMessage.value);
    newMessage.value = '';
    
    // Recarregar mensagens
    setTimeout(() => refresh(), 2000);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(() => {
  loadRoom();
});

watch(() => props.roomId, () => {
  loadRoom();
});
</script>
*/