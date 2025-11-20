import { defineBoot } from '#q-app/wrappers';

import moment from 'moment';
import 'moment/dist/locale/pt-br';

import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

import EmojiPicker from 'vue3-emoji-picker';
import 'vue3-emoji-picker/css';

export default defineBoot(async ({ app, router, urlPath, store, redirect }) => {
  app.component('VueJsonPretty', VueJsonPretty);
  app.component('EmojiPicker', EmojiPicker);
});



