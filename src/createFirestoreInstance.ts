/* eslint-disable import/no-extraneous-dependencies */
import { reduce } from 'lodash';
import { merge } from 'lodash/fp';
import { Dispatch } from 'redux'
import { firestoreActions } from './actions';
import { mapWithFirebaseAndDispatch } from './utils/actions';
import { defaultConfig, methodsToAddFromFirestore } from './constants';
import { ReduxFirestoreConfig } from './types'

let firestoreInstance: any

/**
 * Create a firebase instance that has helpers attached for dispatching actions
 * @param firebase - Firebase instance which to extend
 * @param configs - Configuration object
 * @param dispatch - Action dispatch function
 * @return Extended Firebase instance
 */
export default function createFirestoreInstance(firebase: any, configs: ReduxFirestoreConfig, dispatch: Dispatch): any {
  // Setup internal variables
  const defaultInternals = {
    // Setup empty listeners object (later used to track listeners)
    listeners: {},
    // Extend default config with provided config
    config: { ...defaultConfig, ...configs }
  };

  // extend existing firebase internals (using redux-firestore along with redux-firebase)
  firebase._ = merge(defaultInternals, firebase._); // eslint-disable-line no-param-reassign

  // Aliases for methods
  const aliases = [
    { action: firestoreActions.deleteRef, name: 'delete' },
    { action: firestoreActions.setListener, name: 'onSnapshot' }
  ];

  // Create methods with internal firebase object and dispatch passed
  const methods = mapWithFirebaseAndDispatch(
    firebase,
    dispatch,
    firestoreActions,
    aliases,
  );

  // Only include specific methods from Firestore since other methods
  // are extended (list in constants)
  const methodsFromFirestore = reduce(
    methodsToAddFromFirestore,
    (acc, methodName) =>
      firebase.firestore &&
      typeof firebase.firestore()[methodName] === 'function'
        ? {
            ...acc,
            [methodName]: firebase
              .firestore()
              [methodName].bind(firebase.firestore())
          }
        : acc,
    {},
  );

  return Object.assign(
    methodsFromFirestore,
    firebase.firestore,
    { _: firebase._ },
    configs.helpersNamespace
      ? // Attach helpers to specified namespace
        { [configs.helpersNamespace]: methods }
      : methods,
  );
}


/**
 * Expose Firestore instance created internally. Useful for
 * integrations into external libraries such as redux-thunk and redux-observable.
 * @returns Firebase Instance
 * @example <caption>redux-thunk integration</caption>
 * import { applyMiddleware, compose, createStore } from 'redux';
 * import thunk from 'redux-thunk';
 * import makeRootReducer from './reducers';
 * import { reduxFirestore, getFirestore } from 'redux-firestore';
 *
 * const fbConfig = {} // your firebase config
 *
 * const store = createStore(
 *   makeRootReducer(),
 *   initialState,
 *   compose(
 *     applyMiddleware([
 *       // Pass getFirestore function as extra argument
 *       thunk.withExtraArgument(getFirestore)
 *     ]),
 *     reduxFirestore(fbConfig)
 *   )
 * );
 * // then later
 * export function addTodo(newTodo) {
 *   return (dispatch, getState, getFirestore) => {
  *    const firebase = getFirestore()
  *    firebase
  *      .add('todos', newTodo)
  *      .then(() => {
  *        dispatch({ type: 'SOME_ACTION' })
  *      })
 *   }
 *  
 * };
 *
 */
export function getFirestore(): any {
  // TODO: Handle recieveing config and creating firebase instance if it doesn't exist
  /* istanbul ignore next: Firebase instance always exists during tests */
  if (!firestoreInstance) {
    throw new Error(
      'Firebase instance does not yet exist. Check your compose function.',
    );
  }
  // TODO: Create new firebase here with config passed in
  return firestoreInstance;
};