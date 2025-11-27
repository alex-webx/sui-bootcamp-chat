import { defineBoot } from '#q-app/wrappers';

import WavesBackground from '../components/WavesBackground.vue';
import SettingsMenu from '../components/SettingsMenu.vue';
import DeployLabel from '../components/DeployLabel.vue';
import TenorComponent from '../components/TenorComponent.vue';
import QAsyncBtn from '../components/QAsyncBtn.vue';

export default defineBoot(async ({ app, router, urlPath, store, redirect }) => {
  app.component('WavesBackground', WavesBackground);
  app.component('SettingsMenu', SettingsMenu);
  app.component('DeployLabel', DeployLabel);
  app.component('TenorComponent', TenorComponent);
  app.component('QAsyncBtn', QAsyncBtn);
});
