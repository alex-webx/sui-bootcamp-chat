<template lang="pug">
.connect-button
  q-btn(
    v-if="!walletStore.isConnected" 
    @click="handleConnect"
    :disabled="walletStore.isConnecting"
    outline
  )
    | {{ walletStore.isConnecting ? 'Conectando...' : 'Conectar Carteira' }}

  .wallet-info(v-else)
    q-btn(
      @click="handleDisconnect()"
      push rounded color="primary" no-caps
    )
      | {{ userProfiles.length }}
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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWalletStore } from '../stores/walletStore';
import { useUserProfileStore } from '../stores/userProfileStore';

const walletStore = useWalletStore();
const userProfileStore = useUserProfileStore();
const showModal = ref(false);

const userProfiles = computed(() => Object.keys(userProfileStore.profiles));

const handleConnect = async () => {
  if (walletStore.wallets.length === 1) {
    await walletStore.connect(walletStore.wallets[0]?.name);
    await checkUserProfile();
  } else {
    showModal.value = true;
  }
};

const handleDisconnect = () => {
  walletStore.disconnect();
  walletStore.detectWallets();
};

const selectWallet = async (walletName: string) => {
  showModal.value = false;
  await walletStore.connect(walletName);
};

const shortenAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const checkUserProfile = async () => {
  const profiles = await userProfileStore.fetchUserProfiles();
  if (!profiles.length) {
    await userProfileStore.createProfile(prompt('username?') || 'Usuário');
  } else {
  }
}

onMounted(async () => {
  await walletStore.detectWallets();
  
  const connected = await walletStore.autoConnect();
  if (connected) {
    await checkUserProfile();
  }

});
</script>