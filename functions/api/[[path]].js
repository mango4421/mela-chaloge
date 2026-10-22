import '../../server/cloudflare-runtime.js';
import * as stalls from '../../api/stalls.js';
import * as admin from '../../api/admin.js';
import * as funnel from '../../api/funnel.js';
import * as support from '../../api/support.js';
import {cloudflareApi} from '../../server/cloudflare.js';

const routes={'/api/stalls':stalls,'/api/admin':admin,'/api/funnel':funnel,'/api/support':support};
export const onRequest=context=>cloudflareApi(context,routes);
