import 'server-only';
import {neonNotificationExecutor} from '../../data/sql-executor';
import {readPinKey} from '../pin-crypto.server';
import {createCurrentClockerPhotoAuthority} from '../photo-server/authority.server';
import {readPhotoPlatformBinding} from '../photo-server/platform-lifecycle';
import {getClockerPhotoSettingsRuntime} from '../photo-server/runtime.server';
import {ClockerFaceVerification} from './service.server';
import {readFaceKey} from './crypto.server';

export async function getClockerFaceRuntime() {
  const scope = readPhotoPlatformBinding(process.env);
  const key = readFaceKey();
  if (!scope || !key) return null;
  const pinKey = readPinKey();
  const photo = await getClockerPhotoSettingsRuntime();
  return {
    service: new ClockerFaceVerification(neonNotificationExecutor(), createCurrentClockerPhotoAuthority(pinKey), scope, key),
    photo,
  };
}
