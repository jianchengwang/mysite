<template>
  <div class="min-h-screen bg-[#fcfcfc] font-hand p-4 md:p-8">
    <div class="max-w-5xl mx-auto mb-10">
      <h1 class="text-4xl font-bold text-zinc-900 mb-2 font-hand">Modbus Helper</h1>
      <p class="text-zinc-600 italic">Generate read commands and parse HEX frames with ease</p>
    </div>

    <div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
      <!-- Read Command Generator -->
      <div class="sketch-card p-6 bg-white space-y-6 flex flex-col">
        <h2 class="text-2xl font-bold mb-4 border-b-2 border-zinc-100 pb-2">Read Command Generator</h2>
        <div class="grid grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="block text-sm font-bold text-zinc-700">Device Address (HEX)</label>
            <input v-model="readAddrHex" type="text" placeholder="01" class="w-full bg-white text-zinc-900 sketch-border px-3 py-2 outline-none focus:sketch-shadow-sm font-mono uppercase" />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-bold text-zinc-700">Function Code (HEX)</label>
            <input v-model="readFuncHex" type="text" placeholder="03" class="w-full bg-white text-zinc-900 sketch-border px-3 py-2 outline-none focus:sketch-shadow-sm font-mono uppercase" />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-bold text-zinc-700">Start Address (HEX)</label>
            <input v-model="readRegHex" type="text" placeholder="0000" class="w-full bg-white text-zinc-900 sketch-border px-3 py-2 outline-none focus:sketch-shadow-sm font-mono uppercase" />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-bold text-zinc-700">Quantity (DEC)</label>
            <input v-model="readNum" type="number" min="1" max="125" class="w-full bg-white text-zinc-900 sketch-border px-3 py-2 outline-none focus:sketch-shadow-sm font-hand" />
          </div>
        </div>
        <div class="flex-1 flex flex-col justify-end pt-4 gap-4">
          <button @click="generateReadCmd" class="sketch-button bg-zinc-900 text-white py-3">Generate Command</button>
          <div v-if="readCmd" class="p-4 bg-zinc-50 sketch-border font-mono text-center text-lg break-all select-all cursor-pointer" title="Click to select all">
            {{ readCmd }}
          </div>
        </div>
      </div>

      <!-- Protocol Parser -->
      <div class="sketch-card p-6 bg-white space-y-6">
        <h2 class="text-2xl font-bold mb-4 border-b-2 border-zinc-100 pb-2">HEX Frame Parser</h2>
        <div class="space-y-2">
          <label class="block text-sm font-bold text-zinc-700">Input HEX Frame</label>
          <textarea 
            v-model="hexInput" 
            rows="3" 
            placeholder="e.g. 01 03 04 00 01 00 02 79 84" 
            class="w-full sketch-border bg-white text-zinc-900 px-3 py-2 outline-none focus:sketch-shadow-sm font-mono text-sm resize-none"
          ></textarea>
        </div>

        <div v-if="frameInfo.valid" class="space-y-4">
          <div class="grid grid-cols-3 gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <div>Addr: <span class="text-zinc-900 font-mono">{{ frameInfo.addr }}</span></div>
            <div>Bytes: <span class="text-zinc-900 font-mono">{{ frameInfo.byteCount }}</span></div>
            <div>CRC: <span class="text-zinc-900 font-mono" :class="frameInfo.crcValid ? 'text-green-600' : 'text-red-600'">{{ frameInfo.crc }}</span></div>
          </div>
          
          <div class="space-y-2">
            <label class="block text-xs font-bold text-zinc-400 uppercase">Registers (2 bytes each, click to select)</label>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="(reg, idx) in frameInfo.regs" 
                :key="idx"
                @click="toggleReg(idx)"
                :class="[
                  'px-3 py-1 sketch-border cursor-pointer transition-all text-sm font-mono',
                  selectedRegs.includes(idx) ? 'bg-zinc-900 text-white -translate-y-0.5' : 'bg-white hover:bg-zinc-50'
                ]"
              >
                <span class="text-[10px] opacity-50 mr-2">{{ idx }}</span>
                {{ reg }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 pt-2">
            <div class="space-y-1">
              <label class="block text-xs font-bold text-zinc-400 uppercase">Byte Order</label>
              <select v-model="byteOrder" class="w-full sketch-border px-2 py-1 text-xs bg-white font-hand">
                <option value="1234">Big Endian (1234)</option>
                <option value="4321">Little Endian (4321)</option>
                <option value="2143">Mid-Big Endian (2143)</option>
                <option value="3412">Mid-Little Endian (3412)</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-xs font-bold text-zinc-400 uppercase">Data Type</label>
              <select v-model="dataType" class="w-full sketch-border px-2 py-1 text-xs bg-white font-hand">
                <option value="int16">Int16</option>
                <option value="uint16">Uint16</option>
                <option value="int32">Int32</option>
                <option value="uint32">Uint32</option>
                <option value="float32">Float32</option>
              </select>
            </div>
          </div>

          <div v-if="parsedResult !== null" class="mt-4 p-4 bg-zinc-900 text-white sketch-card text-center">
            <div class="text-xs opacity-50 uppercase tracking-widest mb-1">Parsed Value</div>
            <div class="text-3xl font-mono">{{ parsedResult }}</div>
          </div>
        </div>
        <div v-else-if="hexInput.trim()" class="text-red-500 text-xs italic">
          Invalid Modbus RTU response frame (too short or bad format)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'default' })

// Read Generator State
const readAddrHex = ref('01')
const readFuncHex = ref('03')
const readRegHex = ref('0000')
const readNum = ref(1)
const readCmd = ref('')

// Parser State
const hexInput = ref('')
const selectedRegs = ref<number[]>([])
const byteOrder = ref('1234')
const dataType = ref('int32')

function calcCRC16(bytes: number[]) {
  let crc = 0xFFFF
  for (let b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) {
      if (crc & 1) crc = (crc >> 1) ^ 0xA001
      else crc >>= 1
    }
  }
  return crc
}

function generateReadCmd() {
  const addr = parseInt(readAddrHex.value, 16) || 0
  const func = parseInt(readFuncHex.value, 16) || 0
  const reg = parseInt(readRegHex.value, 16) || 0
  const num = readNum.value || 0
  
  const bytes = [
    addr & 0xFF,
    func & 0xFF,
    (reg >> 8) & 0xFF,
    reg & 0xFF,
    (num >> 8) & 0xFF,
    num & 0xFF
  ]
  
  const crc = calcCRC16(bytes)
  bytes.push(crc & 0xFF, (crc >> 8) & 0xFF)
  
  readCmd.value = bytes.map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

const frameInfo = computed(() => {
  const cleanHex = hexInput.value.replace(/[^0-9a-fA-F]/g, '')
  if (cleanHex.length < 10) return { valid: false }
  
  const bytes = []
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16))
  }
  
  const addr = bytes[0].toString(16).padStart(2, '0').toUpperCase()
  const func = bytes[1].toString(16).padStart(2, '0').toUpperCase()
  const byteCount = bytes[2]
  
  if (bytes.length < 3 + byteCount + 2) return { valid: false }
  
  const dataBytes = bytes.slice(3, 3 + byteCount)
  const regs: string[] = []
  for (let i = 0; i < dataBytes.length; i += 2) {
    if (i + 1 < dataBytes.length) {
      regs.push(dataBytes[i].toString(16).padStart(2, '0').toUpperCase() + dataBytes[i+1].toString(16).padStart(2, '0').toUpperCase())
    }
  }
  
  const receivedCrc = (bytes[bytes.length - 1] << 8) | bytes[bytes.length - 2]
  const calculatedCrc = calcCRC16(bytes.slice(0, bytes.length - 2))
  
  return {
    valid: true,
    addr,
    func,
    byteCount,
    regs,
    crc: receivedCrc.toString(16).padStart(4, '0').toUpperCase(),
    crcValid: receivedCrc === calculatedCrc,
    rawBytes: dataBytes
  }
})

function toggleReg(idx: number) {
  const index = selectedRegs.value.indexOf(idx)
  if (index > -1) {
    selectedRegs.value.splice(index, 1)
  } else {
    // Limit selection based on data type length
    const maxRegs = { int16: 1, uint16: 1, int32: 2, uint32: 2, float32: 2 }[dataType.value as any] || 4
    if (selectedRegs.value.length >= maxRegs) {
      selectedRegs.value = [idx]
    } else {
      selectedRegs.value.push(idx)
      selectedRegs.value.sort((a, b) => a - b)
    }
  }
}

const parsedResult = computed(() => {
  if (selectedRegs.value.length === 0 || !frameInfo.value.valid) return null
  
  let bytes: number[] = []
  selectedRegs.value.forEach(idx => {
    const regHex = frameInfo.value.regs?.[idx]
    if (regHex) {
      bytes.push(parseInt(regHex.substr(0, 2), 16))
      bytes.push(parseInt(regHex.substr(2, 2), 16))
    }
  })
  
  const len = bytes.length
  if (len === 0) return null

  // Byte Order Handling
  let ordered = [...bytes]
  if (byteOrder.value === '4321') ordered.reverse()
  else if (byteOrder.value === '2143') {
    for (let i = 0; i < len; i += 2) [ordered[i], ordered[i+1]] = [ordered[i+1], ordered[i]]
  } else if (byteOrder.value === '3412') {
    if (len === 4) ordered = [ordered[2], ordered[3], ordered[0], ordered[1]]
  }

  const buf = new ArrayBuffer(len)
  const view = new DataView(buf)
  ordered.forEach((b, i) => view.setUint8(i, b))

  try {
    if (dataType.value === 'int16' && len >= 2) return view.getInt16(0)
    if (dataType.value === 'uint16' && len >= 2) return view.getUint16(0)
    if (dataType.value === 'int32' && len >= 4) return view.getInt32(0)
    if (dataType.value === 'uint32' && len >= 4) return view.getUint32(0)
    if (dataType.value === 'float32' && len >= 4) return view.getFloat32(0).toFixed(4)
  } catch (e) {
    return 'Error'
  }
  return null
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Indie+Flower&display=swap');

.font-hand {
  font-family: 'Patrick Hand', cursive;
}

h1, h2 {
  font-family: 'Indie Flower', cursive;
}
</style>
