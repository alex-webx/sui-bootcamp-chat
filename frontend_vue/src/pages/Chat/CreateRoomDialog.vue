<template lang="pug">
q-dialog(ref="dialogRef" @hide="onDialogHide" persistent)
  q-card.q-dialog-plugin.dialog-top-bordered(style="min-width: 500px")
    q-card-section.q-dialog__title
      | Criar nova sala

    q-card-section(v-if="step > 1 && step < 5")
      .flex.flex-center.column.full-width
        q-avatar(v-if="newChatRoom.imageUrl" size="50px")
          q-img(:src="newChatRoom.imageUrl" :ratio="1" fit="cover" error-src="/logo.png")
        .text-subtitle1.text-weight-bold.q-mt-sm {{ newChatRoom.name }}

    q-card-section.q-pa-none

      q-stepper(
        v-model="step" ref="stepper" contracted
        color="primary" animated flat header-class="stepper-header"
      )
        q-step(
          :name="1" caption="1" title="1"
          icon="settings"
          :done="step > 1"
        )
          q-form(ref="formStep1")
            .row.q-col-gutter-y-md
              .col-xs-12
                q-input(
                  v-model="newChatRoom.name"
                  label="Nome da sala (5-50 caracteres) *"
                  type="text" :minlength="5" :maxlength="50"
                  outlined hide-bottom-space
                  :rules=`[
                    val => val.length >= 5 || 'Mínimo de 5 caracteres',
                    val => val.length <= 50 || 'Máximo de 50 caracteres',
                    val => val.length || '* Campo obrigatório'
                  ]`
                )

              .col-xs-12
                q-input(
                  v-model="newChatRoom.imageUrl"
                  label="Imagem da sala (URL ou data:image)" outlined type="text"
                )
                  template(#after v-if="newChatRoom.imageUrl")
                    q-avatar(size="54px")
                      q-img(:src="newChatRoom.imageUrl" :ratio="1" error-src="/logo.png" fit="cover")

        q-step(
          :name="2" caption="2" title="2"
          icon="lock"
          :done="step > 2"
        )
          .row.q-col-gutter-y-md
            .col-xs-12
              q-btn-toggle(
                spread no-caps v-model="newChatRoom.isRestricted" push toggle-color="medium-sea"
                :options=`[
                  { value: true, slot: 'private' },
                  { value: false, slot: 'public' }
                ]`
              )
                template(#private)
                  .no-wrap.q-my-md.justify-start
                    q-icon.q-mb-sm(name="mdi-lock-open-check-outline" size="md")
                    .text-center Acesso Restrito
                    .text-center.text-caption É necessário ser convidado para ingressar na sala.
                template(#public)
                  .no-wrap.q-my-md.align
                    q-icon.q-mb-sm(name="mdi-lock-open-variant-outline" size="md")
                    .text-center Acesso Público
                    .text-center.text-caption Qualquer um pode ingressar na sala.

            template(v-if="newChatRoom.isRestricted")
              .col-xs-12.column
                div Quem pode convidar?
                q-select(
                  v-model="newChatRoom.inviteLevel"
                  emit-value map-options
                  :options=`[
                    { label: 'Administrador', value: 'administrator' },
                    { label: 'Admin e Moderadores', value: 'moderators' },
                    { label: 'Qualquer um', value: 'all' }
                  ]`
                  outlined dense
                )

        q-step(
          :name="3" caption="3" title="3"
          icon="mdi-message-cog-outline"
          :done="step > 3"
        )
          .row.q-col-gutter-y-md
            .col-xs-12
              q-btn-toggle(
                spread no-caps v-model="newChatRoom.isAnnouncements" push toggle-color="medium-sea"
                :options=`[
                  { value: false, slot: 'group' },
                  { value: true, slot: 'announcements' }
                ]`
              )
                template(#group)
                  .no-wrap.q-my-md
                    q-icon.q-mb-sm(name="mdi-account-group" size="md")
                    .text-center Grupo de Mensagens
                    .text-center.text-caption Todos os membros podem visualizar e enviar mensagens. Excções podem ser aplicadas com banimento.

                template(#announcements)
                  .no-wrap.q-my-md
                    q-icon.q-mb-sm(name="mdi-bullhorn-variant-outline" size="md")
                    .text-center Comunicados e Avisos
                    .text-center.text-caption Todos podem ler as mensagens, porém apenas o administrador e moderadores podem enviar mensagens.


        q-step(
          :name="4" caption="4" title="4"
          icon="security"
          :done="step > 4"
        )
          .row.items-center.q-col-gutter-y-sm

            .col-xs-8
              | Limitar capacidade máxima da sala

            .col-xs-4.text-right
              q-toggle(
                :modelValue="newChatRoom.maxMembers >= 2"
                @update:modelValue="newChatRoom.maxMembers = newChatRoom.maxMembers >= 2 ? 0 : 100"
              )

            template(v-if="newChatRoom.maxMembers >= 2")
              .col-xs-8
                | Quantidade máxima de membros

              .col-xs-4
                q-input(
                  v-model="newChatRoom.maxMembers" dense :debounce="1000"
                  type="number"
                  outlined hide-bottom-space
                )

        q-step(
          :name="5" caption="5" title="5"
          icon="mdi-check-circle-outline"
          :done="step > 5"
        )
          .flex.flex-center.full-width
            q-card.bg-light-ocean.text-white.full-width
              q-card-section
                .column.items-center
                  div
                    q-avatar(size="80px")
                      q-img(:src="newChatRoom.imageUrl" :ratio="1" error-src="/logo.png" fit="cover")

                  .text-subtitle1.text-weight-bold {{ newChatRoom.name }}

                  .q-mt-md(style="max-width: 300px")
                    .flex
                      .flex.full-width.justify-between
                        div Acesso:
                        .text-weight-bold {{ newChatRoom.isRestricted ? 'restrito' : 'público' }}
                      .flex.full-width.justify-between
                        div Tipo:
                        .text-weight-bold {{ newChatRoom.isAnnouncements ? 'comunicados e avisos' : 'grupo de mensagens' }}
                      .flex.full-width.justify-between
                        div Capacidade:
                        .text-weight-bold {{ newChatRoom.maxMembers === 0 ? 'sem limite' : `${newChatRoom.maxMembers} membros` }}
                      .flex.full-width.justify-between
                        div Geração de convites:
                        .text-weight-bold(v-if="!newChatRoom.isRestricted || newChatRoom.inviteLevel === 'all'") qualquer um
                        .text-weight-bold(v-else-if="newChatRoom.inviteLevel === 'moderators'") admin. e moderadores
                        .text-weight-bold(v-else-if="newChatRoom.inviteLevel === 'administrator'") apenas administrador


        template(v-slot:navigation)
          q-separator

          q-stepper-navigation.bg-grey-2
            .flex.justify-between.q-pt-lg
              q-btn(flat color="grey-7" @click="onDialogHide" label="Cancelar")
              div
                q-btn(v-if="step > 1" flat color="primary" @click="$refs.stepper.previous()" label="Voltar" class="q-mr-sm")

                q-btn(v-if="step < 4" @click="nextStep()" color="primary" label="Continuar")
                q-btn(v-else-if="step === 4" @click="nextStep()" color="primary" label="Revisar dados")
                q-async-btn(v-else-if="step === 5" :handler="createChatRoom" color="primary" label="Criar sala")

</template>
<script setup lang="ts">
import { ref } from 'vue';
import { QForm, useDialogPluginComponent } from 'quasar';
import { useChatStore } from '../../stores/chatStore';

const step = ref(1);

const emits = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const chatStore = useChatStore();
const formStep1 = ref<InstanceType<typeof QForm>>();
const busy = ref(false);

const newChatRoom = ref<Parameters<typeof chatStore.createChatRoom>[0]>({
  name: '',
  imageUrl: '',
  maxMembers: 100,
  isRestricted: true,
  isAnnouncements: false,
  inviteLevel: 'administrator'
});

const { dialogRef, onDialogHide, onDialogCancel, onDialogOK } = useDialogPluginComponent();

const nextStep = async () => {
  const form = {
    1: formStep1.value,
  }[step.value];

  if (!form) {
    step.value++;
    return;
  } else {
    if (await form.validate(true)) {
      step.value++;
    }
  }
};

const createChatRoom = async () => {
  busy.value = true;
  try {
    const res = await chatStore.createChatRoom(newChatRoom.value);
    if (res) {
      onDialogOK(res);
    }
  } finally {
    busy.value = false;
  }
};

</script>
<style lang="scss" scoped>
.q-stepper {
  :deep(.stepper-header) {
    min-height: auto;
    .q-stepper__tab {
      padding: 0 !important;
      min-height: auto;
    }
  }
}
</style>
