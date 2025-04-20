<template>
  <div class="max-w-3xl mx-auto px-4 py-12 space-y-10">
    <!-- Modbus 读命令生成器 -->
    <div class="bg-white rounded-lg shadow border p-6 space-y-6">
      <h2 class="text-xl font-bold mb-2">Modbus 读命令生成器</h2>
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="block text-xs font-medium mb-1">设备地址</label>
          <input v-model="readAddr" type="number" min="0" max="255" class="w-full border rounded px-2 py-1" />
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium mb-1">功能码</label>
          <input v-model="readFunc" type="number" min="0" max="255" class="w-full border rounded px-2 py-1" />
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium mb-1">寄存器地址</label>
          <input v-model="readReg" type="number" min="0" max="65535" class="w-full border rounded px-2 py-1" />
        </div>
        <div class="flex-1">
          <label class="block text-xs font-medium mb-1">数量</label>
          <input v-model="readNum" type="number" min="1" max="125" class="w-full border rounded px-2 py-1" />
        </div>
      </div>
      <div class="flex gap-2">
        <button @click="fillCRC" class="btn-gray">自动填充CRC</button>
        <input v-model="readCmd" type="text" class="flex-1 border rounded px-2 py-1 font-mono" readonly />
      </div>
    </div>

    <!-- Modbus 协议解析工具（完整帧分区） -->
    <div class="bg-white rounded-lg shadow border p-6 space-y-6 flex flex-col md:flex-row gap-8">
      <div class="flex-1 min-w-[260px]">
        <h2 class="text-xl font-bold mb-2">Modbus 协议解析</h2>
        <label class="block text-sm font-medium mb-1">十六进制帧数据</label>
        <textarea v-model="hexInput" rows="4" placeholder="如 01 03 04 00 01 00 02 79 84" class="w-full border rounded px-3 py-2 text-base mb-4 resize-vertical" />
        <div v-if="frameInfo.valid" class="space-y-2">
          <div class="flex flex-wrap gap-4 text-sm text-zinc-600">
            <div>地址: <span class="font-mono text-zinc-900">{{ frameInfo.addr }}</span></div>
            <div>功能码: <span class="font-mono text-zinc-900">{{ frameInfo.func }}</span></div>
            <div>字节数: <span class="font-mono text-zinc-900">{{ frameInfo.byteCount }}</span></div>
            <div>CRC: <span class="font-mono text-zinc-900">{{ frameInfo.crc }}</span></div>
          </div>
          <div class="text-xs text-zinc-500 mb-1">数据区寄存器（2字节/组，点击多选）：</div>
          <div class="flex flex-wrap gap-2">
            <div v-for="(reg, idx) in frameInfo.regs" :key="idx"
              :class="['reg-box', selectedRegs.includes(idx) ? 'reg-box-selected' : '']"
              @click="toggleReg(idx)">
              <span class="text-xs text-zinc-400">{{ idx }}</span>
              <span class="ml-1 font-mono">{{ reg.join(' ') }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="hexInput.trim()" class="text-red-500 text-xs mt-2">帧格式不正确或数据不足</div>
      </div>
      <div class="flex-1 min-w-[220px] border-l md:pl-8 md:border-l md:border-zinc-100 pt-4 md:pt-0">
        <div class="mb-2 text-sm text-zinc-500">待解析字节（可手动编辑）：</div>
        <input v-model="manualHex" @input="onManualInput" class="mb-2 font-mono text-base bg-zinc-50 border rounded px-3 py-2 min-h-[2.2em] w-full" placeholder="如 00 00 03 45" />
        <div class="flex gap-4 mb-4">
          <div class="flex-1">
            <label class="block text-sm font-medium mb-1">
              字节序
              <span class="help-icon" title="大端(1234)：高字节在前，低字节在后，如 0x12345678 存储为 12 34 56 78；小端(4321)：低字节在前，高字节在后，存储为 78 56 34 12。2143/3412为特殊排列。">?</span>
            </label>
            <select v-model="byteOrder" class="w-full border rounded px-2 py-1">
              <option value="1234">1234 (大端)</option>
              <option value="2143">2143 (特殊)</option>
              <option value="3412">3412 (特殊)</option>
              <option value="4321">4321 (小端)</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium mb-1">
              数据类型
              <span class="help-icon" title="int16/int32/int64：有符号整数，float32/float64：IEEE754标准浮点数，常用于Modbus寄存器解析。">?</span>
            </label>
            <select v-model="dataType" class="w-full border rounded px-2 py-1">
              <option value="int16">int16</option>
              <option value="int32">int32</option>
              <option value="int64">int64</option>
              <option value="float32">float32</option>
              <option value="float64">float64</option>
            </select>
          </div>
        </div>
        <button @click="parseSelected" class="btn-gray">解析</button>
        <div v-if="result !== null" class="bg-zinc-50 border rounded p-4 mt-2">
          <div class="text-sm text-zinc-500 mb-1">解析结果：</div>
          <div class="text-lg font-mono text-zinc-800">{{ result }}</div>
        </div>
        <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
// 读命令生成器
const readAddr = ref(1)
const readFunc = ref(3)
const readReg = ref(0)
const readNum = ref(1)
const readCmd = ref('')
function fillCRC() {
  const arr = [readAddr.value, readFunc.value, readReg.value >> 8, readReg.value & 0xFF, readNum.value >> 8, readNum.value & 0xFF]
  const crc = calcCRC16(arr)
  arr.push(crc & 0xFF, crc >> 8)
  readCmd.value = arr.map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}
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
// 协议解析
const hexInput = ref('')
const byteOrder = ref('1234')
const dataType = ref('int32')
const result = ref<null | number>(null)
const error = ref('')
const selectedRegs = ref<number[]>([])
const manualHex = ref('')
const manualEdited = ref(false)
const frameInfo = computed(() => {
  let hex = hexInput.value.replace(/[^0-9a-fA-F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!hex) return { valid: false }
  const bytes = hex.split(' ').map(x => parseInt(x, 16)).filter(x => !isNaN(x))
  if (bytes.length < 5) return { valid: false }
  const addr = bytes[0]?.toString(16).padStart(2, '0').toUpperCase() ?? '--'
  const func = bytes[1]?.toString(16).padStart(2, '0').toUpperCase() ?? '--'
  const byteCount = bytes[2] ?? 0
  if (bytes.length < 3 + byteCount + 2) return { valid: false }
  const dataStart = 3
  const dataEnd = 3 + byteCount
  const dataBytes = bytes.slice(dataStart, dataEnd)
  const regs = []
  for (let i = 0; i < dataBytes.length; i += 2) {
    regs.push([
      dataBytes[i]?.toString(16).padStart(2, '0').toUpperCase() ?? '--',
      dataBytes[i+1]?.toString(16).padStart(2, '0').toUpperCase() ?? '--'
    ])
  }
  const crc = bytes.slice(-2).map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  return {
    valid: true,
    addr,
    func,
    byteCount,
    regs,
    crc
  }
})
function toggleReg(idx: number) {
  if (selectedRegs.value.includes(idx)) {
    selectedRegs.value = selectedRegs.value.filter(i => i !== idx)
  } else {
    selectedRegs.value.push(idx)
  }
  manualHex.value = selectedRegs.value.map(i => frameInfo.value.regs?.[i]).flat().join(' ')
  manualEdited.value = false
}
const selectedHex = computed(() => {
  if (manualHex.value.trim()) return manualHex.value.trim()
  if (!frameInfo.value.valid) return ''
  return selectedRegs.value.map(i => frameInfo.value.regs?.[i]).flat().join(' ')
})
// 监听寄存器选择，若未手动编辑则自动填充输入框
watch(selectedRegs, () => {
  if (!manualEdited.value) {
    manualHex.value = selectedRegs.value.map(i => frameInfo.value.regs?.[i]).flat().join(' ')
  }
})
// 监听输入框手动编辑
function onManualInput() {
  manualEdited.value = true
}
function parseSelected() {
  error.value = ''
  result.value = null
  const hex = selectedHex.value.replace(/[^0-9a-fA-F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!hex) {
    error.value = '请选择要解析的寄存器'; return
  }
  const bytes = hex.split(' ').map(x => parseInt(x, 16))
  if (bytes.some(isNaN)) {
    error.value = '包含无效的十六进制字节'; return
  }
  const typeBytes = { int16: 2, int32: 4, int64: 8, float32: 4, float64: 8 }
  const len = typeBytes[dataType.value as keyof typeof typeBytes]
  if (bytes.length !== len) {
    error.value = `所选寄存器字节数需为${len}，当前为${bytes.length}`; return
  }
  let seg = bytes.slice(0, len)
  // 字节序处理
  if (byteOrder.value === '2143') {
    if (len === 2) seg = [seg[1], seg[0]]
    if (len === 4) seg = [seg[1], seg[0], seg[3], seg[2]]
    if (len === 8) seg = [seg[1], seg[0], seg[3], seg[2], seg[5], seg[4], seg[7], seg[6]]
  }
  if (byteOrder.value === '3412') {
    if (len === 2) seg = [seg[1], seg[0]]
    if (len === 4) seg = [seg[2], seg[3], seg[0], seg[1]]
    if (len === 8) seg = [seg[2], seg[3], seg[0], seg[1], seg[6], seg[7], seg[4], seg[5]]
  }
  const buf = new ArrayBuffer(len)
  const view = new DataView(buf)
  seg.forEach((b, i) => view.setUint8(i, b))
  const littleEndian = byteOrder.value === '4321'
  try {
    switch (dataType.value) {
      case 'int16': result.value = view.getInt16(0, littleEndian); break
      case 'int32': result.value = view.getInt32(0, littleEndian); break
      case 'int64': {
        const hi = view.getUint32(0, littleEndian)
        const lo = view.getUint32(4, littleEndian)
        result.value = Number(BigInt(hi) << 32n | BigInt(lo))
        break
      }
      case 'float32': result.value = view.getFloat32(0, littleEndian); break
      case 'float64': result.value = view.getFloat64(0, littleEndian); break
    }
  } catch (e) {
    error.value = '解析失败：' + (e as Error).message
  }
}
</script>

<style scoped>
input, select, textarea {
  outline: none;
}
textarea {
  min-height: 70px;
  resize: vertical;
}
.btn-gray {
  background: #f4f4f5;
  color: #222;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.5em 1.5em;
  font-weight: 500;
  transition: background 0.18s, color 0.18s, border 0.18s;
  cursor: pointer;
}
.btn-gray:hover {
  background: #e5e7eb;
  color: #111;
  border-color: #d1d5db;
}
.help-icon {
  display: inline-block;
  margin-left: 4px;
  width: 1.1em;
  height: 1.1em;
  line-height: 1.1em;
  text-align: center;
  border-radius: 50%;
  background: #f4f4f5;
  color: #888;
  font-size: 0.95em;
  font-weight: bold;
  cursor: help;
  border: 1px solid #e5e7eb;
  transition: background 0.18s, color 0.18s;
}
.help-icon:hover {
  background: #e5e7eb;
  color: #222;
}
.reg-box {
  display: inline-block;
  min-width: 60px;
  padding: 0.3em 0.7em;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f8fafc;
  color: #333;
  cursor: pointer;
  user-select: none;
  transition: background 0.18s, border 0.18s, color 0.18s;
}
.reg-box-selected {
  background: #e5e7eb;
  border-color: #bdbdbd;
  color: #111;
}
</style>
