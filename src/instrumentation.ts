import type {Instrumentation} from 'next';
import {reportServerError} from './lib/server-error';

/** Framework routePath is a source template. request.path/headers may hold secrets. */
export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  reportServerError(error, {route: context.routePath});
};
