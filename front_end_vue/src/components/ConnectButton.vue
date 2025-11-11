<template lang="pug">
.connect-button
  q-btn(
    v-if="!walletStore.isConnected"
    @click="handleConnect"
    :disabled="walletStore.isConnecting"
    v-bind="$attrs"
  )
    | {{ walletStore.isConnecting ? 'Conectando...' : 'Conectar Carteira SUI' }}

  .wallet-info(v-else)
    q-btn(
      @click="handleDisconnect()"
      push rounded color="primary" no-caps
    )
      | {{ shortenAddress(walletStore.address) }}
      q-icon(name="logout" right)

    teleport(to="body")
      .modal-overlay(v-if="showModal" @click="showModal = false")
        .modal-content(@click.stop)
          h3 Selecione uma Carteira
          .wallet-list
            button.wallet-item(
              v-for="wallet in walletStore.wallets"
              :key="wallet.name"
              @click="selectWallet(wallet.name)"
            )
              img(v-if="wallet.icon" :src="wallet.icon" :alt="wallet.name")
              span {{ wallet.name }}

</template>

<script setup lang="ts" inherit-attrs="true">
import { ref, computed, onMounted } from 'vue';
import { useWalletStore } from '../stores/walletStore';
import { useUserStore } from '../stores/userStore';
import { useRouter } from 'vue-router';

const walletStore = useWalletStore();
const userStore = useUserStore();
const router = useRouter();
const showModal = ref(false);

const handleConnect = async () => {
  if (walletStore.wallets.length === 1) {
    await walletStore.connect(walletStore.wallets[0]?.name);
    router.push({ name: 'chat' });
  } else {
    showModal.value = true;
  }
};

const handleDisconnect = () => {
  walletStore.disconnect();
  router.push({ name: 'login' });
};

const selectWallet = async (walletName: string) => {
  showModal.value = false;
  await walletStore.connect(walletName);
};

const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

</script>
