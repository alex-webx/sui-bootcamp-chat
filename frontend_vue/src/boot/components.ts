import { defineBoot } from '#q-app/wrappers';

import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

import WavesBackground from '../components/WavesBackground.vue';
import SettingsMenu from '../components/SettingsMenu.vue';
import DeployLabel from '../components/DeployLabel.vue';
import TenorComponent from '../components/TenorComponent.vue';
import ConnectButton from '../components/ConnectButton.vue';

export default defineBoot(async ({ app, router, urlPath, store, redirect }) => {
  app.component('VueJsonPretty', VueJsonPretty);
  app.component('EmojiPicker', EmojiPicker);

  app.component('ConnectButton', ConnectButton);
  app.component('WavesBackground', WavesBackground);
  app.component('SettingsMenu', SettingsMenu);
  app.component('DeployLabel', DeployLabel);
  app.component('TenorComponent', TenorComponent);
});


import moment from 'moment';
import 'moment/dist/locale/pt-br';
