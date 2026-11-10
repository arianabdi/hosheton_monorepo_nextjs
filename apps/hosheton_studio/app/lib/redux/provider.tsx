// lib/redux/provider.js
'use client';

import { Provider } from 'react-redux';
// import { store } from './store';

export function ReduxProvider({ children }: any) {
    return <div>{children}</div>
    // return <Provider store={''}>{children}</Provider>;
}