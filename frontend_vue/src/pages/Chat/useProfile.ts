import { Dialog, Notify } from 'quasar';
import { useRouter } from 'vue-router';
import { useAppStore, useUserStore, useWalletStore } from '../../stores';
import EditProfileDialog from './EditProfileDialog.vue';

export function useProfile() {

  const router = useRouter();
  const walletStore = useWalletStore();
  const userStore = useUserStore();
  const app = useAppStore();

  const disconnect = async (silently = false) => {
    const shouldDisconnect = await new Promise((resolve) => {

      if (silently) { resolve(true); }

      Dialog.create({
        title: 'Tem certeza que deseja desconectar sua carteira?',
        cancel: {
          label: 'Cancelar',
          color: 'grey',
          flat: true
        },
        ok: {
          label: 'Desconectar',
          color: 'primary'
        }
      }).onOk(async () => {
        resolve(true);
      }).onDismiss(() => {
        resolve(false);
      });
    });

    if (shouldDisconnect) {
      await walletStore.disconnect();
      await app.resetState();
      await router.push({ name: 'login' });
    }
  };

  const deleteProfile = async () => {
    Dialog.create({
      title: 'Tem certeza que deseja excluir o seu perfil?',
      message: 'Esta operação não poderá ser desfeita.',
      cancel: {
        label: 'Cancelar',
        color: 'grey',
        flat: true
      },
      ok: {
        label: 'Excluir perfil'
      }
    }).onOk(async () => {
      const success = await userStore.deleteUserProfile();
      if (success === true) {
        disconnect(true);
        Notify.create({
          message: 'Perfil excluído com sucesso',
          color: 'primary'
        })
      }
    });
  };


  const editProfile = async () => {
    Dialog.create({
      component: EditProfileDialog
    }).onOk(async (updatedUserProfile: Parameters<typeof userStore.updateUserProfile>[0]) => {
      const notif = Notify.create({
        message: 'Atualizando dados do seu perfil...',
        caption: 'Por favor, assine a transação em sua carteira.',
        color: 'primary',
        spinner: true,
        group: false,
        timeout: 0
      });

      try {
        const response = await userStore.updateUserProfile(updatedUserProfile);
        if (response) {
          notif({
            message: 'Perfil atualizado com sucesso!',
            caption: '',
            timeout: 2500,
            spinner: false,
            icon: 'done',
            color: 'positive'
          });
          await userStore.fetchCurrentUserProfile();
        } else {
          notif({
            message: 'Não foi possível atualizar o seu perfil.',
            caption: '',
            timeout: 2500,
            spinner: false,
            icon: 'done',
            color: 'negative'
          });
        }
      } catch (exc) {
        console.log({exc});
        notif({
          message: 'Não foi possível atualizar o seu perfil.',
          caption: 'Ocorreu um erro: ' + exc,
          timeout: 2500,
          spinner: false,
          icon: 'done',
          color: 'negative'
        });
      }
    });
  };

  return {
    disconnect,
    deleteProfile,
    editProfile,

    walletStore,
    userStore
  };
}
