import { defineBoot } from '#q-app/wrappers';

import WavesBackground from '../components/WavesBackground.vue';
import SettingsMenu from '../components/SettingsMenu.vue';
import DeployLabel from '../components/DeployLabel.vue';
import TenorComponent from '../components/TenorComponent.vue';
import ConnectButton from '../components/ConnectButton.vue';

export default defineBoot(async ({ app, router, urlPath, store, redirect }) => {
  app.component('ConnectButton', ConnectButton);
  app.component('WavesBackground', WavesBackground);
  app.component('SettingsMenu', SettingsMenu);
  app.component('DeployLabel', DeployLabel);
  app.component('TenorComponent', TenorComponent);
});
