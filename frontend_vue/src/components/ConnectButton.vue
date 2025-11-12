<template lang="pug">
.connect-button
  template(v-if="!isConnected")
    q-btn(
      @click="showModal()"
      v-bind="$attrs"
      label="Conectar carteira SUI"
    )

  .wallet-info(v-else)
    q-btn(
      @click="handleDisconnect()"
      push rounded color="primary" no-caps
    )
      | {{ shortAddress }}
      q-icon(name="logout" right)

  q-dialog(v-model="modal" backdrop-filter="blur(10px)")
    q-card.bg-ocean.rounded(
      dark style="min-width: 275px; max-width: 420px"
    )
      q-card-section
        .row.items-center
          .col
            .text-h6.q-pl-md.q-pr-lg
              | Selecione uma Carteira

          .col-xs-auto
            q-btn(icon="close" round v-close-popup size="md" dense)

        .row.items-center
          .col-xs-12(v-if="wallets.length === 0")
            q-banner.q-my-md.bg-deep-ocean.text-center(
              dark rounded style="border: 1px solid rgba(255,255,255,0.2)"
            )
              | Nenhuma carteira SUI compatível detectada.

          .col-xs-12
            .q-px-none.q-mt-md
              q-list
                q-item(
                  v-for="wallet in wallets" :key="wallet.name"
                  clickable
                  @click="selectWallet(wallet.name)"
                )
                  q-item-section(avatar)
                    q-avatar
                      q-img.bg-dark(v-if="wallet.icon" :src="wallet.icon")
                  q-item-section
                    q-item-label {{ wallet.name }}

</template>

<script setup lang="ts" inherit-attrs="true">
import { ref, computed, onMounted } from 'vue';
import { useWalletStore } from '../stores/walletStore';
import { useUserStore } from '../stores/userStore';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Dialog, Notify } from 'quasar';

const walletStore = useWalletStore();
const userStore = useUserStore();
const router = useRouter();
const modal = ref(false);

const { wallets, address, isConnected, isConnecting } = storeToRefs(walletStore);

const shortAddress = computed(() => `${address.value?.slice(0, 6)}...${address.value?.slice(-4)}`);
let abortController: AbortController | null = null;
let timeoutLimitSeconds = 60;

const showModal = async () => {
  modal.value = true;
};

const selectWallet = async (walletName: string) => {
  let dialog: ReturnType<typeof Dialog.create> | null = null;
  try {
    modal.value = false;
    abortController = new AbortController();

    dialog = Dialog.create({
      title: 'Aprove a conexão em sua carteira. Aguardando...',
      message: `A solicitação será automaticamente abortada em (${timeoutLimitSeconds}s)`,
      cancel: {
        label: 'Cancelar conexão'
      },
      ok: false,
      persistent: true,
    }).onCancel(() => {
      abortController?.abort();
    });

    let countdown  = timeoutLimitSeconds;

    const timer = setInterval(() => {
      countdown--

      if (countdown > 0) {
        dialog?.update({
          message: `A solicitação será cancelada em (${countdown}s)`
        })
      }
      else {
        clearInterval(timer);
        dialog?.hide();
      }
    }, 1000);

    await walletStore.connect(walletName, abortController.signal, timeoutLimitSeconds * 1000);

    router.push({ name: 'chat' });

  } catch {
    Notify.create({
      color: 'negative',
      message: 'Conexão rejeitada!'
    });
  } finally {
    dialog?.hide();
  }
};

const handleDisconnect = async () => {
  await walletStore.disconnect();
  router.push({ name: 'login' });
};

</script>
