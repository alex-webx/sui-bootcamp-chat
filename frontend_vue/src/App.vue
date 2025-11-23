<template lang="pug">
router-view( v-slot="{ Component }")
  transition(name="filtro-transicao" mode="out-in")
    component(:is="Component")

</template>

<script setup lang="ts">
import { inject, onMounted } from 'vue';
import * as encrypt from './utils/encrypt';

</script>
<style lang="scss">
/* Define a duração e a função de temporização da transição para a propriedade filter */
.filtro-transicao-enter-active,
.filtro-transicao-leave-active {
  transition: filter 0.5s ease; /* A transição ocorrerá em 0.5 segundos */
}

/* Estado inicial (enter-from) e final (leave-to) com filtro sépia e contraste reduzido */
.filtro-transicao-enter-from,
.filtro-transicao-leave-to {
  filter: blur(5px); /* Aplica o filtro desejado */
}

/* Estado final (enter-to) e inicial (leave-from) sem filtro (padrão) */
.filtro-transicao-enter-to,
.filtro-transicao-leave-from {
  filter: none;
}
</style>
