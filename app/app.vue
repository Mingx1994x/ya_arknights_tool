<template>
  <div>
    <NuxtRouteAnnouncer />
    <!-- 有 app.vue 時 layouts/ 不會自動生效，必須顯式包一層 NuxtLayout -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
