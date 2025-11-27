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
              q-list(dark)
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
                    q-item-label.text-right(caption v-if="wallet.name === storedSuiState.wallet")
                      q-badge.text-italic.bg-deep-ocean utilizada recentemente


</template>

<script setup lang="ts" inherit-attrs="true">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Dialog, Notify, openURL } from 'quasar';
import { useWalletStore, useAppStore, storedSuiState } from '../../stores';
import { shortenAddress, formatCoinBalance } from '../../utils/formatters';
import { getSuiBalance, getFaucet, getNetwork } from '../../move';

const walletStore = useWalletStore();
const appStore = useAppStore();
const router = useRouter();
const modal = ref(false);

const { wallets, address, isConnected, isConnecting } = storeToRefs(walletStore);

const shortAddress = computed(() => shortenAddress(address.value!));
let abortController: AbortController | null = null;
let timeoutLimitSeconds = 60;

const showModal = async () => {
  modal.value = true;
};

const selectWallet = async (walletName: string) => {
  let dialog: ReturnType<typeof Dialog.create> | null = null;
  let timer: any;

  try {
    modal.value = false;
    abortController = new AbortController();

    dialog = Dialog.create({
      title: 'Aprove a conexão em sua carteira. Aguardando...',
      message: `A solicitação será automaticamente abortada em (${timeoutLimitSeconds}s)`,
      cancel: {
        label: 'Cancelar conexão',
        disabled: true
      },
      ok: false,
      persistent: true,
    }).onCancel(() => {
      abortController?.abort();
    });

    let countdown  = timeoutLimitSeconds;

    timer = setInterval(() => {
      countdown--

      if (countdown > 0) {
        dialog?.update({
          message: `A solicitação será cancelada em (${countdown}s)`,
          cancel: {
            label: `Cancelar conexão`,
            disabled: countdown > (timeoutLimitSeconds - 3)
          }
        })
      } else {
        dialog?.hide();
      }
    }, 1000);

    await walletStore.connect(walletName, abortController.signal, timeoutLimitSeconds * 1000);

    if (address.value) {
      const balance = await getSuiBalance(address.value);
      if (!balance || balance < BigInt(0.25 * 10**9)) {
        const isMainnet = getNetwork() === 'mainnet';
        await new Promise((resolve, reject) => {
          Dialog.create({
            persistent: true,
            title: 'O seu saldo em SUI está baixo.',
            message: isMainnet ? 'Você precisará de SUI para interagir no aplicativo.' : 'Deseja utilizar o faucet de SUI?',
            ok: {
              label: isMainnet ? 'Continuar mesmo assim' : 'Quero SUI!',
              color: 'primary'
            },
            cancel: {
              label: isMainnet ? 'Voltar' : 'Não',
              color: 'grey',
              flat: true
            }
          }).onOk(async () => {

            if (!isMainnet) {
              try {
                await getFaucet(address.value!);
              } catch {
                openURL(`https://faucet.sui.io/?network=${getNetwork()}`);
              }
            }

            resolve(true);
          }).onCancel(() => {
            if (isMainnet) {
              reject();
            } else {
              resolve(true);
            }
          });
        });
      }

      router.push({ name: 'chat' });
    }
  } catch {
    Notify.create({
      color: 'negative',
      message: 'Conexão rejeitada pelo usuário!'
    });
  } finally {
    clearInterval(timer);
    dialog?.hide();
  }
};

const handleDisconnect = async () => {
  await appStore.resetState();
  router.push({ name: 'login' });
};

</script>
