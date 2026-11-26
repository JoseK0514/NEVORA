#!/bin/bash
B="NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1"
/home/user/qa-tools/scan6.sh wk-names webkit "NEVORA_SCAN_CLOCKER_FLOW=names $B"
/home/user/qa-tools/scan6.sh wk-names-es webkit "NEVORA_SCAN_CLOCKER_FLOW=names NEVORA_SCAN_CLOCKER_LOCALE=es $B"
/home/user/qa-tools/scan6.sh wk-motion webkit "NEVORA_SCAN_CLOCKER_FLOW=motion $B"
/home/user/qa-tools/scan6.sh wk-cls webkit "NEVORA_SCAN_CLOCKER_FLOW=cls $B"
/home/user/qa-tools/scan6.sh cr-names chromium "NEVORA_SCAN_CLOCKER_FLOW=names $B"
/home/user/qa-tools/scan6.sh cr-cls chromium "NEVORA_SCAN_CLOCKER_FLOW=cls $B"
echo ALLDONE
