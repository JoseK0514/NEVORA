import { expect, it } from 'vitest';
import { generatePdfs } from '../documents';
import { nativeDocumentFixture } from './document-fixtures.test-support';

// Actual pre-V3 bytes captured on 5b606d4089c97c7533a959de96a756459f921620.
const historical = [
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V1-en-E1.pdf",
    "sha256": "9cc3c2b521e8fdfd8774287ef28a04a7c15d19f9b2964aba2643964ff2b00a12",
    "bytes": 8710
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V1-en-company.pdf",
    "sha256": "ac4a347d2d4d8ad0dc29bfce38c5837a63d8faa4358421cfe394f5a7bc10abe5",
    "bytes": 1793
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V1-es-E1.pdf",
    "sha256": "f0a3c7715c338d72a30c6e18ce12a85b38e8948396048c62dddbe12a115310bf",
    "bytes": 8790
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V1-es-company.pdf",
    "sha256": "66e6c4d95dfdaef70359710f897a865235ca415195199d8d2f2ec60032f8a4fe",
    "bytes": 1810
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V2-en-E1.pdf",
    "sha256": "3a7de94d4bf2887db82a0220ea7ca6a9ad36ef04cf0c9ea83c4d9c3d9083535a",
    "bytes": 16979
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V2-en-company.pdf",
    "sha256": "730a8e4cf2f09278b5bc0c41aecb6d103b1d2eafb6419388d15d1f15f78fc3bd",
    "bytes": 12777
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V2-es-E1.pdf",
    "sha256": "45595c9d10ce6c1a0f02956745f80ff38692e6caa5e08ecbc26abfa23c73bce1",
    "bytes": 17042
  },
  {
    "name": "NEVORA_NATIVE_PAYSTUB_PDF_V2-es-company.pdf",
    "sha256": "ac218f25d92ca1e8ab4709404b1ee930349d083073f9db8db3f1cb6aeede2395",
    "bytes": 12790
  }
] as const;

it.each(historical)('preserves approved historical $name bytes and fingerprint', async baseline => {
  const { run, snapshot } = nativeDocumentFixture();
  run.nativeCalculation!.templateVersion = baseline.name.includes('_V1-') ? 'NEVORA_NATIVE_PAYSTUB_PDF_V1' : 'NEVORA_NATIVE_PAYSTUB_PDF_V2';
  snapshot.settings.preferences.language = baseline.name.includes('-en-') ? 'en' : 'es';
  const employeeId = baseline.name.endsWith('-E1.pdf') ? 'E1' : null;
  const document = (await generatePdfs(run, snapshot)).find(d => d.employeeId === employeeId)!;
  expect(document.bytes.length).toBe(baseline.bytes);
  expect(document.sha256).toBe(baseline.sha256);
});
