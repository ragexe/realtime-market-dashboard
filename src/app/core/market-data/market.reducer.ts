import type { MarketAction } from './market.actions';
import { INITIAL_STATE, type MarketState } from './market.state';

export function marketReducer(state: MarketState, action: MarketAction): MarketState {
  switch (action.type) {
    case 'runStarted':
      return {
        runId: state.runId + 1,
        settings: action.settings ?? INITIAL_STATE.settings,
        status: 'starting',
        error: INITIAL_STATE.error,
        instruments: INITIAL_STATE.instruments,
      };

    case 'snapshot':
      return action.runId === state.runId
        ? {
            ...state,
            runId: action.runId,
            error: INITIAL_STATE.error,
            instruments: action.instruments,
          }
        : state;

    case 'status':
      return action.runId === state.runId
        ? {
            ...state,
            runId: action.runId,
            status: action.status,
          }
        : state;

    case 'error':
      return action.runId === state.runId
        ? {
            ...state,
            runId: action.runId,
            status: 'error',
            error: action.message,
            instruments: INITIAL_STATE.instruments,
          }
        : state;

    case 'workerFailed':
      return {
        ...state,
        status: 'error',
        instruments: INITIAL_STATE.instruments,
        error: action.message,
      };

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unsupported action ${exhaustiveCheck}`);
    }
  }
}
