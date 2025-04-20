<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <h1 class="text-3xl font-bold mb-6 text-center">Matrix Multiplication</h1>

    <!-- Input Dimensions -->
    <div class="flex flex-wrap gap-4 justify-center mb-6">
      <div>
        <label class="block text-gray-700">Rows of A</label>
        <input type="number" v-model.number="rowsA" min="1" class="mt-1 w-20 border rounded p-2" />
      </div>
      <div>
        <label class="block text-gray-700">Cols of A / Rows of B</label>
        <input type="number" v-model.number="colsA" min="1" class="mt-1 w-20 border rounded p-2" />
      </div>
      <div>
        <label class="block text-gray-700">Cols of B</label>
        <input type="number" v-model.number="colsB" min="1" class="mt-1 w-20 border rounded p-2" />
      </div>
      <button @click="initMatrices" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Initialize</button>
    </div>

    <!-- Matrices Input -->
    <div v-if="initialized" class="space-y-8">
      <div class="flex flex-wrap justify-center gap-8">
        <!-- Matrix A -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-center">Matrix A ({{ rowsA }}×{{ colsA }})</h2>
          <table class="border-collapse">
            <tr v-for="i in rowsA" :key="`a-row-${i}`">
              <td v-for="j in colsA" :key="`a-${i}-${j}`" class="border p-1">
                <input type="number" v-model.number="matrixA[i-1][j-1]" class="w-16 p-1 text-center border rounded" />
              </td>
            </tr>
          </table>
        </div>

        <!-- Matrix B -->
        <div>
          <h2 class="text-xl font-semibold mb-4 text-center">Matrix B ({{ colsA }}×{{ colsB }})</h2>
          <table class="border-collapse">
            <tr v-for="i in colsA" :key="`b-row-${i}`">
              <td v-for="j in colsB" :key="`b-${i}-${j}`" class="border p-1">
                <input type="number" v-model.number="matrixB[i-1][j-1]" class="w-16 p-1 text-center border rounded" />
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Multiply Button -->
      <div class="text-center">
        <button @click="multiplyMatrices" class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Multiply</button>
      </div>

      <!-- Result Matrix -->
      <div v-if="result.length" class="flex justify-center mt-6">
        <div>
          <h2 class="text-xl font-semibold mb-4 text-center">Result ({{ rowsA }}×{{ colsB }})</h2>
          <table class="border-collapse table-auto">
            <tr v-for="i in rowsA" :key="`r-row-${i}`">
              <td v-for="j in colsB" :key="`r-${i}-${j}`" class="border px-3 py-1 text-center w-16">
                {{ result[i-1][j-1] }}
              </td>
            </tr>
          </table>
        </div>
      </div>
      <!-- Steps Toggle -->
      <div v-if="result.length" class="text-center mt-6">
        <button @click="showSteps = !showSteps" class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
          {{ showSteps ? 'Hide Steps' : 'Show Steps' }}
        </button>
      </div>
      <!-- Intermediate Steps -->
      <div v-if="showSteps" class="mt-6 p-4 bg-white border rounded space-y-6">
        <!-- Animate rotation of original B -->
        <div>
          <h3 class="text-lg font-semibold mb-2">Rotate Matrix B to Transpose</h3>
          <div class="flex justify-center mb-4">
            <div class="rotate-container" :class="{ rotated: showSteps }">
              <table class="border-collapse mx-auto">
                <tr v-for="(row, i) in matrixB" :key="`orig-b-row-${i}`">
                  <td v-for="(val, j) in row" :key="`orig-b-${i}-${j}`" class="border px-2 py-1 w-16 text-center">
                    <div class="cell-content">{{ val }}</div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>
        <!-- Transposed B Matrix -->
        <div>
          <h3 class="text-lg font-semibold mb-2">Matrix B Transposed ({{ colsB }}×{{ colsA }})</h3>
          <table class="border-collapse mx-auto">
            <tr v-for="(row, i) in matrixBT" :key="`bt-row-${i}`">
              <td v-for="(val, j) in row" :key="`bt-${i}-${j}`" class="border px-2 py-1 w-16 text-center">
                {{ val }}
              </td>
            </tr>
          </table>
        </div>
        <!-- Computation Expressions -->
        <div>
          <h3 class="text-lg font-semibold mb-2">Computation Details</h3>
          <div v-for="i in rowsA" :key="`expr-row-${i}`" class="mb-4">
            <div class="font-medium">Row {{ i }}:</div>
            <div v-for="j in colsB" :key="`expr-${i}-${j}`" class="text-sm ml-4">
              C[{{ i }},{{ j }}] = {{ expressions[i-1][j-1] }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Dimensions
const rowsA = ref(2)
const colsA = ref(2)
const colsB = ref(2)

// State
const initialized = ref(false)
const matrixA = ref<number[][]>([])
const matrixB = ref<number[][]>([])
const result = ref<number[][]>([])
const showSteps = ref(false)

// Compute B transpose for steps display
const matrixBT = computed(() => {
  if (!initialized.value) return []
  // B has colsA rows and colsB cols
  return Array.from({ length: colsB.value }, (_, i) =>
    Array.from({ length: colsA.value }, (_, j) => matrixB.value[j][i])
  )
})

// Compute expression for each result cell
const expressions = computed(() => {
  const exprs: string[][] = []
  for (let i = 0; i < rowsA.value; i++) {
    const rowExpr: string[] = []
    for (let j = 0; j < colsB.value; j++) {
      const terms: string[] = []
      for (let k = 0; k < colsA.value; k++) {
        terms.push(`${matrixA.value[i][k]}×${matrixB.value[k][j]}`)
      }
      rowExpr.push(terms.join(' + '))
    }
    exprs.push(rowExpr)
  }
  return exprs
})

// Initialize matrices
function initMatrices() {
  initialized.value = true
  matrixA.value = Array.from({ length: rowsA.value }, () => Array(colsA.value).fill(0))
  matrixB.value = Array.from({ length: colsA.value }, () => Array(colsB.value).fill(0))
  result.value = []
}

// Multiply matrices
function multiplyMatrices() {
  const res: number[][] = Array.from({ length: rowsA.value }, () => Array(colsB.value).fill(0))
  for (let i = 0; i < rowsA.value; i++) {
    for (let j = 0; j < colsB.value; j++) {
      let sum = 0
      for (let k = 0; k < colsA.value; k++) {
        sum += matrixA.value[i][k] * matrixB.value[k][j]
      }
      res[i][j] = sum
    }
  }
  result.value = res
}
</script>

<style scoped>
/* Add any additional styling here */

/* Rotation animation styles */
.rotate-container {
  display: inline-block;
  transform-origin: center center;
  perspective: 800px;
}
.rotate-container table {
  transform-style: preserve-3d;
  backface-visibility: hidden;
}
.rotate-container.rotated {
  animation: rotate3d 0.8s ease-in-out forwards;
}
@keyframes rotate3d {
  0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
  40% { transform: rotateX(30deg) rotateY(0deg) rotateZ(45deg); }
  100% { transform: rotateX(0deg) rotateY(0deg) rotateZ(90deg); }
}
.cell-content {
  display: inline-block;
  transform: rotate(-90deg);
}
</style> 