#!/bin/bash
S=0f61b7085; D=/home/qa-evidence/es-$S; mkdir -p $D; F=$D/summary; : > $F; cd /home/user/NEVORA
[ "$(git rev-parse --short=9 HEAD)" = "$S" ] || { echo "HEAD mismatch" >> $F; exit 9; }
echo "start $(date -u +%T)" >> $F
TESTS=src/test/integration/readiness-ui-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh es-$S-ui > $D/ui.log 2>&1
python3 -c "
import json;d=json.load(open('/home/qa-evidence/es-$S-ui/bt1/ui/report.json'));c=d['checks'];print('ui-prod complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
PROD=0 TESTS=src/test/integration/readiness-shift-concurrency-browser.integration.ts timeout 2400 /home/user/qa-tools/browser.sh es-$S-m > $D/m.log 2>&1
python3 -c "
import json;d=json.load(open('/home/qa-evidence/es-$S-m/bt0/matrix/report.json'));c=d['checks'];print('matrix-dev complete',d['complete'],'chromium',sum(x.startswith('chromium') for x in c),'webkit',sum(x.startswith('webkit') for x in c),'errors',len(d['errors']))" >> $F 2>&1
echo "sweep start $(date -u +%T)" >> $F
/home/user/qa-tools/es.sh sweep-$S >> $F 2>&1
echo "done $(date -u +%T)" >> $F
