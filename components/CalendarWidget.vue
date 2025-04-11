<script setup>
import tacklet from 'tacklet';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next';
import ColorDropdown from './ColorDropdown.vue';

// interface CalendarEvent {
//     id: null;
//     title: string;
//     date: string;
//     startTime: string;
//     endTime: string;
//     color: string;
//     description: string;
// }

// Initialize current week start
const currentWeekStart = ref((() => {
  const today = new Date();
  return today;
})());

// View state
const currentView = ref('day');

// Current time state
const currentTime = ref({
  hour: new Date().getHours(),
  minute: new Date().getMinutes()
});

// Update current time every minute
let timeInterval= null;
onMounted(() => {
  timeInterval = setInterval(() => {
    const now = new Date();
    currentTime.value = {
      hour: now.getHours(),
      minute: now.getMinutes()
    };
  }, 60000);

  nextTick(async ()=> {
    await tacklet.connect()
    const data = (await tacklet.getData()).calendarEvents;
    if (!data) return;
    events.value = data.map(event => {
        // Ensure date is properly converted to Date object
        const eventDate = event.date ? new Date(event.date) : new Date();
        // Validate that we have a valid date
        if (isNaN(eventDate.getTime())) {
          console.warn('Invalid date found in event, using current date as fallback');
          return { ...event, date: new Date() };
        }
        return { ...event, date: eventDate };
      });
  })
})
  // Load events from localStorage with proper date handling
//   const savedEvents = localStorage.getItem('calendarEvents');
//   if (savedEvents) {
//     try {
//       const parsedEvents = JSON.parse(savedEvents);
//       events.value = parsedEvents.map(event => {
//         // Ensure date is properly converted to Date object
//         const eventDate = event.date ? new Date(event.date) : new Date();
//         // Validate that we have a valid date
//         if (isNaN(eventDate.getTime())) {
//           console.warn('Invalid date found in event, using current date as fallback');
//           return { ...event, date: new Date() };
//         }
//         return { ...event, date: eventDate };
//       });
//     } catch (error) {
//       console.error('Error loading events from localStorage:', error);
//       events.value = [];
//     }
//   }
// });

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});

// Helper functions
const getDatesForWeek = (startDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

const getDatesForMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = new Date(year, month + 1, 0).getDay();
  
  // Get the first day to display (might be from previous month)
  const startDate = new Date(firstDay);
  startDate.setDate(1 - firstDay.getDay());
  
  // Calculate number of weeks needed
  const totalDays = Math.ceil((firstDay.getDay() + lastDay.getDate() + (6 - lastDayOfWeek)) / 7) * 7;
  
  const dates = [];
  const currentDate = new Date(startDate);
  
  // Generate only needed weeks
  for (let i = 0; i < totalDays; i++) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

const formatDayName = (date) => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

// Navigation functions
const goToPreviousWeek = () => {
  if (currentView.value === 'day') {
    const newDate = new Date(currentWeekStart.value);
    newDate.setDate(newDate.getDate() - 1);
    currentWeekStart.value = newDate;
  } else {
    const newDate = new Date(currentWeekStart.value);
    newDate.setDate(newDate.getDate() - 7);
    currentWeekStart.value = newDate;
  }
};

const goToNextWeek = () => {
  if (currentView.value === 'day') {
    const newDate = new Date(currentWeekStart.value);
    newDate.setDate(newDate.getDate() + 1);
    currentWeekStart.value = newDate;
  } else {
    const newDate = new Date(currentWeekStart.value);
    newDate.setDate(newDate.getDate() + 7);
    currentWeekStart.value = newDate;
  }
};

const goToToday = () => {
  const today = new Date();
  if (currentView.value === 'day') {
    currentWeekStart.value = today;
  } else {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.value = new Date(today.setDate(diff));
  }
};

// Time conversion helpers
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const timeToPosition = (timeStr) => {
  const minutes = timeToMinutes(timeStr);
  return (minutes / 60) * 64; // Each hour is 64px tall (h-16)
};

const calculateEventHeight = (startTime, endTime) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return ((endMinutes - startMinutes) / 60) * 64; // Each hour is 64px tall
};

// Process events to handle overlaps
const processEventsForDay = (dayEvents) => {
  if (!dayEvents.length) return [];
  
  const sortedEvents = [...dayEvents].sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    
    if (aStart === bStart) {
      const aDuration = timeToMinutes(a.endTime) - aStart;
      const bDuration = timeToMinutes(b.endTime) - bStart;
      return aDuration - bDuration;
    }
    
    return aStart - bStart;
  });
  
  const processedEvents = [];
  
  for (const event of sortedEvents) {
    const overlapping = processedEvents.filter(e => {
      const eStart = timeToMinutes(e.startTime);
      const eEnd = timeToMinutes(e.endTime);
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      
      return (
        (eventStart >= eStart && eventStart < eEnd) ||
        (eventEnd > eStart && eventEnd <= eEnd) ||
        (eventStart <= eStart && eventEnd >= eEnd)
      );
    });
    
    if (overlapping.length === 0) {
      processedEvents.push({
        ...event,
        column: 0,
        width: 1
      });
      continue;
    }
    
    let column = 0;
    const usedColumns = overlapping.map(e => e.column);
    
    while (usedColumns.includes(column)) {
      column++;
    }
    
    const columnsNeeded = Math.max(...overlapping.map(e => e.column + 1), column + 1);
    
    for (const e of processedEvents) {
      if (overlapping.includes(e)) {
        e.width = 1 / columnsNeeded;
      }
    }
    
    processedEvents.push({
      ...event,
      column,
      width: 1 / columnsNeeded
    });
  }
  
  return processedEvents;
};

// Computed properties
const weekDates = computed(() => getDatesForWeek(currentWeekStart.value));
const monthDates = computed(() => getDatesForMonth(currentWeekStart.value));

const displayDates = computed(() => 
  currentView.value === 'week' ? weekDates.value : 
  currentView.value === 'month' ? monthDates.value :
  [currentWeekStart.value]
);

const isCurrentMonth = (date) => {
  return date.getMonth() === currentWeekStart.value.getMonth();
};

const hours = computed(() => 
  Array.from({ length: 24 }, (_, i) => {
    return i.toString().padStart(2, '0') + ':00';
  })
);

const monthYearHeader = computed(() => {
  const startMonth = currentWeekStart.value.toLocaleString('default', { month: 'long' });
  const endDate = new Date(currentWeekStart.value);
  if (currentView.value === 'month') {
    endDate.setMonth(endDate.getMonth() + 1, 0);
  } else if (currentView.value === 'week') {
    endDate.setDate(endDate.getDate() + 6);
  }
  const endMonth = endDate.toLocaleString('default', { month: 'long' });
  const year = currentWeekStart.value.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${year}`;
  } else {
    const endYear = endDate.getFullYear();
    return endYear === year 
      ? `${startMonth} - ${endMonth} ${year}`
      : `${startMonth} ${year} - ${endMonth} ${endYear}`;
  }
});

// Mock events data
const events = ref([]);

// Modal state
const showModal = ref(false);
const isEditing = ref(false);
const newEvent = ref({
  id: null,
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  color: '#EBCFFF',
  description: '',
});

const predefinedColors = [
  { value: '#EBCFFF' },
  { value: '#CCEBFF' },
  { value: '#EBFFDC' },
  { value: '#FFDCA8' },
  { value: '#FFF5C2' },
  { value: '#FFD4C4' },
  { value: '#FF9E99' },
  { value: '#FFE3EF' }
];

// Edit event
const editEvent = (event) => {
  isEditing.value = true;
  newEvent.value = {
    ...event,
    date: event.date.toISOString().split('T')[0],
  };
  showModal.value = true;
};

// Save event
const saveEvent = () => {
  const event = {
    ...newEvent.value,
    id: newEvent.value.id || Date.now(),
    date: new Date(newEvent.value.date)
  };
  
  if (isEditing.value) {
    const index = events.value.findIndex(e => e.id === event.id);
    if (index !== -1) {
      events.value[index] = event;
    }
  } else {
    events.value.push(event);
  }
  tacklet.setData({ calendarEvents: JSON.parse(JSON.stringify(events.value)) });
  // localStorage.setItem('calendarEvents', JSON.stringify(events.value));
  
  // Reset form
  newEvent.value = {
    id: null,
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    color: '#ffecec',
    description: '',
  };
  isEditing.value = false;
  showModal.value = false;
};

// Add overlapping events
const eventsWithOverlaps = computed(() => events.value);

// Helper function to validate event dates
const isValidEventDate = (event) => {
  return event && event.date && event.date instanceof Date && !isNaN(event.date.getTime());
};

// Filter events with date validation
const filterEventsByDate = (events, date) => {
  return events.filter(event => {
    if (!isValidEventDate(event)) {
      return false;
    }
    return (
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  });
};
</script>

<template>
  <div class="font-sans bg-white rounded-lg w-full h-screen flex flex-col">
    <!-- Calendar header with navigation -->
    <div class="flex justify-between items-center bg-white z-20 px-4 py-2">
      <h2 class="text-xl font-semibold text-gray-800">{{ monthYearHeader }}</h2>
      <div class="flex gap-2 items-center">
        <div class="flex rounded-md shadow-sm" role="group">
          <button
            @click="currentView = 'day'"
            :class="[
              'px-3 py-1 text-sm border border-gray-300 first:rounded-l',
              currentView === 'day' 
                ? 'bg-red-400 text-white border-red-400' 
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            Day
          </button>
          <button
            @click="currentView = 'week'"
            :class="[
              'px-3 py-1 text-sm border border-gray-300 -ml-px',
              currentView === 'week' 
                ? 'bg-red-400 text-white border-red-400' 
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            Week
          </button>
          <button
            @click="currentView = 'month'"
            :class="[
              'px-3 py-1 text-sm border border-gray-300 -ml-px last:rounded-r',
              currentView === 'month' 
                ? 'bg-red-400 text-white border-red-400' 
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            Month
          </button>
        </div>
        <button 
          @click="showModal = true"
          class="px-3 py-1 text-sm text-white bg-red-400 rounded hover:bg-red-500 flex items-center gap-1"
        >
          <Plus :size="16" />
          Add Event
        </button>
        <button 
          @click="goToToday"
          class="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
        >
          Today
        </button>
        <button 
          @click="goToPreviousWeek"
          class="p-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
        >
          <ChevronLeft :size="16" />
        </button>
        <button 
          @click="goToNextWeek"
          class="p-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
        >
          <ChevronRight :size="16" />
        </button>
      </div>
    </div>
    
    <!-- Days header -->
    <div class="grid grid-cols-7 bg-white z-20 px-4 pb-2" :class="{ 'gap-1': currentView === 'month' }">
      <div 
        v-for="(date, index) in displayDates.slice(0, 7)" 
        :key="index"
        :class="['text-center text-gray-900', isToday(date) ? 'text-red-400 font-bold' : '']"
      >
        <div class="text-2xl">{{ date.getDate() }}</div>
        <div class="text-sm">{{ formatDayName(date) }}</div>
      </div>
    </div>

    <!-- Week View -->
    <div 
      v-if="currentView === 'week' || currentView === 'day'" 
      class="flex-1 overflow-auto relative"
    >
      <div :class="['relative grid', currentView === 'week' ? 'grid-cols-[auto_1fr]' : 'grid-cols-[100px_1fr]']">
        <div class="px-8 border-r border-gray-100 sticky left-0 bg-white z-10">
          <div 
            v-for="(hour, index) in hours" 
            :key="index"
            class="h-16 text-xs text-gray-400 pt-1 text-right pr-2"
          >
            {{ hour }}
          </div>
        </div>

        <!-- Calendar cells -->
        <div class="grid" :class="currentView === 'week' ? 'grid-cols-7' : 'grid-cols-1'">
          <!-- Grid lines -->
          <div v-for="(date, dateIndex) in displayDates" :key="date.toISOString()" class="relative">
            <div 
              v-for="(_, index) in hours" 
              :key="index"
              class="h-16 border-b border-gray-100"
            ></div>

            <template v-for="event in processEventsForDay(filterEventsByDate(eventsWithOverlaps, date))" :key="event.id">
              <div
                @click="editEvent(event)"
                class="absolute rounded px-2 overflow-hidden min-h-[24px] group hover:shadow-sm transition-shadow"
                :title="`${event.title} (${event.startTime}-${event.endTime})`"
                :style="{
                  top: `${(timeToMinutes(event.startTime) / 60) * 64}px`,
                  height: `${Math.max(calculateEventHeight(event.startTime, event.endTime), 24)}px`,
                  backgroundColor: event.color,
                  left: `${event.column * (100 * event.width)}%`,
                  width: `${100 * event.width}%`,
                  maxWidth: event.width === 1 ? 'calc(100% - 8px)' : 'none',
                  marginLeft: event.width === 1 ? '4px' : '0',
                  marginRight: event.width === 1 ? '4px' : '0',
                  zIndex: event.column + 1
                }"
              >
                <!-- Event title -->
                <div class="font-medium text-[13px] text-gray-800">{{ event.title }}</div>

                <!-- Event time -->
                <div 
                  v-if="event.startTime" 
                  class="text-[11px] text-gray-500 font-light"
                >
                  {{ event.startTime.replace(':', '.') }}-{{ event.endTime.replace(':', '.') }}
                </div>

                <!-- Event description -->
                <div v-if="event.description" class="text-[11px] mt-0.5 text-gray-500 font-light">
                  {{ event.description }}
                </div>

                <!-- Attendees -->
                <div v-if="event.attendees?.length" class="flex mt-1 gap-1">
                  <div 
                    v-for="attendee in event.attendees"
                    :key="attendee.id"
                    class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[11px] text-gray-600"
                  >
                    {{ attendee.initials }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Current time indicator -->
        <div 
          v-if="weekDates.some(date => isToday(date))"
          class="absolute border-t-2 border-red-400 z-10 right-0"
          :style="{ 
            top: `${((currentTime.hour * 60 + currentTime.minute) / 60) * 64}px`,
            left: currentView === 'day' ? '0' : `${(100 / 7) * weekDates.findIndex(date => isToday(date))}%`,
            width: currentView === 'day' ? '100%' : '14.28%'
          }"
        >
          <div class="bg-red-400 text-white text-xs rounded px-1 py-0.5 absolute -top-3 -left-1">
            {{ currentTime.hour.toString().padStart(2, '0') }}:{{ currentTime.minute.toString().padStart(2, '0') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Month View -->
    <div v-else class="flex-1 overflow-auto">
      <div class="grid grid-cols-7 gap-1 p-4 h-full">
        <div
          v-for="(date, index) in monthDates"
          :key="index"
          :class="[
            'aspect-square p-1 relative border border-gray-100 rounded overflow-hidden',
            !isCurrentMonth(date) ? 'bg-gray-50' : 'bg-white',
            isToday(date) ? 'border-red-400' : ''
          ]"
        >
          <div 
            :class="[
              'text-sm mb-1',
              !isCurrentMonth(date) ? 'text-gray-400' : 'text-gray-600',
              isToday(date) ? 'font-bold text-red-400' : ''
            ]"
          >
            {{ date.getDate() }}
          </div>
          
          <!-- Events for this day -->
          <div class="space-y-0.5">
            <template v-for="event in filterEventsByDate(events, date)" :key="event.id">
              <div
                @click="editEvent(event)"
                class="text-xs py-0.5 px-1 rounded truncate"
                :style="{ backgroundColor: event.color }"
                :title="`${event.title} (${event.startTime}-${event.endTime})`"
                role="button"
                tabindex="0"
                :class="'hover:ring-1 hover:ring-red-400 cursor-pointer'"
              >
                {{ event.title }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Event Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">{{ isEditing ? 'Edit Event' : 'Add New Event' }}</h3>
        <form @submit.prevent="saveEvent" class="space-y-4">
          <div class="flex gap-4 items-end">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700">Title</label>
              <input 
                v-model="newEvent.title"
                type="text"
                required
                class="mt-1 block w-full rounded border border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 p-2"
              >
            </div>
            <div class="w-20">
              <label class="block text-sm font-medium text-gray-700">Color</label>
              <ColorDropdown
                v-model="newEvent.color"
                :colors="predefinedColors"
                class="mt-1"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Date</label>
            <input 
              v-model="newEvent.date"
              type="date"
              required
              class="mt-1 block w-full rounded border border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 p-2"
            >
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Start Time</label>
              <input 
                v-model="newEvent.startTime"
                type="time"
                required
                class="mt-1 block w-full rounded border border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 p-2"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">End Time</label>
              <input 
                v-model="newEvent.endTime"
                type="time"
                required
                class="mt-1 block w-full rounded border border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 p-2"
              >
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              v-model="newEvent.description"
              rows="3"
              class="mt-1 block w-full rounded border border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 p-2"
            ></textarea>
          </div>
          
          <div class="flex justify-end gap-2 sticky bottom-0 bg-white pt-4">
            <button
              type="button"
              @click="showModal = false"
              class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 text-sm text-white bg-red-400 rounded hover:bg-red-500"
            >{{ isEditing ? 'Update Event' : 'Save Event' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>