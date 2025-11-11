import { defineBoot } from '#q-app/wrappers';
import '@anilkumarthakur/vue3-json-viewer/styles.css';
import { JsonViewer } from '@anilkumarthakur/vue3-json-viewer';

export default defineBoot(async ({ app, router, store }) => {
  app.component('JsonViewer', JsonViewer)   ;
});
