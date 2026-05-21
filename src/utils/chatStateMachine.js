export const CHAT_VIEW_STATE = Object.freeze({
  INITIALIZING: 'initializing',
  WELCOME: 'welcome',
  LOADING_CONVERSATION: 'loadingConversation',
  CONVERSATION_ERROR: 'conversationError',
  READY: 'ready',
})

export const CHAT_RUN_STATE = Object.freeze({
  IDLE: 'idle',
  CREATING_CONVERSATION: 'creatingConversation',
  STREAMING: 'streaming',
})

export function isConversationLoadingState(state) {
  return state === CHAT_VIEW_STATE.LOADING_CONVERSATION
}

export function isConversationErrorState(state) {
  return state === CHAT_VIEW_STATE.CONVERSATION_ERROR
}

export function isWelcomeState(state) {
  return state === CHAT_VIEW_STATE.WELCOME
}

export function isChatRunBusyState(state) {
  return state === CHAT_RUN_STATE.CREATING_CONVERSATION || state === CHAT_RUN_STATE.STREAMING
}
