export const state = () => ({
  siedeBar: false
})

export const getters = {
  siedeBar: state => {
    return state.siedeBar
  }
}

export const mutations = {
  updateSideBar: (state, sideBar) => {
    state.sideBar = sideBar
  }
}

export const actions = {
  updateActionValue({ commit }) {
    commit('updateValue', payload)
  }
}
