<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  colors: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const dropdownRef = ref(null);

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}

function selectColor(color) {
  emit('update:modelValue', color.value);
  isOpen.value = false;
}

const selectedColor = computed(() => 
  props.colors.find(color => color.value === props.modelValue)
);
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <button
      type="button"
      @click="isOpen = !isOpen"
      class="w-6 h-6 rounded-full border border-gray-300 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400"
      :style="{ backgroundColor: selectedColor?.value }"
    >
    </button>

    <div
      v-if="isOpen"
      class="absolute z-50 mt-1 bg-white rounded-md shadow-lg border border-gray-200 p-2 grid grid-cols-3 gap-2"
    >
      <button
        v-for="color in colors"
        :key="color.value"
        type="button"
        @click="selectColor(color)"
        class="w-4 h-4 rounded-full hover:ring-1 hover:ring-red-400 transition-all"
        :class="{ 'ring-2 ring-red-400': modelValue === color.value }"
        :style="{ backgroundColor: color.value }"
      >
      </button>
    </div>
  </div>
</template>