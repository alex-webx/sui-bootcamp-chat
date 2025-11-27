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
                q-btn(v-else-if="step === 5" @click="createChatRoom()" color="primary" label="Criar sala")

</template>
<script setup lang="ts">
import { ref } from 'vue';
import { QForm, useDialogPluginComponent } from 'quasar';
import { useChat } from './useChat';

const step = ref(1);

const emits = defineEmits({
  ...useDialogPluginComponent.emitsObject
});

const chatService = useChat();
const formStep1 = ref<InstanceType<typeof QForm>>();
const busy = ref(false);

const newChatRoom = ref<Parameters<typeof chatService.createChatRoom>[0]>({
  name: 'Café & Cia',
  imageUrl: 'data:image/jpeg;base64,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',
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
    const res = await chatService.createChatRoom(newChatRoom.value);
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
