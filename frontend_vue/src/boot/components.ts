import { defineBoot } from '#q-app/wrappers';

import '@anilkumarthakur/vue3-json-viewer/styles.css';
import { JsonViewer } from '@anilkumarthakur/vue3-json-viewer';

import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

export default defineBoot(async ({ app, router, urlPath, store, redirect }) => {
  app.component('JsonViewer', JsonViewer);
  app.component('EmojiPicker', EmojiPicker);
});
