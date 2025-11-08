<template lang="pug">
.WAL.position-relative.bg-ocean(:style="style")
  .waves-container
    svg.waves(xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 24 150 28" preserveAspectRatio="none" shape-rendering="auto")
      defs
        path(id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z")
      g.parallax
        use(xlink:href="#gentle-wave" x="48" y="0" fill="rgba(1,24,41,0.7")
        use(xlink:href="#gentle-wave" x="48" y="3" fill="rgba(1,24,41,0.5)")
        use(xlink:href="#gentle-wave" x="48" y="5" fill="rgba(1,24,41,0.3)")
        use(xlink:href="#gentle-wave" x="48" y="7" fill="rgb(1,24,41)")
  
  q-layout.WAL__layout.shadow-3.bg-grey-4(
    view="lHh Lpr lFf" container
  )
    q-header(elevated dark)
      q-toolbar.bg-deep-sea.text-white
        q-btn.WAL__drawer-open.q-mr-sm(
          round flat
          icon="keyboard_arrow_left"
          @click="toggleLeftDrawer"
        )

        q-btn(round flat)
          q-avatar
            img(:src="currentConversation.avatar")

        span.q-subtitle-1.q-pl-md
          | {{ currentConversation.person }}

        q-space

        //- q-btn(round flat icon="search")
        //- q-btn(round flat)
        //-   q-icon.rotate-135(name="attachment")

        q-btn(round flat icon="more_vert")
          q-menu(auto-close :offset="[110, 0]")
            q-list(style="min-width: 150px")
              q-item(clickable)
                q-item-section Contact data
              q-item(clickable)
                q-item-section Block
              q-item(clickable)
                q-item-section Select messages
              q-item(clickable)
                q-item-section Silence
              q-item(clickable)
                q-item-section Clear messages
              q-item(clickable)
                q-item-section Erase messages

    q-drawer.bg-grey-2(
      v-model="leftDrawerOpen"
      show-if-above 
      :breakpoint="690" dark
      width="370"
    )
      q-toolbar.bg-deep-sea
        q-avatar.cursor-pointer
          img(src="logo-transp.png")

        q-space

        //- q-btn(round flat icon="message")
        q-btn(round flat icon="more_vert")
          q-menu(auto-close :offset="[110, 8]")
            q-list(style="min-width: 150px")
              q-item(clickable)
                q-item-section New group
              q-item(clickable)
                q-item-section Profile
              q-item(clickable)
                q-item-section Archived
              q-item(clickable)
                q-item-section Favorites
              q-item(clickable)
                q-item-section Settings
              q-item(clickable)
                q-item-section Logout

        q-btn.WAL__drawer-close(
          round
          flat
          icon="close"
          @click="toggleLeftDrawer"
        )

      q-scroll-area.bg-grey-2(style="height: calc(100% - 100px)")
        q-list
          q-item.text-dark(
            v-for="(conversation, index) in conversations"
            :key="conversation.id"
            clickable
            v-ripple
            @click="setCurrentConversation(index)"
            :class="{ 'active-item': index === currentConversationIndex }"
          )
            q-item-section(avatar)
              q-avatar
                img(:src="conversation.avatar")

            q-item-section
              q-item-label(lines="1")
                | {{ conversation.person }}
              q-item-label.conversation__summary(caption)
                q-icon(name="check" v-if="conversation.sent")
                q-icon(name="not_interested" v-if="conversation.deleted")
                | {{ conversation.caption }}

            q-item-section(side)
              q-item-label(caption)
                | {{ conversation.time }}
              q-icon(name="keyboard_arrow_down")

    q-page-container(style="display: flex; flex-direction: column; overflow: auto; min-height: calc(100vh - 40px)")
      router-view

    q-footer
      q-toolbar.bg-deep-sea.text-white.row
        //- q-btn.q-mr-sm(round flat icon="insert_emoticon")
        q-input(rounded outlined dense class="WAL__field col-grow q-mr-sm" bg-color="white" v-model="message" placeholder="Type a message")
        q-btn(round flat icon="send")

</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const conversations = [
  {
    id: 1,
    person: 'Bahhhhh Tattynha',
    avatar: 'https://pbs.twimg.com/profile_images/1950240708746440704/9aWWNa28_normal.jpg',
    caption: 'Bahhhteu uma fominha, queria batata sauté',
    time: '15:32',
    sent: true
  },
  {
    id: 2,    
    person: 'SuperSöze',
    avatar: 'https://pbs.twimg.com/profile_images/1033390697389457411/vCHpOEbZ_normal.jpg',
    caption: 'I\'m a rich man, where\'s gquinta?',
    time: '14:23',
    sent: true
  },
  {
    id: 3,
    person: 'Lule',
    avatar: 'https://pbs.twimg.com/profile_images/1630217574100213762/SAMK-BnB_normal.jpg',
    caption: 'cumpanhero acho q ezagerei na cachaça onti parece até co fígado tá pedindo arrego',
    time: '10:55',        
    sent: true
  },
  {
    id: 4,
    person: 'Oportunidades de Gópis de Natal',
    avatar: 'data:image/jpeg;base64,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',
    caption: 'Sujão: quem quer whitelist pra entrar na pré-venda do token $NATAL?',    
    time: '09:28',
    sent: true
  }
];

const $q = useQuasar();
const router = useRouter();

const leftDrawerOpen = ref(false);
const message = ref('');
const currentConversationIndex = ref(0);

const currentConversation = computed(() => {
  return conversations[ currentConversationIndex.value ];
});

const style = computed(() => ({
  height: $q.screen.height + 'px'
}));

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value;
};

const setCurrentConversation = (index: number) => {
  currentConversationIndex.value = index;  
  router.push({ name: 'chat-room', params: { user: currentConversation.value?.id } })
  
};

</script>

<style lang="scss" scoped>
.WAL {
  width: 100%;
  height: 100%;
  padding-top: 20px;
  padding-bottom: 20px;

  &:before {
    content: '';
    height: 300px;
    position: fixed;
    top: 0;
    width: 100%;
    background-color: $sea;    
  }

  &__layout {
    margin: 0 auto;
    z-index: 4000;
    height: 100%;
    width: 90%;
    max-width: 1450px;
    border-radius: 5px;
  }

  &__field.q-field--outlined .q-field__control:before {
    border: none;
  }

  .q-drawer--standard {
    .WAL__drawer-close {
      display: none;
    }
  }
}

@media (max-width: 850px) {
  .WAL {
    padding: 0;
    &__layout {
      width: 100%;
      border-radius: 0;
    }
  }
}

@media (min-width: 691px) {
  .WAL {
    &__drawer-open {
      display: none;
    }
  }
}

.conversation__summary {
  margin-top: 4px;
}

.conversation__more {
  margin-top: 0!important;
  font-size: 1.4rem;
}

.active-item {
  background-color: rgba($sea, 0.2);
}

.waves-container {
  position: absolute;
  top: 0;
  width: 100%;

  .waves {
    position:relative;
    width: 100%;
    height: 15vh;
    margin-bottom: -7px; /*Fix for safari gap*/
    min-height: 300px;
    max-height: 350px;
  }

  .content {
    position:relative;
    height:20vh;
    text-align:center;
    background-color: white;
  }

  /* Animation */
  $duration-factor: 4;

  .parallax > use {
    animation: move-forever 25s cubic-bezier(.55,.5,.45,.5)     infinite;
  }
  .parallax > use:nth-child(1) {
    animation-delay: -2s * $duration-factor;
    animation-duration: 7s * $duration-factor;
  }
  .parallax > use:nth-child(2) {
    animation-delay: -3s * $duration-factor;
    animation-duration: 10s * $duration-factor;
  }
  .parallax > use:nth-child(3) {
    animation-delay: -4s * $duration-factor;
    animation-duration: 13s * $duration-factor;
  }
  .parallax > use:nth-child(4) {
    animation-delay: -5s * $duration-factor;
    animation-duration: 20s * $duration-factor;
  }
  @keyframes move-forever {
    0% {
    transform: translate3d(-90px,0,0);
    }
    100% { 
      transform: translate3d(85px,0,0);
    }
  }
}
</style>
