<template lang="pug">
q-layout.bg-sea(view="lHh Lpr fff")
  q-page-container.text-white
    q-page.row.items-center.justify-center
      WavesBackground(:top="screenHeight / 1.3" :height="150")

      .absolute-bottom.text-center.text-caption
        div
          | 2025 | Powered by SUI
        div
          span Desenvolvido por
          q-btn(
            flat dense no-caps
            href="https://github.com/alex-webx" target="_blank"
            label="alex-webx" icon-right="mdi-github" size="md"
          )

      .absolute-bottom-right
        DeployLabel

      q-card.text-ocean.shadow-20.card-box.dialog-top-bordered
        q-card-section
          q-form(@submit="submit()" ref="myForm")
            .colum.q-gutter-y-md
              .flex.flex-center.items-center
                q-img(src="/logo.png" width="78px")
                .text-h3.text-ocean.q-ml-sm SuiChat

              .col.text-center
                q-chip(color="primary" outline) {{ shortAddress }}
                q-btn(
                  no-caps flat color="primary" rounded dense
                  @click="disconnect()"
                )
                  .text-caption Trocar carteira

              .col.text-center
                div Você ainda não possui um perfil.
                div Informe seus dados, assine a mensagem e aprove a transação.

              .col
                q-input(
                  label="Nome de usuário *" outlined maxlength="50" stack-label
                  v-model="form.username" :max="50" :maxlength="50" autofocus
                  :rules=`[
                    val => val.length < 50 || 'Máximo de 50 caracteres',
                    val => val.length || '* Campo obrigatório'
                  ]`
                )
              .col
                q-input(
                  label="Avatar (URL ou data:image)" outlined stack-label
                  v-model="form.avatarUrl"
                )
                  template(#after v-if="form.avatarUrl")
                    q-avatar(size="50px")
                      q-img(:src="form.avatarUrl" :ratio="1")
                        template(#error)
                          q-icon(name="mdi-account" size="50px" color="grey")

              .col
                .row.justify-between
                  .col-xs-12.col-sm.text-center
                    q-btn(
                      label="Desconectar" flat rounded
                      color="medium-sea" @click.prevent.stop="disconnect()"
                    )
                  .col-xs-12.col-sm.text-center
                    q-btn(
                      label="Acessar" icon-right="mdi-chevron-right"
                      color="medium-sea" push rounded type="submit"
                    )

      .absolute-top-right.q-ma-md
        SettingsMenu

</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore, useWalletStore, useAppStore } from '../../stores';
import { Screen, QForm, Loading, Notify } from 'quasar';

const router = useRouter();
const userStore = useUserStore();
const walletStore = useWalletStore();
const appStore = useAppStore();

const { account, address, shortAddress } = storeToRefs(walletStore);

const form = ref({ username: '', avatarUrl: '' });
const myForm = ref<InstanceType<typeof QForm>>();
const screenHeight = computed(() => Screen.height);

const disconnect = async () => {
  await appStore.resetState();
  router.push({ name: 'login' });
}

const submit = async () => {
  if (myForm.value?.validate(true)) {
    try {
      Loading.show();
      if (!await userStore.fetchCurrentUserProfile()) {
        await userStore.createUserProfile(form.value);
      }

      if (userStore.profile) {
        router.push({ name: 'chat' });
      }
    } catch (exc: any) {
      console.log({ exc });
      Notify.create({
        message: exc?.message || exc?.name,
        caption: JSON.stringify(exc),
        color: 'negative'
      });
    } finally {
      Loading.hide();
    }
  }
}

</script>
<style lang="scss" scoped>
.card-box {
  border-radius: 16px;
  min-width: 260px;
  max-width: 80vw;
  padding: 8px 16px;
}
</style>
